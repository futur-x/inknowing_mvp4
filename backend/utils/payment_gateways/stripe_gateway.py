"""
Stripe payment gateway implementation
"""
import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import logging

from .base import (
    PaymentGateway,
    PaymentResult,
    SubscriptionResult,
    RefundResult
)
from backend.models.payment import PaymentStatus

logger = logging.getLogger(__name__)


class StripeGateway(PaymentGateway):
    """Stripe payment gateway implementation"""

    def __init__(self):
        self.stripe = stripe
        self.webhook_secret = None

    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize Stripe with API keys"""
        self.stripe.api_key = config.get("secret_key")
        self.webhook_secret = config.get("webhook_secret")
        logger.info("Stripe gateway initialized")

    async def create_payment(
        self,
        amount: int,
        currency: str,
        description: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentResult:
        """Create a payment intent with Stripe"""
        try:
            # Create payment intent
            intent = self.stripe.PaymentIntent.create(
                amount=amount,
                currency=currency.lower(),
                description=description,
                customer=customer_id,
                payment_method=payment_method_id,
                confirm=payment_method_id is not None,
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                } if not payment_method_id else None,
                metadata=metadata or {}
            )

            status = PaymentStatus.PENDING
            if intent.status == "succeeded":
                status = PaymentStatus.SUCCESS
            elif intent.status == "processing":
                status = PaymentStatus.PROCESSING
            elif intent.status in ["canceled", "failed"]:
                status = PaymentStatus.FAILED

            return PaymentResult(
                success=intent.status in ["succeeded", "processing", "requires_payment_method"],
                gateway_payment_id=intent.id,
                status=status,
                amount=intent.amount,
                currency=intent.currency.upper(),
                raw_response=intent.to_dict(),
                paid_at=datetime.fromtimestamp(intent.created) if intent.status == "succeeded" else None
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment creation failed: {e}")
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
        """Confirm a payment intent"""
        try:
            intent = self.stripe.PaymentIntent.confirm(
                gateway_payment_id,
                payment_method=payment_method_id
            )

            status = PaymentStatus.PENDING
            if intent.status == "succeeded":
                status = PaymentStatus.SUCCESS
            elif intent.status == "processing":
                status = PaymentStatus.PROCESSING
            elif intent.status in ["canceled", "failed"]:
                status = PaymentStatus.FAILED

            return PaymentResult(
                success=intent.status == "succeeded",
                gateway_payment_id=intent.id,
                status=status,
                amount=intent.amount,
                currency=intent.currency.upper(),
                raw_response=intent.to_dict(),
                paid_at=datetime.fromtimestamp(intent.created) if intent.status == "succeeded" else None
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment confirmation failed: {e}")
            return PaymentResult(
                success=False,
                status=PaymentStatus.FAILED,
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
        """Create a subscription"""
        try:
            # Set default payment method if provided
            if payment_method_id:
                self.stripe.Customer.modify(
                    customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method_id
                    }
                )

            # Create subscription
            subscription = self.stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                trial_period_days=trial_days,
                metadata=metadata or {}
            )

            return SubscriptionResult(
                success=True,
                gateway_subscription_id=subscription.id,
                gateway_customer_id=customer_id,
                status=subscription.status,
                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                raw_response=subscription.to_dict()
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription creation failed: {e}")
            return SubscriptionResult(
                success=False,
                error_message=str(e)
            )

    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False
    ) -> SubscriptionResult:
        """Cancel a subscription"""
        try:
            if cancel_immediately:
                subscription = self.stripe.Subscription.delete(subscription_id)
            else:
                subscription = self.stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )

            return SubscriptionResult(
                success=True,
                gateway_subscription_id=subscription.id,
                status=subscription.status,
                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                raw_response=subscription.to_dict()
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription cancellation failed: {e}")
            return SubscriptionResult(
                success=False,
                error_message=str(e)
            )

    async def update_subscription(
        self,
        subscription_id: str,
        price_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SubscriptionResult:
        """Update a subscription"""
        try:
            update_params = {}

            if price_id:
                # Get current subscription
                subscription = self.stripe.Subscription.retrieve(subscription_id)
                update_params["items"] = [{
                    "id": subscription.items.data[0].id,
                    "price": price_id
                }]

            if payment_method_id:
                update_params["default_payment_method"] = payment_method_id

            if metadata:
                update_params["metadata"] = metadata

            subscription = self.stripe.Subscription.modify(
                subscription_id,
                **update_params
            )

            return SubscriptionResult(
                success=True,
                gateway_subscription_id=subscription.id,
                status=subscription.status,
                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                raw_response=subscription.to_dict()
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription update failed: {e}")
            return SubscriptionResult(
                success=False,
                error_message=str(e)
            )

    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RefundResult:
        """Create a refund"""
        try:
            refund_params = {
                "payment_intent": payment_id,
                "metadata": metadata or {}
            }

            if amount:
                refund_params["amount"] = amount

            if reason:
                # Map reason to Stripe's refund reasons
                stripe_reason = "requested_by_customer"
                if "fraud" in reason.lower():
                    stripe_reason = "fraudulent"
                elif "duplicate" in reason.lower():
                    stripe_reason = "duplicate"
                refund_params["reason"] = stripe_reason

            refund = self.stripe.Refund.create(**refund_params)

            return RefundResult(
                success=True,
                gateway_refund_id=refund.id,
                refunded_amount=refund.amount,
                status=refund.status,
                raw_response=refund.to_dict()
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund creation failed: {e}")
            return RefundResult(
                success=False,
                error_message=str(e)
            )

    async def create_customer(
        self,
        user_id: UUID,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a customer in Stripe"""
        try:
            customer = self.stripe.Customer.create(
                email=email,
                phone=phone,
                name=name,
                metadata={
                    "user_id": str(user_id),
                    **(metadata or {})
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise

    async def add_payment_method(
        self,
        customer_id: str,
        payment_method_token: str,
        set_as_default: bool = False
    ) -> str:
        """Add a payment method to a customer"""
        try:
            # Attach payment method to customer
            payment_method = self.stripe.PaymentMethod.attach(
                payment_method_token,
                customer=customer_id
            )

            # Set as default if requested
            if set_as_default:
                self.stripe.Customer.modify(
                    customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method.id
                    }
                )

            return payment_method.id
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment method addition failed: {e}")
            raise

    async def remove_payment_method(
        self,
        payment_method_id: str
    ) -> bool:
        """Remove a payment method"""
        try:
            self.stripe.PaymentMethod.detach(payment_method_id)
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment method removal failed: {e}")
            return False

    async def get_payment_status(
        self,
        gateway_payment_id: str
    ) -> PaymentResult:
        """Get the status of a payment"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(gateway_payment_id)

            status = PaymentStatus.PENDING
            if intent.status == "succeeded":
                status = PaymentStatus.SUCCESS
            elif intent.status == "processing":
                status = PaymentStatus.PROCESSING
            elif intent.status in ["canceled", "failed"]:
                status = PaymentStatus.FAILED

            return PaymentResult(
                success=intent.status == "succeeded",
                gateway_payment_id=intent.id,
                status=status,
                amount=intent.amount,
                currency=intent.currency.upper(),
                raw_response=intent.to_dict(),
                paid_at=datetime.fromtimestamp(intent.created) if intent.status == "succeeded" else None
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment status retrieval failed: {e}")
            return PaymentResult(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )

    async def get_subscription_status(
        self,
        subscription_id: str
    ) -> SubscriptionResult:
        """Get the status of a subscription"""
        try:
            subscription = self.stripe.Subscription.retrieve(subscription_id)

            return SubscriptionResult(
                success=True,
                gateway_subscription_id=subscription.id,
                status=subscription.status,
                current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
                raw_response=subscription.to_dict()
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription status retrieval failed: {e}")
            return SubscriptionResult(
                success=False,
                error_message=str(e)
            )

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> bool:
        """Verify Stripe webhook signature"""
        try:
            self.stripe.Webhook.construct_event(
                payload,
                signature,
                webhook_secret
            )
            return True
        except ValueError:
            logger.error("Invalid Stripe webhook payload")
            return False
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid Stripe webhook signature")
            return False

    async def process_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process Stripe webhook event"""
        event_type = event_data.get("type")
        data = event_data.get("data", {}).get("object", {})

        result = {
            "event_type": event_type,
            "processed": True
        }

        # Handle different event types
        if event_type == "payment_intent.succeeded":
            result["payment_id"] = data.get("id")
            result["amount"] = data.get("amount")
            result["status"] = "succeeded"
        elif event_type == "payment_intent.payment_failed":
            result["payment_id"] = data.get("id")
            result["status"] = "failed"
            result["error"] = data.get("last_payment_error", {}).get("message")
        elif event_type == "subscription.created":
            result["subscription_id"] = data.get("id")
            result["customer_id"] = data.get("customer")
            result["status"] = data.get("status")
        elif event_type == "subscription.updated":
            result["subscription_id"] = data.get("id")
            result["status"] = data.get("status")
        elif event_type == "subscription.deleted":
            result["subscription_id"] = data.get("id")
            result["status"] = "cancelled"

        return result

    async def generate_client_token(
        self,
        customer_id: Optional[str] = None
    ) -> str:
        """Generate client token (Setup Intent) for frontend"""
        try:
            setup_intent = self.stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=["card", "alipay", "wechat_pay"]
            )
            return setup_intent.client_secret
        except stripe.error.StripeError as e:
            logger.error(f"Stripe client token generation failed: {e}")
            raise