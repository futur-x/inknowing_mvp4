"""
Payment model for handling transactions, subscriptions and payment methods
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
import enum
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship

from backend.config.database import Base


class PaymentStatus(str, enum.Enum):
    """Payment status enum"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIAL_REFUNDED = "partial_refunded"


class PaymentMethod(str, enum.Enum):
    """Payment method enum"""
    STRIPE = "stripe"
    ALIPAY = "alipay"
    WECHAT_PAY = "wechat_pay"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"


class PaymentType(str, enum.Enum):
    """Payment type enum"""
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"
    POINTS = "points"
    REFUND = "refund"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status enum"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAUSED = "paused"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class Payment(Base):
    """Payment transaction model"""
    __tablename__ = "payments"
    __table_args__ = {"schema": "public"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    subscription_id = Column(PostgresUUID(as_uuid=True), ForeignKey("public.subscriptions.id"), nullable=True)

    # Payment details
    payment_type = Column(
        Enum(PaymentType, name="payment_type", create_type=False),
        nullable=False
    )
    payment_method = Column(
        Enum(PaymentMethod, name="payment_method", create_type=False),
        nullable=False
    )
    status = Column(
        Enum(PaymentStatus, name="payment_status", create_type=False),
        default=PaymentStatus.PENDING,
        nullable=False
    )

    # Amount information (stored in cents/分 to avoid float precision issues)
    amount = Column(Integer, nullable=False)  # Amount in cents/分
    currency = Column(String(3), nullable=False, default="CNY")  # ISO 4217 currency code

    # Payment gateway information
    gateway_payment_id = Column(String(255), unique=True)  # External payment ID from gateway
    gateway_customer_id = Column(String(255))  # Customer ID at payment gateway
    gateway_response = Column(JSON)  # Store full gateway response for audit

    # Additional information
    description = Column(Text)
    extra_data = Column(JSON)  # Store additional metadata

    # For refunds
    refunded_amount = Column(Integer, default=0)  # Amount refunded in cents/分
    refund_reason = Column(Text)
    original_payment_id = Column(PostgresUUID(as_uuid=True), ForeignKey("public.payments.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="payments")
    subscription = relationship("Subscription", foreign_keys=[subscription_id], backref="payments")
    original_payment = relationship("Payment", foreign_keys=[original_payment_id], remote_side=[id])

    def __repr__(self):
        return f"<Payment {self.id} - {self.amount/100} {self.currency} - {self.status}>"

    @property
    def amount_decimal(self) -> Decimal:
        """Get amount as decimal"""
        return Decimal(self.amount) / 100

    @property
    def is_successful(self) -> bool:
        """Check if payment is successful"""
        return self.status == PaymentStatus.SUCCESS

    @property
    def is_refundable(self) -> bool:
        """Check if payment can be refunded"""
        return (
            self.status == PaymentStatus.SUCCESS and
            self.payment_type != PaymentType.REFUND and
            self.refunded_amount < self.amount
        )


class Subscription(Base):
    """Subscription model for managing user memberships"""
    __tablename__ = "subscriptions"
    __table_args__ = {"schema": "public"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign key
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False, unique=True)

    # Subscription details
    status = Column(
        Enum(SubscriptionStatus, name="subscription_status", create_type=False),
        default=SubscriptionStatus.ACTIVE,
        nullable=False
    )
    membership_type = Column(String(50), nullable=False)  # basic, premium, super

    # Billing information
    billing_cycle = Column(String(20), nullable=False)  # monthly, quarterly, yearly
    amount = Column(Integer, nullable=False)  # Amount in cents/分
    currency = Column(String(3), nullable=False, default="CNY")

    # Payment gateway information
    gateway_subscription_id = Column(String(255), unique=True)  # External subscription ID
    gateway_customer_id = Column(String(255))  # Customer ID at payment gateway
    payment_method = Column(
        Enum(PaymentMethod, name="payment_method", create_type=False),
        nullable=False
    )

    # Subscription periods
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)

    # Auto renewal
    auto_renew = Column(Boolean, default=True)
    cancel_at_period_end = Column(Boolean, default=False)

    # Metadata
    extra_data = Column(JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    activated_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="subscription")

    def __repr__(self):
        return f"<Subscription {self.id} - {self.user_id} - {self.membership_type} - {self.status}>"

    @property
    def is_active(self) -> bool:
        """Check if subscription is active"""
        return (
            self.status == SubscriptionStatus.ACTIVE and
            (self.expires_at is None or self.expires_at > datetime.utcnow())
        )

    @property
    def is_in_trial(self) -> bool:
        """Check if subscription is in trial period"""
        if self.trial_start and self.trial_end:
            now = datetime.utcnow()
            return self.trial_start <= now <= self.trial_end
        return False


class UserPaymentMethod(Base):
    """Stored payment methods for users"""
    __tablename__ = "payment_methods"
    __table_args__ = {"schema": "public"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign key
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)

    # Payment method details
    type = Column(
        Enum(PaymentMethod, name="payment_method", create_type=False),
        nullable=False
    )
    is_default = Column(Boolean, default=False)

    # Gateway information
    gateway_payment_method_id = Column(String(255), unique=True)  # External ID from gateway
    gateway_customer_id = Column(String(255))

    # Card/Account details (encrypted/tokenized)
    last_four = Column(String(4))  # Last 4 digits of card/account
    brand = Column(String(50))  # Card brand or payment provider
    exp_month = Column(Integer)  # Card expiry month
    exp_year = Column(Integer)  # Card expiry year

    # Metadata
    extra_data = Column(JSON)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="payment_methods")

    def __repr__(self):
        return f"<PaymentMethod {self.id} - {self.type} - ****{self.last_four}>"


class PointsTransaction(Base):
    """Points transaction model for tracking point purchases and usage"""
    __tablename__ = "points_transactions"
    __table_args__ = {"schema": "public"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    payment_id = Column(PostgresUUID(as_uuid=True), ForeignKey("public.payments.id"), nullable=True)

    # Transaction details
    transaction_type = Column(String(20), nullable=False)  # purchase, usage, refund, bonus
    points = Column(Integer, nullable=False)  # Positive for additions, negative for usage
    balance_after = Column(Integer, nullable=False)  # User's point balance after transaction

    # Reference information
    reference_type = Column(String(50))  # dialogue, upload, etc.
    reference_id = Column(PostgresUUID(as_uuid=True))  # ID of the referenced item

    # Description
    description = Column(Text)
    extra_data = Column(JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # For points with expiry

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="points_transactions")
    payment = relationship("Payment", foreign_keys=[payment_id], backref="points_transactions")

    def __repr__(self):
        return f"<PointsTransaction {self.id} - {self.user_id} - {self.points} points>"