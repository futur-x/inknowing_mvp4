"""
Alipay payment gateway implementation
"""
import json
import time
import hashlib
import base64
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA256
import logging
import httpx

from .base import (
    PaymentGateway,
    PaymentResult,
    SubscriptionResult,
    RefundResult
)
from backend.models.payment import PaymentStatus

logger = logging.getLogger(__name__)


class AlipayGateway(PaymentGateway):
    """Alipay payment gateway implementation"""

    def __init__(self):
        self.app_id = None
        self.private_key = None
        self.alipay_public_key = None
        self.gateway_url = "https://openapi.alipay.com/gateway.do"
        self.sandbox_url = "https://openapi.alipaydev.com/gateway.do"
        self.is_sandbox = False
        self.notify_url = None
        self.return_url = None

    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize Alipay with configuration"""
        self.app_id = config.get("app_id")
        self.private_key = RSA.import_key(config.get("private_key"))
        self.alipay_public_key = RSA.import_key(config.get("alipay_public_key"))
        self.is_sandbox = config.get("sandbox", False)
        self.notify_url = config.get("notify_url")
        self.return_url = config.get("return_url")
        logger.info(f"Alipay gateway initialized (sandbox: {self.is_sandbox})")

    def _sign(self, params: Dict[str, Any]) -> str:
        """Generate RSA signature for parameters"""
        # Sort parameters and create sign string
        sorted_params = sorted(params.items())
        sign_string = "&".join([f"{k}={v}" for k, v in sorted_params if v is not None])

        # Sign with RSA private key
        h = SHA256.new(sign_string.encode('utf-8'))
        signer = PKCS1_v1_5.new(self.private_key)
        signature = signer.sign(h)

        return base64.b64encode(signature).decode('utf-8')

    def _verify(self, params: Dict[str, Any], signature: str) -> bool:
        """Verify RSA signature from Alipay"""
        # Remove sign and sign_type from params
        params_copy = {k: v for k, v in params.items() if k not in ['sign', 'sign_type']}

        # Sort and create verify string
        sorted_params = sorted(params_copy.items())
        verify_string = "&".join([f"{k}={v}" for k, v in sorted_params if v is not None])

        # Verify with Alipay public key
        h = SHA256.new(verify_string.encode('utf-8'))
        verifier = PKCS1_v1_5.new(self.alipay_public_key)

        try:
            signature_bytes = base64.b64decode(signature)
            return verifier.verify(h, signature_bytes)
        except Exception as e:
            logger.error(f"Alipay signature verification failed: {e}")
            return False

    async def _request(self, method: str, biz_content: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to Alipay API"""
        params = {
            "app_id": self.app_id,
            "method": method,
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": json.dumps(biz_content, ensure_ascii=False)
        }

        if self.notify_url:
            params["notify_url"] = self.notify_url
        if self.return_url:
            params["return_url"] = self.return_url

        # Add signature
        params["sign"] = self._sign(params)

        # Make request
        url = self.sandbox_url if self.is_sandbox else self.gateway_url

        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=params)
            result = response.json()

        # Check response
        response_key = method.replace(".", "_") + "_response"
        response_data = result.get(response_key, {})

        if response_data.get("code") != "10000":
            logger.error(f"Alipay API error: {response_data}")
            raise Exception(response_data.get("msg", "Unknown error"))

        return response_data

    async def create_payment(
        self,
        amount: int,
        currency: str,
        description: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentResult:
        """Create a payment with Alipay"""
        try:
            # Generate unique order ID
            out_trade_no = f"{int(time.time() * 1000)}_{metadata.get('payment_id', '')}"[:64]

            # Create payment request
            biz_content = {
                "out_trade_no": out_trade_no,
                "total_amount": str(amount / 100),  # Convert cents to yuan
                "subject": description[:256],
                "product_code": "FAST_INSTANT_TRADE_PAY",
                "timeout_express": "30m"
            }

            if metadata:
                biz_content["passback_params"] = json.dumps(metadata)

            # For PC web payment
            response = await self._request("alipay.trade.page.pay", biz_content)

            return PaymentResult(
                success=True,
                gateway_payment_id=out_trade_no,
                status=PaymentStatus.PENDING,
                amount=amount,
                currency="CNY",
                raw_response=response
            )
        except Exception as e:
            logger.error(f"Alipay payment creation failed: {e}")
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
        """Query payment status from Alipay"""
        try:
            biz_content = {
                "out_trade_no": gateway_payment_id
            }

            response = await self._request("alipay.trade.query", biz_content)

            # Map Alipay trade status to our status
            trade_status = response.get("trade_status")
            status = PaymentStatus.PENDING

            if trade_status == "TRADE_SUCCESS" or trade_status == "TRADE_FINISHED":
                status = PaymentStatus.SUCCESS
            elif trade_status == "TRADE_CLOSED":
                status = PaymentStatus.FAILED
            elif trade_status == "WAIT_BUYER_PAY":
                status = PaymentStatus.PENDING

            return PaymentResult(
                success=status == PaymentStatus.SUCCESS,
                gateway_payment_id=response.get("trade_no"),
                status=status,
                amount=int(float(response.get("total_amount", 0)) * 100),
                currency="CNY",
                raw_response=response,
                paid_at=datetime.strptime(response.get("send_pay_date"), "%Y-%m-%d %H:%M:%S") if response.get("send_pay_date") else None
            )
        except Exception as e:
            logger.error(f"Alipay payment query failed: {e}")
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
        """Create a refund with Alipay"""
        try:
            # Generate unique refund ID
            out_request_no = f"refund_{int(time.time() * 1000)}"[:64]

            biz_content = {
                "out_trade_no": payment_id,
                "out_request_no": out_request_no,
                "refund_reason": reason or "User requested refund"
            }

            if amount:
                biz_content["refund_amount"] = str(amount / 100)

            response = await self._request("alipay.trade.refund", biz_content)

            return RefundResult(
                success=True,
                gateway_refund_id=out_request_no,
                refunded_amount=int(float(response.get("refund_fee", 0)) * 100),
                status="success",
                raw_response=response
            )
        except Exception as e:
            logger.error(f"Alipay refund creation failed: {e}")
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
        """Alipay doesn't have native subscription support, simulate with agreement"""
        # Note: This would require implementing Alipay's agreement payment API
        # which is more complex and requires additional merchant permissions
        return SubscriptionResult(
            success=False,
            error_message="Alipay subscriptions require agreement payment API setup"
        )

    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False
    ) -> SubscriptionResult:
        """Cancel subscription (agreement)"""
        return SubscriptionResult(
            success=False,
            error_message="Alipay subscriptions require agreement payment API setup"
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
            error_message="Alipay subscriptions require agreement payment API setup"
        )

    async def create_customer(
        self,
        user_id: UUID,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Alipay doesn't have customer concept like Stripe"""
        # Return user_id as customer identifier
        return str(user_id)

    async def add_payment_method(
        self,
        customer_id: str,
        payment_method_token: str,
        set_as_default: bool = False
    ) -> str:
        """Alipay doesn't store payment methods like cards"""
        # Return a placeholder ID
        return f"alipay_{customer_id}"

    async def remove_payment_method(
        self,
        payment_method_id: str
    ) -> bool:
        """Remove payment method"""
        # Always return True as Alipay doesn't store payment methods
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
            error_message="Alipay subscriptions require agreement payment API setup"
        )

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> bool:
        """Verify Alipay notification signature"""
        try:
            params = dict(param.split("=") for param in payload.decode('utf-8').split("&"))
            return self._verify(params, signature)
        except Exception as e:
            logger.error(f"Alipay webhook verification failed: {e}")
            return False

    async def process_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process Alipay notification"""
        trade_status = event_data.get("trade_status")

        result = {
            "event_type": "alipay_notification",
            "processed": True,
            "trade_no": event_data.get("trade_no"),
            "out_trade_no": event_data.get("out_trade_no"),
            "buyer_id": event_data.get("buyer_id")
        }

        if trade_status == "TRADE_SUCCESS":
            result["status"] = "succeeded"
            result["amount"] = int(float(event_data.get("total_amount", 0)) * 100)
        elif trade_status == "TRADE_CLOSED":
            result["status"] = "failed"
        elif trade_status == "WAIT_BUYER_PAY":
            result["status"] = "pending"

        return result

    async def generate_client_token(
        self,
        customer_id: Optional[str] = None
    ) -> str:
        """Generate client token for frontend"""
        # Alipay doesn't use client tokens like Stripe
        # Return app_id for frontend SDK initialization
        return self.app_id