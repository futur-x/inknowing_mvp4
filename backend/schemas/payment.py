"""
Payment schemas for request/response validation
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator

from backend.models.payment import (
    PaymentStatus,
    PaymentMethod,
    PaymentType,
    SubscriptionStatus
)


# Enums for API
class BillingCycle(str, Enum):
    """Billing cycle options"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class MembershipPlan(str, Enum):
    """Available membership plans"""
    BASIC = "basic"
    PREMIUM = "premium"
    SUPER = "super"


# Request schemas
class CreatePaymentRequest(BaseModel):
    """Request to create a payment"""
    payment_type: PaymentType
    payment_method: PaymentMethod
    amount: int = Field(..., gt=0, description="Amount in cents/分")
    currency: str = Field(default="CNY", max_length=3)
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    # For subscription payments
    subscription_id: Optional[UUID] = None

    # For points purchase
    points_package_id: Optional[str] = None

    class Config:
        use_enum_values = True


class CreateSubscriptionRequest(BaseModel):
    """Request to create or update a subscription"""
    membership_plan: MembershipPlan
    billing_cycle: BillingCycle
    payment_method: PaymentMethod
    auto_renew: bool = True

    # Optional payment method token from frontend
    payment_method_token: Optional[str] = None

    class Config:
        use_enum_values = True


class UpdateSubscriptionRequest(BaseModel):
    """Request to update subscription settings"""
    auto_renew: Optional[bool] = None
    billing_cycle: Optional[BillingCycle] = None
    payment_method: Optional[PaymentMethod] = None

    class Config:
        use_enum_values = True


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel a subscription"""
    cancel_immediately: bool = False
    reason: Optional[str] = None


class ProcessRefundRequest(BaseModel):
    """Request to process a refund"""
    payment_id: UUID
    amount: Optional[int] = None  # Amount to refund in cents/分, None for full refund
    reason: str = Field(..., min_length=1, max_length=500)


class AddPaymentMethodRequest(BaseModel):
    """Request to add a new payment method"""
    payment_method: PaymentMethod
    token: str = Field(..., description="Payment method token from payment gateway")
    is_default: bool = False
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class PurchasePointsRequest(BaseModel):
    """Request to purchase points"""
    package_id: str = Field(..., description="Points package identifier")
    payment_method: PaymentMethod
    payment_method_id: Optional[UUID] = Field(None, description="Saved payment method ID")

    class Config:
        use_enum_values = True


# Response schemas
class PaymentResponse(BaseModel):
    """Payment response"""
    id: UUID
    user_id: UUID
    payment_type: PaymentType
    payment_method: PaymentMethod
    status: PaymentStatus
    amount: int
    currency: str
    description: Optional[str]
    gateway_payment_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime]
    refunded_amount: int = 0

    class Config:
        orm_mode = True
        use_enum_values = True


class SubscriptionResponse(BaseModel):
    """Subscription response"""
    id: UUID
    user_id: UUID
    status: SubscriptionStatus
    membership_type: str
    billing_cycle: str
    amount: int
    currency: str
    payment_method: PaymentMethod
    current_period_start: datetime
    current_period_end: datetime
    auto_renew: bool
    cancel_at_period_end: bool
    created_at: datetime
    updated_at: datetime
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]

    class Config:
        orm_mode = True
        use_enum_values = True


class PaymentMethodResponse(BaseModel):
    """Payment method response"""
    id: UUID
    type: PaymentMethod
    is_default: bool
    last_four: Optional[str]
    brand: Optional[str]
    exp_month: Optional[int]
    exp_year: Optional[int]
    created_at: datetime
    verified_at: Optional[datetime]

    class Config:
        orm_mode = True
        use_enum_values = True


class PointsTransactionResponse(BaseModel):
    """Points transaction response"""
    id: UUID
    transaction_type: str
    points: int
    balance_after: int
    description: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        orm_mode = True


class PaymentListResponse(BaseModel):
    """List of payments with pagination"""
    payments: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class TransactionHistoryResponse(BaseModel):
    """Transaction history response"""
    payments: List[PaymentResponse]
    points_transactions: List[PointsTransactionResponse]
    total: int
    page: int
    page_size: int


class PaymentMethodListResponse(BaseModel):
    """List of payment methods"""
    payment_methods: List[PaymentMethodResponse]
    default_method_id: Optional[UUID]


class SubscriptionPriceResponse(BaseModel):
    """Subscription pricing information"""
    membership_plan: MembershipPlan
    billing_cycle: BillingCycle
    original_price: int  # in cents/分
    discount_price: Optional[int]  # in cents/分
    discount_percentage: Optional[float]
    currency: str = "CNY"
    features: List[str]


class PointsPackageResponse(BaseModel):
    """Points package information"""
    package_id: str
    name: str
    points: int
    price: int  # in cents/分
    bonus_points: int = 0
    currency: str = "CNY"
    description: Optional[str]
    popular: bool = False


class PaymentStatsResponse(BaseModel):
    """User payment statistics"""
    total_spent: int  # Total amount spent in cents/分
    total_transactions: int
    current_points: int
    membership_type: str
    membership_expires_at: Optional[datetime]
    last_payment_date: Optional[datetime]


# Webhook schemas
class StripeWebhookEvent(BaseModel):
    """Stripe webhook event"""
    id: str
    object: str
    type: str
    data: Dict[str, Any]
    created: int


class AlipayNotification(BaseModel):
    """Alipay payment notification"""
    trade_no: str
    out_trade_no: str
    trade_status: str
    total_amount: str
    buyer_id: str
    gmt_payment: Optional[str]
    notify_id: str
    notify_time: str
    sign: str
    sign_type: str


class WeChatPayNotification(BaseModel):
    """WeChat Pay notification"""
    appid: str
    mch_id: str
    nonce_str: str
    sign: str
    result_code: str
    openid: str
    trade_type: str
    bank_type: str
    total_fee: int
    fee_type: str
    transaction_id: str
    out_trade_no: str
    time_end: str


# Client token response
class PaymentClientTokenResponse(BaseModel):
    """Client token for payment initialization"""
    client_token: str
    payment_method: PaymentMethod
    expires_at: datetime