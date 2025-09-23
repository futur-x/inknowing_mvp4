"""
Base payment gateway interface
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from backend.models.payment import PaymentStatus


@dataclass
class PaymentResult:
    """Unified payment result from any gateway"""
    success: bool
    gateway_payment_id: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    amount: Optional[int] = None
    currency: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None
    paid_at: Optional[datetime] = None


@dataclass
class SubscriptionResult:
    """Unified subscription result from any gateway"""
    success: bool
    gateway_subscription_id: Optional[str] = None
    gateway_customer_id: Optional[str] = None
    status: str = "pending"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class RefundResult:
    """Unified refund result from any gateway"""
    success: bool
    gateway_refund_id: Optional[str] = None
    refunded_amount: Optional[int] = None
    status: str = "pending"
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PaymentGateway(ABC):
    """Abstract base class for payment gateways"""

    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize the payment gateway with configuration"""
        pass

    @abstractmethod
    async def create_payment(
        self,
        amount: int,
        currency: str,
        description: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentResult:
        """Create a payment"""
        pass

    @abstractmethod
    async def confirm_payment(
        self,
        gateway_payment_id: str,
        payment_method_id: Optional[str] = None
    ) -> PaymentResult:
        """Confirm a payment"""
        pass

    @abstractmethod
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        payment_method_id: Optional[str] = None,
        trial_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SubscriptionResult:
        """Create a subscription"""
        pass

    @abstractmethod
    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False
    ) -> SubscriptionResult:
        """Cancel a subscription"""
        pass

    @abstractmethod
    async def update_subscription(
        self,
        subscription_id: str,
        price_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SubscriptionResult:
        """Update a subscription"""
        pass

    @abstractmethod
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RefundResult:
        """Create a refund for a payment"""
        pass

    @abstractmethod
    async def create_customer(
        self,
        user_id: UUID,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a customer in the payment gateway"""
        pass

    @abstractmethod
    async def add_payment_method(
        self,
        customer_id: str,
        payment_method_token: str,
        set_as_default: bool = False
    ) -> str:
        """Add a payment method to a customer"""
        pass

    @abstractmethod
    async def remove_payment_method(
        self,
        payment_method_id: str
    ) -> bool:
        """Remove a payment method"""
        pass

    @abstractmethod
    async def get_payment_status(
        self,
        gateway_payment_id: str
    ) -> PaymentResult:
        """Get the status of a payment"""
        pass

    @abstractmethod
    async def get_subscription_status(
        self,
        subscription_id: str
    ) -> SubscriptionResult:
        """Get the status of a subscription"""
        pass

    @abstractmethod
    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> bool:
        """Verify webhook signature from payment gateway"""
        pass

    @abstractmethod
    async def process_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process webhook event from payment gateway"""
        pass

    @abstractmethod
    async def generate_client_token(
        self,
        customer_id: Optional[str] = None
    ) -> str:
        """Generate client token for frontend initialization"""
        pass