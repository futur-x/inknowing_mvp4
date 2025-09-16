"""
WeChat Pay payment gateway implementation
"""
import json
import time
import hashlib
import uuid
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import logging
import httpx

from .base import (
    PaymentGateway,
    PaymentResult,
    SubscriptionResult,
    RefundResult
)
from models.payment import PaymentStatus

logger = logging.getLogger(__name__)


class WeChatPayGateway(PaymentGateway):
    """WeChat Pay payment gateway implementation"""

    def __init__(self):
        self.app_id = None
        self.mch_id = None
        self.api_key = None
        self.api_v3_key = None
        self.cert_serial = None
        self.private_key = None
        self.wechat_cert = None
        self.notify_url = None
        self.api_base_url = "https://api.mch.weixin.qq.com"
        self.sandbox_mode = False

    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize WeChat Pay with configuration"""
        self.app_id = config.get("app_id")
        self.mch_id = config.get("mch_id")
        self.api_key = config.get("api_key")
        self.api_v3_key = config.get("api_v3_key")
        self.cert_serial = config.get("cert_serial")
        self.private_key = config.get("private_key")
        self.wechat_cert = config.get("wechat_cert")
        self.notify_url = config.get("notify_url")
        self.sandbox_mode = config.get("sandbox", False)
        logger.info(f"WeChat Pay gateway initialized (sandbox: {self.sandbox_mode})")

    def _generate_nonce_str(self) -> str:
        """Generate random nonce string"""
        return uuid.uuid4().hex

    def _sign_md5(self, params: Dict[str, Any]) -> str:
        """Generate MD5 signature for WeChat Pay V2 API"""
        # Sort parameters and create sign string
        sorted_params = sorted(params.items())
        sign_string = "&".join([f"{k}={v}" for k, v in sorted_params if v and k != "sign"])
        sign_string += f"&key={self.api_key}"

        # MD5 hash
        return hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()

    def _dict_to_xml(self, params: Dict[str, Any]) -> str:
        """Convert dictionary to XML format for WeChat Pay"""
        xml_str = "<xml>"
        for key, value in params.items():
            if value is not None:
                xml_str += f"<{key}><![CDATA[{value}]]></{key}>"
        xml_str += "</xml>"
        return xml_str

    def _xml_to_dict(self, xml_str: str) -> Dict[str, Any]:
        """Convert XML to dictionary"""
        root = ET.fromstring(xml_str)
        result = {}
        for child in root:
            result[child.tag] = child.text
        return result

    async def _request_v2(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to WeChat Pay V2 API"""
        # Add common parameters
        params["appid"] = self.app_id
        params["mch_id"] = self.mch_id
        params["nonce_str"] = self._generate_nonce_str()

        # Add signature
        params["sign"] = self._sign_md5(params)

        # Convert to XML
        xml_data = self._dict_to_xml(params)

        # Make request
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}{url}",
                content=xml_data,
                headers={"Content-Type": "text/xml"}
            )
            result = self._xml_to_dict(response.text)

        # Check response
        if result.get("return_code") != "SUCCESS":
            raise Exception(result.get("return_msg", "Unknown error"))

        if result.get("result_code") != "SUCCESS":
            raise Exception(result.get("err_code_des", "Unknown error"))

        return result

    async def _request_v3(self, method: str, url: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make request to WeChat Pay V3 API"""
        # V3 API requires more complex signature with certificates
        # This is a simplified version
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(f"{self.api_base_url}{url}", headers=headers)
            elif method == "POST":
                response = await client.post(
                    f"{self.api_base_url}{url}",
                    json=data,
                    headers=headers
                )
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            if response.status_code >= 400:
                error = response.json()
                raise Exception(error.get("message", "Unknown error"))

            return response.json()

    async def create_payment(
        self,
        amount: int,
        currency: str,
        description: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentResult:
        """Create a payment with WeChat Pay"""
        try:
            # Generate unique order ID
            out_trade_no = f"{self.mch_id}{datetime.now().strftime('%Y%m%d%H%M%S')}{int(time.time() * 1000) % 1000000:06d}"[:32]

            # Prepare parameters for unified order API
            params = {
                "body": description[:128],
                "out_trade_no": out_trade_no,
                "total_fee": amount,  # Amount in cents/分
                "spbill_create_ip": metadata.get("ip_address", "127.0.0.1") if metadata else "127.0.0.1",
                "notify_url": self.notify_url,
                "trade_type": "NATIVE",  # QR code payment
                "product_id": metadata.get("product_id", "default") if metadata else "default"
            }

            if metadata:
                params["attach"] = json.dumps(metadata)[:127]

            # Call unified order API
            response = await self._request_v2("/pay/unifiedorder", params)

            return PaymentResult(
                success=True,
                gateway_payment_id=out_trade_no,
                status=PaymentStatus.PENDING,
                amount=amount,
                currency="CNY",
                raw_response=response
            )
        except Exception as e:
            logger.error(f"WeChat Pay payment creation failed: {e}")
            return PaymentResult(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )

    async def confirm_payment(
        self,
        gateway_payment_id: str,
        payment_method_id: Optional[str] = None
    ) -> PaymentResult:
        """Query payment status from WeChat Pay"""
        try:
            params = {
                "out_trade_no": gateway_payment_id
            }

            response = await self._request_v2("/pay/orderquery", params)

            # Map WeChat Pay trade state to our status
            trade_state = response.get("trade_state")
            status = PaymentStatus.PENDING

            if trade_state == "SUCCESS":
                status = PaymentStatus.SUCCESS
            elif trade_state in ["CLOSED", "PAYERROR"]:
                status = PaymentStatus.FAILED
            elif trade_state in ["NOTPAY", "USERPAYING"]:
                status = PaymentStatus.PENDING
            elif trade_state == "REFUND":
                status = PaymentStatus.REFUNDED

            return PaymentResult(
                success=status == PaymentStatus.SUCCESS,
                gateway_payment_id=response.get("transaction_id"),
                status=status,
                amount=int(response.get("total_fee", 0)),
                currency="CNY",
                raw_response=response,
                paid_at=datetime.strptime(response.get("time_end"), "%Y%m%d%H%M%S") if response.get("time_end") else None
            )
        except Exception as e:
            logger.error(f"WeChat Pay payment query failed: {e}")
            return PaymentResult(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )

    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RefundResult:
        """Create a refund with WeChat Pay"""
        try:
            # Generate unique refund ID
            out_refund_no = f"refund_{int(time.time() * 1000)}"[:64]

            # Get original payment details first
            payment_result = await self.confirm_payment(payment_id)
            total_fee = payment_result.amount

            params = {
                "out_trade_no": payment_id,
                "out_refund_no": out_refund_no,
                "total_fee": total_fee,
                "refund_fee": amount or total_fee,
                "refund_desc": reason or "User requested refund"
            }

            response = await self._request_v2("/secapi/pay/refund", params)

            return RefundResult(
                success=True,
                gateway_refund_id=response.get("refund_id"),
                refunded_amount=int(response.get("refund_fee", 0)),
                status="success",
                raw_response=response
            )
        except Exception as e:
            logger.error(f"WeChat Pay refund creation failed: {e}")
            return RefundResult(
                success=False,
                error_message=str(e)
            )

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        payment_method_id: Optional[str] = None,
        trial_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SubscriptionResult:
        """WeChat Pay doesn't have native subscription support"""
        # Note: Would need to implement contract payment API
        return SubscriptionResult(
            success=False,
            error_message="WeChat Pay subscriptions require contract payment API setup"
        )

    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False
    ) -> SubscriptionResult:
        """Cancel subscription"""
        return SubscriptionResult(
            success=False,
            error_message="WeChat Pay subscriptions require contract payment API setup"
        )

    async def update_subscription(
        self,
        subscription_id: str,
        price_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SubscriptionResult:
        """Update subscription"""
        return SubscriptionResult(
            success=False,
            error_message="WeChat Pay subscriptions require contract payment API setup"
        )

    async def create_customer(
        self,
        user_id: UUID,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """WeChat Pay doesn't have customer concept"""
        # Return user_id as customer identifier
        return str(user_id)

    async def add_payment_method(
        self,
        customer_id: str,
        payment_method_token: str,
        set_as_default: bool = False
    ) -> str:
        """WeChat Pay doesn't store payment methods"""
        # Return a placeholder ID
        return f"wechat_{customer_id}"

    async def remove_payment_method(
        self,
        payment_method_id: str
    ) -> bool:
        """Remove payment method"""
        # Always return True as WeChat Pay doesn't store payment methods
        return True

    async def get_payment_status(
        self,
        gateway_payment_id: str
    ) -> PaymentResult:
        """Get payment status"""
        return await self.confirm_payment(gateway_payment_id)

    async def get_subscription_status(
        self,
        subscription_id: str
    ) -> SubscriptionResult:
        """Get subscription status"""
        return SubscriptionResult(
            success=False,
            error_message="WeChat Pay subscriptions require contract payment API setup"
        )

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> bool:
        """Verify WeChat Pay notification signature"""
        try:
            # Parse XML payload
            params = self._xml_to_dict(payload.decode('utf-8'))

            # Verify signature
            sign = params.pop("sign", None)
            calculated_sign = self._sign_md5(params)

            return sign == calculated_sign
        except Exception as e:
            logger.error(f"WeChat Pay webhook verification failed: {e}")
            return False

    async def process_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process WeChat Pay notification"""
        result_code = event_data.get("result_code")

        result = {
            "event_type": "wechat_notification",
            "processed": True,
            "transaction_id": event_data.get("transaction_id"),
            "out_trade_no": event_data.get("out_trade_no"),
            "openid": event_data.get("openid")
        }

        if result_code == "SUCCESS":
            result["status"] = "succeeded"
            result["amount"] = int(event_data.get("total_fee", 0))
            result["time_end"] = event_data.get("time_end")
        else:
            result["status"] = "failed"
            result["error"] = event_data.get("err_code_des")

        return result

    async def generate_client_token(
        self,
        customer_id: Optional[str] = None
    ) -> str:
        """Generate prepay_id for frontend SDK"""
        # This would typically create a prepay order and return prepay_id
        # For now, return app_id for frontend initialization
        return self.app_id