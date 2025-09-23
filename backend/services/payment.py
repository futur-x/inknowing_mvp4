"""
Payment service for handling payment operations
"""
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload
import logging

from backend.models.payment import (
    Payment,
    Subscription,
    UserPaymentMethod,
    PointsTransaction,
    PaymentStatus,
    PaymentMethod,
    PaymentType,
    SubscriptionStatus
)
from backend.models.user import User, MembershipType
from backend.schemas.payment import (
    CreatePaymentRequest,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
    ProcessRefundRequest,
    AddPaymentMethodRequest,
    PurchasePointsRequest,
    PaymentResponse,
    SubscriptionResponse,
    PaymentMethodResponse,
    PointsTransactionResponse,
    BillingCycle,
    MembershipPlan
)
from backend.utils.payment_gateways import (
    PaymentGateway,
    StripeGateway,
    AlipayGateway,
    WeChatPayGateway
)
from backend.config.settings import settings
from backend.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ConflictException,
    PaymentException
)

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for handling payment operations"""

    def __init__(self):
        self.gateways: Dict[str, PaymentGateway] = {}
        self._initialize_gateways()

    def _initialize_gateways(self):
        """Initialize payment gateways"""
        # Initialize Stripe
        if settings.STRIPE_SECRET_KEY:
            stripe_gateway = StripeGateway()
            stripe_gateway.initialize({
                "secret_key": settings.STRIPE_SECRET_KEY,
                "webhook_secret": settings.STRIPE_WEBHOOK_SECRET
            })
            self.gateways[PaymentMethod.STRIPE] = stripe_gateway

        # Initialize Alipay
        if settings.ALIPAY_APP_ID:
            alipay_gateway = AlipayGateway()
            alipay_gateway.initialize({
                "app_id": settings.ALIPAY_APP_ID,
                "private_key": settings.ALIPAY_PRIVATE_KEY,
                "alipay_public_key": settings.ALIPAY_PUBLIC_KEY,
                "notify_url": settings.ALIPAY_NOTIFY_URL,
                "return_url": settings.ALIPAY_RETURN_URL,
                "sandbox": settings.ALIPAY_SANDBOX
            })
            self.gateways[PaymentMethod.ALIPAY] = alipay_gateway

        # Initialize WeChat Pay
        if settings.WECHAT_APP_ID:
            wechat_gateway = WeChatPayGateway()
            wechat_gateway.initialize({
                "app_id": settings.WECHAT_APP_ID,
                "mch_id": settings.WECHAT_MCH_ID,
                "api_key": settings.WECHAT_API_KEY,
                "api_v3_key": settings.WECHAT_API_V3_KEY,
                "cert_serial": settings.WECHAT_CERT_SERIAL,
                "private_key": settings.WECHAT_PRIVATE_KEY,
                "wechat_cert": settings.WECHAT_CERT,
                "notify_url": settings.WECHAT_NOTIFY_URL,
                "sandbox": settings.WECHAT_SANDBOX
            })
            self.gateways[PaymentMethod.WECHAT_PAY] = wechat_gateway

    def _get_gateway(self, payment_method: PaymentMethod) -> PaymentGateway:
        """Get payment gateway by method"""
        gateway = self.gateways.get(payment_method)
        if not gateway:
            raise BadRequestException(f"Payment method {payment_method} is not configured")
        return gateway

    def _get_subscription_price(self, plan: MembershipPlan, cycle: BillingCycle) -> int:
        """Get subscription price in cents/分"""
        # Price matrix (in CNY)
        prices = {
            MembershipPlan.BASIC: {
                BillingCycle.MONTHLY: 1900,  # 19 yuan
                BillingCycle.QUARTERLY: 5400,  # 54 yuan (10% discount)
                BillingCycle.YEARLY: 19900,  # 199 yuan (13% discount)
            },
            MembershipPlan.PREMIUM: {
                BillingCycle.MONTHLY: 3900,  # 39 yuan
                BillingCycle.QUARTERLY: 10900,  # 109 yuan (7% discount)
                BillingCycle.YEARLY: 39900,  # 399 yuan (15% discount)
            },
            MembershipPlan.SUPER: {
                BillingCycle.MONTHLY: 9900,  # 99 yuan
                BillingCycle.QUARTERLY: 27900,  # 279 yuan (6% discount)
                BillingCycle.YEARLY: 99900,  # 999 yuan (16% discount)
            }
        }
        return prices.get(plan, {}).get(cycle, 0)

    async def create_payment(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: CreatePaymentRequest
    ) -> PaymentResponse:
        """Create a new payment"""
        # Get user
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundException("User not found")

        # Get payment gateway
        gateway = self._get_gateway(request.payment_method)

        # Get or create customer ID for gateway
        customer_id = await self._get_or_create_customer(db, user, gateway)

        # Create payment in database first
        payment = Payment(
            id=uuid4(),
            user_id=user_id,
            payment_type=request.payment_type,
            payment_method=request.payment_method,
            amount=request.amount,
            currency=request.currency,
            description=request.description,
            metadata=request.metadata,
            status=PaymentStatus.PENDING,
            gateway_customer_id=customer_id
        )

        if request.subscription_id:
            payment.subscription_id = request.subscription_id

        db.add(payment)
        await db.flush()

        # Create payment with gateway
        try:
            result = await gateway.create_payment(
                amount=request.amount,
                currency=request.currency,
                description=request.description,
                customer_id=customer_id,
                metadata={"payment_id": str(payment.id), **(request.metadata or {})}
            )

            # Update payment with gateway response
            payment.gateway_payment_id = result.gateway_payment_id
            payment.status = result.status
            payment.gateway_response = result.raw_response

            if result.status == PaymentStatus.SUCCESS:
                payment.paid_at = result.paid_at or datetime.utcnow()

            await db.commit()

            return PaymentResponse.from_orm(payment)

        except Exception as e:
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = {"error": str(e)}
            await db.commit()
            raise PaymentException(f"Payment creation failed: {str(e)}")

    async def create_subscription(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: CreateSubscriptionRequest
    ) -> SubscriptionResponse:
        """Create or update a subscription"""
        # Get user
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundException("User not found")

        # Check if user already has active subscription
        existing_sub = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        existing_sub = existing_sub.scalar_one_or_none()

        if existing_sub:
            raise ConflictException("User already has an active subscription")

        # Get subscription price
        amount = self._get_subscription_price(request.membership_plan, request.billing_cycle)
        if amount == 0:
            raise BadRequestException("Invalid membership plan or billing cycle")

        # Calculate subscription periods
        now = datetime.utcnow()
        period_end = now

        if request.billing_cycle == BillingCycle.MONTHLY:
            period_end = now + timedelta(days=30)
        elif request.billing_cycle == BillingCycle.QUARTERLY:
            period_end = now + timedelta(days=90)
        elif request.billing_cycle == BillingCycle.YEARLY:
            period_end = now + timedelta(days=365)

        # Create subscription in database
        subscription = Subscription(
            id=uuid4(),
            user_id=user_id,
            status=SubscriptionStatus.ACTIVE,
            membership_type=request.membership_plan.value,
            billing_cycle=request.billing_cycle.value,
            amount=amount,
            currency="CNY",
            payment_method=request.payment_method,
            current_period_start=now,
            current_period_end=period_end,
            auto_renew=request.auto_renew,
            activated_at=now
        )

        db.add(subscription)

        # Update user membership
        membership_map = {
            MembershipPlan.BASIC: MembershipType.BASIC,
            MembershipPlan.PREMIUM: MembershipType.PREMIUM,
            MembershipPlan.SUPER: MembershipType.SUPER
        }
        user.membership = membership_map[request.membership_plan]
        user.membership_expires_at = period_end
        user.membership_auto_renew = request.auto_renew

        # Create payment for subscription
        payment = Payment(
            id=uuid4(),
            user_id=user_id,
            subscription_id=subscription.id,
            payment_type=PaymentType.SUBSCRIPTION,
            payment_method=request.payment_method,
            amount=amount,
            currency="CNY",
            description=f"Subscription: {request.membership_plan.value} - {request.billing_cycle.value}",
            status=PaymentStatus.PENDING
        )

        db.add(payment)

        # Process payment with gateway
        gateway = self._get_gateway(request.payment_method)
        customer_id = await self._get_or_create_customer(db, user, gateway)

        try:
            # For Stripe, create actual subscription
            if request.payment_method == PaymentMethod.STRIPE:
                # This would require price IDs to be configured in Stripe
                # For now, just create a payment
                result = await gateway.create_payment(
                    amount=amount,
                    currency="CNY",
                    description=payment.description,
                    customer_id=customer_id,
                    payment_method_id=request.payment_method_token,
                    metadata={"subscription_id": str(subscription.id)}
                )
                subscription.gateway_subscription_id = result.gateway_payment_id
            else:
                # For Alipay/WeChat, create one-time payment
                result = await gateway.create_payment(
                    amount=amount,
                    currency="CNY",
                    description=payment.description,
                    customer_id=customer_id,
                    metadata={"subscription_id": str(subscription.id)}
                )

            payment.gateway_payment_id = result.gateway_payment_id
            payment.status = result.status
            payment.gateway_response = result.raw_response

            if result.status == PaymentStatus.SUCCESS:
                payment.paid_at = result.paid_at or datetime.utcnow()

            subscription.gateway_customer_id = customer_id

            await db.commit()
            await db.refresh(subscription)

            return SubscriptionResponse.from_orm(subscription)

        except Exception as e:
            subscription.status = SubscriptionStatus.CANCELLED
            payment.status = PaymentStatus.FAILED
            user.membership = MembershipType.FREE
            user.membership_expires_at = None
            await db.commit()
            raise PaymentException(f"Subscription creation failed: {str(e)}")

    async def cancel_subscription(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: CancelSubscriptionRequest
    ) -> SubscriptionResponse:
        """Cancel a subscription"""
        # Get subscription
        subscription = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        subscription = subscription.scalar_one_or_none()

        if not subscription:
            raise NotFoundException("No active subscription found")

        # Cancel with gateway if applicable
        if subscription.gateway_subscription_id and subscription.payment_method == PaymentMethod.STRIPE:
            gateway = self._get_gateway(subscription.payment_method)
            try:
                await gateway.cancel_subscription(
                    subscription.gateway_subscription_id,
                    cancel_immediately=request.cancel_immediately
                )
            except Exception as e:
                logger.error(f"Failed to cancel subscription with gateway: {e}")

        # Update subscription status
        if request.cancel_immediately:
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = datetime.utcnow()

            # Update user membership
            user = await db.get(User, user_id)
            user.membership = MembershipType.FREE
            user.membership_expires_at = None
            user.membership_auto_renew = False
        else:
            subscription.cancel_at_period_end = True
            subscription.auto_renew = False

        await db.commit()
        await db.refresh(subscription)

        return SubscriptionResponse.from_orm(subscription)

    async def process_refund(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: ProcessRefundRequest
    ) -> PaymentResponse:
        """Process a refund for a payment"""
        # Get payment
        payment = await db.get(Payment, request.payment_id)
        if not payment or payment.user_id != user_id:
            raise NotFoundException("Payment not found")

        if not payment.is_refundable:
            raise BadRequestException("Payment is not refundable")

        # Calculate refund amount
        refund_amount = request.amount or (payment.amount - payment.refunded_amount)
        if refund_amount > (payment.amount - payment.refunded_amount):
            raise BadRequestException("Refund amount exceeds remaining refundable amount")

        # Process refund with gateway
        gateway = self._get_gateway(payment.payment_method)
        try:
            result = await gateway.create_refund(
                payment_id=payment.gateway_payment_id,
                amount=refund_amount,
                reason=request.reason
            )

            # Create refund payment record
            refund_payment = Payment(
                id=uuid4(),
                user_id=user_id,
                original_payment_id=payment.id,
                payment_type=PaymentType.REFUND,
                payment_method=payment.payment_method,
                amount=-refund_amount,  # Negative amount for refund
                currency=payment.currency,
                description=f"Refund: {request.reason}",
                status=PaymentStatus.SUCCESS if result.success else PaymentStatus.FAILED,
                gateway_payment_id=result.gateway_refund_id,
                gateway_response=result.raw_response
            )

            db.add(refund_payment)

            # Update original payment
            if result.success:
                payment.refunded_amount += refund_amount
                payment.refund_reason = request.reason
                payment.refunded_at = datetime.utcnow()

                if payment.refunded_amount >= payment.amount:
                    payment.status = PaymentStatus.REFUNDED
                else:
                    payment.status = PaymentStatus.PARTIAL_REFUNDED

                # If points purchase, deduct points
                if payment.payment_type == PaymentType.POINTS:
                    user = await db.get(User, user_id)
                    # Calculate points to deduct based on refund ratio
                    points_to_deduct = int((refund_amount / payment.amount) * payment.metadata.get("points", 0))
                    user.points = max(0, user.points - points_to_deduct)

                    # Create points transaction
                    points_transaction = PointsTransaction(
                        id=uuid4(),
                        user_id=user_id,
                        payment_id=refund_payment.id,
                        transaction_type="refund",
                        points=-points_to_deduct,
                        balance_after=user.points,
                        description=f"Refund: {request.reason}"
                    )
                    db.add(points_transaction)

            await db.commit()
            await db.refresh(payment)

            return PaymentResponse.from_orm(payment)

        except Exception as e:
            raise PaymentException(f"Refund processing failed: {str(e)}")

    async def get_payment_history(
        self,
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> List[PaymentResponse]:
        """Get payment history for a user"""
        offset = (page - 1) * page_size

        result = await db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(desc(Payment.created_at))
            .offset(offset)
            .limit(page_size)
        )

        payments = result.scalars().all()
        return [PaymentResponse.from_orm(p) for p in payments]

    async def get_points_transactions(
        self,
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> List[PointsTransactionResponse]:
        """Get points transaction history"""
        offset = (page - 1) * page_size

        result = await db.execute(
            select(PointsTransaction)
            .where(PointsTransaction.user_id == user_id)
            .order_by(desc(PointsTransaction.created_at))
            .offset(offset)
            .limit(page_size)
        )

        transactions = result.scalars().all()
        return [PointsTransactionResponse.from_orm(t) for t in transactions]

    async def get_payment_methods(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> List[PaymentMethodResponse]:
        """Get saved payment methods for a user"""
        result = await db.execute(
            select(UserPaymentMethod)
            .where(
                and_(
                    UserPaymentMethod.user_id == user_id,
                    UserPaymentMethod.is_active == True
                )
            )
            .order_by(desc(UserPaymentMethod.is_default))
        )

        methods = result.scalars().all()
        return [PaymentMethodResponse.from_orm(m) for m in methods]

    async def add_payment_method(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: AddPaymentMethodRequest
    ) -> PaymentMethodResponse:
        """Add a new payment method"""
        # Get user
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundException("User not found")

        # Get gateway
        gateway = self._get_gateway(request.payment_method)
        customer_id = await self._get_or_create_customer(db, user, gateway)

        try:
            # Add payment method with gateway
            gateway_method_id = await gateway.add_payment_method(
                customer_id=customer_id,
                payment_method_token=request.token,
                set_as_default=request.is_default
            )

            # Save payment method in database
            payment_method = UserPaymentMethod(
                id=uuid4(),
                user_id=user_id,
                type=request.payment_method,
                gateway_payment_method_id=gateway_method_id,
                gateway_customer_id=customer_id,
                is_default=request.is_default,
                metadata=request.metadata,
                verified_at=datetime.utcnow()
            )

            # If setting as default, unset other defaults
            if request.is_default:
                await db.execute(
                    select(UserPaymentMethod)
                    .where(
                        and_(
                            UserPaymentMethod.user_id == user_id,
                            UserPaymentMethod.id != payment_method.id
                        )
                    )
                    .update({"is_default": False})
                )

            db.add(payment_method)
            await db.commit()
            await db.refresh(payment_method)

            return PaymentMethodResponse.from_orm(payment_method)

        except Exception as e:
            raise PaymentException(f"Failed to add payment method: {str(e)}")

    async def remove_payment_method(
        self,
        db: AsyncSession,
        user_id: UUID,
        method_id: UUID
    ) -> bool:
        """Remove a payment method"""
        # Get payment method
        payment_method = await db.get(UserPaymentMethod, method_id)
        if not payment_method or payment_method.user_id != user_id:
            raise NotFoundException("Payment method not found")

        # Remove from gateway
        gateway = self._get_gateway(payment_method.type)
        try:
            await gateway.remove_payment_method(payment_method.gateway_payment_method_id)
        except Exception as e:
            logger.error(f"Failed to remove payment method from gateway: {e}")

        # Soft delete in database
        payment_method.is_active = False
        await db.commit()

        return True

    async def _get_or_create_customer(
        self,
        db: AsyncSession,
        user: User,
        gateway: PaymentGateway
    ) -> str:
        """Get or create customer ID for gateway"""
        # Check if customer ID exists in user metadata
        gateway_name = type(gateway).__name__.lower().replace("gateway", "")
        customer_id_key = f"{gateway_name}_customer_id"

        # For simplicity, using user ID as customer reference
        # In production, would store this in user table or separate mapping
        customer_id = await gateway.create_customer(
            user_id=user.id,
            email=user.email,
            phone=user.phone,
            name=user.nickname
        )

        return customer_id

    async def purchase_points(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: PurchasePointsRequest
    ) -> PaymentResponse:
        """Purchase points package"""
        # Get user
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundException("User not found")

        # Get points package details
        package = self._get_points_package(request.package_id)
        if not package:
            raise BadRequestException("Invalid points package")

        # Create payment
        payment_request = CreatePaymentRequest(
            payment_type=PaymentType.POINTS,
            payment_method=request.payment_method,
            amount=package["price"],
            currency="CNY",
            description=f"Purchase {package['points']} points",
            metadata={
                "package_id": request.package_id,
                "points": package["points"],
                "bonus_points": package.get("bonus_points", 0)
            }
        )

        # Process payment
        payment = await self.create_payment(db, user_id, payment_request)

        # If payment successful, add points
        if payment.status == PaymentStatus.SUCCESS:
            total_points = package["points"] + package.get("bonus_points", 0)
            user.points += total_points

            # Create points transaction
            points_transaction = PointsTransaction(
                id=uuid4(),
                user_id=user_id,
                payment_id=payment.id,
                transaction_type="purchase",
                points=total_points,
                balance_after=user.points,
                description=f"Purchased {package['points']} points (+{package.get('bonus_points', 0)} bonus)"
            )
            db.add(points_transaction)
            await db.commit()

        return payment

    def _get_points_package(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Get points package details"""
        packages = {
            "points_100": {"points": 100, "price": 1000, "bonus_points": 0},  # 10 yuan
            "points_500": {"points": 500, "price": 4500, "bonus_points": 50},  # 45 yuan + 50 bonus
            "points_1000": {"points": 1000, "price": 8000, "bonus_points": 200},  # 80 yuan + 200 bonus
            "points_5000": {"points": 5000, "price": 35000, "bonus_points": 1500},  # 350 yuan + 1500 bonus
        }
        return packages.get(package_id)


# Create service instance
payment_service = PaymentService()