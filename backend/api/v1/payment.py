"""
Payment API endpoints
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.config.database import get_db
from backend.core.auth import get_current_user
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
    PaymentListResponse,
    TransactionHistoryResponse,
    PaymentMethodListResponse,
    SubscriptionPriceResponse,
    PointsPackageResponse,
    PaymentStatsResponse,
    PaymentClientTokenResponse,
    StripeWebhookEvent,
    AlipayNotification,
    WeChatPayNotification,
    BillingCycle,
    MembershipPlan
)
from backend.services.payment import payment_service
from backend.models.user import User
from backend.models.payment import PaymentMethod
from backend.utils.payment_gateways import StripeGateway, AlipayGateway, WeChatPayGateway
from datetime import datetime
from backend.core.exceptions import PaymentException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment"])


@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    request: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new payment"""
    try:
        return await payment_service.create_payment(db, current_user.id, request)
    except PaymentException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Payment creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment creation failed")


@router.post("/subscription", response_model=SubscriptionResponse)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or update a subscription"""
    try:
        return await payment_service.create_subscription(db, current_user.id, request)
    except PaymentException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Subscription creation failed: {e}")
        raise HTTPException(status_code=500, detail="Subscription creation failed")


@router.put("/subscription", response_model=SubscriptionResponse)
async def update_subscription(
    request: UpdateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update subscription settings"""
    try:
        # Implementation would be similar to create_subscription
        # but updating existing subscription
        raise HTTPException(status_code=501, detail="Not implemented yet")
    except Exception as e:
        logger.error(f"Subscription update failed: {e}")
        raise HTTPException(status_code=500, detail="Subscription update failed")


@router.post("/subscription/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a subscription"""
    try:
        return await payment_service.cancel_subscription(db, current_user.id, request)
    except Exception as e:
        logger.error(f"Subscription cancellation failed: {e}")
        raise HTTPException(status_code=500, detail="Subscription cancellation failed")


@router.post("/refund", response_model=PaymentResponse)
async def process_refund(
    request: ProcessRefundRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Process a refund for a payment"""
    try:
        return await payment_service.process_refund(db, current_user.id, request)
    except PaymentException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Refund processing failed: {e}")
        raise HTTPException(status_code=500, detail="Refund processing failed")


@router.get("/history", response_model=PaymentListResponse)
async def get_payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment history for current user"""
    try:
        payments = await payment_service.get_payment_history(db, current_user.id, page, page_size)

        # Get total count
        from sqlalchemy import select, func
        from models.payment import Payment

        result = await db.execute(
            select(func.count(Payment.id)).where(Payment.user_id == current_user.id)
        )
        total = result.scalar()

        return PaymentListResponse(
            payments=payments,
            total=total,
            page=page,
            page_size=page_size,
            has_next=total > page * page_size
        )
    except Exception as e:
        logger.error(f"Failed to get payment history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment history")


@router.get("/transactions", response_model=TransactionHistoryResponse)
async def get_transaction_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get combined payment and points transaction history"""
    try:
        payments = await payment_service.get_payment_history(db, current_user.id, page, page_size)
        points_transactions = await payment_service.get_points_transactions(db, current_user.id, page, page_size)

        # Get total count
        from sqlalchemy import select, func
        from models.payment import Payment, PointsTransaction

        payment_count = await db.execute(
            select(func.count(Payment.id)).where(Payment.user_id == current_user.id)
        )
        points_count = await db.execute(
            select(func.count(PointsTransaction.id)).where(PointsTransaction.user_id == current_user.id)
        )

        total = payment_count.scalar() + points_count.scalar()

        return TransactionHistoryResponse(
            payments=payments,
            points_transactions=points_transactions,
            total=total,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Failed to get transaction history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get transaction history")


@router.get("/methods", response_model=PaymentMethodListResponse)
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get saved payment methods"""
    try:
        methods = await payment_service.get_payment_methods(db, current_user.id)

        # Find default method
        default_method_id = None
        for method in methods:
            if method.is_default:
                default_method_id = method.id
                break

        return PaymentMethodListResponse(
            payment_methods=methods,
            default_method_id=default_method_id
        )
    except Exception as e:
        logger.error(f"Failed to get payment methods: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment methods")


@router.post("/methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    request: AddPaymentMethodRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a new payment method"""
    try:
        return await payment_service.add_payment_method(db, current_user.id, request)
    except PaymentException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add payment method: {e}")
        raise HTTPException(status_code=500, detail="Failed to add payment method")


@router.delete("/methods/{method_id}")
async def remove_payment_method(
    method_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a payment method"""
    try:
        success = await payment_service.remove_payment_method(db, current_user.id, method_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Failed to remove payment method: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove payment method")


@router.post("/points/purchase", response_model=PaymentResponse)
async def purchase_points(
    request: PurchasePointsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Purchase points package"""
    try:
        return await payment_service.purchase_points(db, current_user.id, request)
    except PaymentException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Points purchase failed: {e}")
        raise HTTPException(status_code=500, detail="Points purchase failed")


@router.get("/points/packages", response_model=List[PointsPackageResponse])
async def get_points_packages():
    """Get available points packages"""
    packages = [
        PointsPackageResponse(
            package_id="points_100",
            name="100 Points",
            points=100,
            price=1000,
            bonus_points=0,
            description="Basic points package"
        ),
        PointsPackageResponse(
            package_id="points_500",
            name="500 Points",
            points=500,
            price=4500,
            bonus_points=50,
            description="Popular choice with 10% bonus",
            popular=True
        ),
        PointsPackageResponse(
            package_id="points_1000",
            name="1000 Points",
            points=1000,
            price=8000,
            bonus_points=200,
            description="Best value with 20% bonus"
        ),
        PointsPackageResponse(
            package_id="points_5000",
            name="5000 Points",
            points=5000,
            price=35000,
            bonus_points=1500,
            description="Premium package with 30% bonus"
        )
    ]
    return packages


@router.get("/subscription/pricing", response_model=List[SubscriptionPriceResponse])
async def get_subscription_pricing():
    """Get subscription pricing information"""
    pricing = []

    for plan in MembershipPlan:
        for cycle in BillingCycle:
            base_prices = {
                (MembershipPlan.BASIC, BillingCycle.MONTHLY): 1900,
                (MembershipPlan.BASIC, BillingCycle.QUARTERLY): 5400,
                (MembershipPlan.BASIC, BillingCycle.YEARLY): 19900,
                (MembershipPlan.PREMIUM, BillingCycle.MONTHLY): 3900,
                (MembershipPlan.PREMIUM, BillingCycle.QUARTERLY): 10900,
                (MembershipPlan.PREMIUM, BillingCycle.YEARLY): 39900,
                (MembershipPlan.SUPER, BillingCycle.MONTHLY): 9900,
                (MembershipPlan.SUPER, BillingCycle.QUARTERLY): 27900,
                (MembershipPlan.SUPER, BillingCycle.YEARLY): 99900,
            }

            price = base_prices.get((plan, cycle), 0)

            # Calculate discount
            monthly_price = base_prices.get((plan, BillingCycle.MONTHLY), 0)
            months = {"monthly": 1, "quarterly": 3, "yearly": 12}[cycle.value]
            full_price = monthly_price * months
            discount_price = price if price < full_price else None
            discount_percentage = ((full_price - price) / full_price * 100) if discount_price else None

            # Features by plan
            features_map = {
                MembershipPlan.BASIC: [
                    "100 dialogues per month",
                    "Basic AI characters",
                    "Standard response speed"
                ],
                MembershipPlan.PREMIUM: [
                    "500 dialogues per month",
                    "All AI characters",
                    "Priority response speed",
                    "Advanced features"
                ],
                MembershipPlan.SUPER: [
                    "Unlimited dialogues",
                    "All AI characters",
                    "Fastest response speed",
                    "All premium features",
                    "Priority support"
                ]
            }

            pricing.append(SubscriptionPriceResponse(
                membership_plan=plan,
                billing_cycle=cycle,
                original_price=full_price if discount_price else price,
                discount_price=discount_price,
                discount_percentage=discount_percentage,
                features=features_map[plan]
            ))

    return pricing


@router.get("/stats", response_model=PaymentStatsResponse)
async def get_payment_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment statistics for current user"""
    try:
        from sqlalchemy import select, func
        from models.payment import Payment, PaymentStatus, PaymentType

        # Get total spent
        result = await db.execute(
            select(func.sum(Payment.amount)).where(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.SUCCESS,
                Payment.payment_type != PaymentType.REFUND
            )
        )
        total_spent = result.scalar() or 0

        # Get transaction count
        result = await db.execute(
            select(func.count(Payment.id)).where(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.SUCCESS
            )
        )
        total_transactions = result.scalar() or 0

        # Get last payment date
        result = await db.execute(
            select(Payment.paid_at).where(
                Payment.user_id == current_user.id,
                Payment.status == PaymentStatus.SUCCESS
            ).order_by(Payment.paid_at.desc()).limit(1)
        )
        last_payment_date = result.scalar()

        return PaymentStatsResponse(
            total_spent=total_spent,
            total_transactions=total_transactions,
            current_points=current_user.points,
            membership_type=current_user.membership.value,
            membership_expires_at=current_user.membership_expires_at,
            last_payment_date=last_payment_date
        )
    except Exception as e:
        logger.error(f"Failed to get payment stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment stats")


@router.post("/client-token", response_model=PaymentClientTokenResponse)
async def get_payment_client_token(
    payment_method: PaymentMethod,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get client token for payment initialization"""
    try:
        gateway = payment_service._get_gateway(payment_method)

        # Get or create customer
        customer_id = await payment_service._get_or_create_customer(db, current_user, gateway)

        # Generate client token
        client_token = await gateway.generate_client_token(customer_id)

        return PaymentClientTokenResponse(
            client_token=client_token,
            payment_method=payment_method,
            expires_at=datetime.utcnow().replace(hour=23, minute=59, second=59)
        )
    except Exception as e:
        logger.error(f"Failed to generate client token: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate client token")


# Webhook endpoints
@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        signature = request.headers.get("Stripe-Signature")

        # Get Stripe gateway
        gateway = payment_service.gateways.get(PaymentMethod.STRIPE)
        if not gateway:
            raise HTTPException(status_code=400, detail="Stripe not configured")

        # Verify signature
        if not await gateway.verify_webhook_signature(payload, signature, gateway.webhook_secret):
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Process event
        import json
        event_data = json.loads(payload)
        result = await gateway.process_webhook_event(event_data)

        # Update database based on event
        # Implementation would handle different event types

        return {"received": True, "result": result}

    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook/alipay")
async def alipay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Alipay notification"""
    try:
        # Parse form data
        form_data = await request.form()
        notification_data = dict(form_data)

        # Get Alipay gateway
        gateway = payment_service.gateways.get(PaymentMethod.ALIPAY)
        if not gateway:
            raise HTTPException(status_code=400, detail="Alipay not configured")

        # Verify signature
        signature = notification_data.get("sign")
        payload = await request.body()

        if not await gateway.verify_webhook_signature(payload, signature, None):
            return "fail"  # Alipay expects "fail" for errors

        # Process notification
        result = await gateway.process_webhook_event(notification_data)

        # Update database based on notification
        # Implementation would handle different trade states

        return "success"  # Alipay expects "success" for successful processing

    except Exception as e:
        logger.error(f"Alipay webhook error: {e}")
        return "fail"


@router.post("/webhook/wechat")
async def wechat_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle WeChat Pay notification"""
    try:
        # Parse XML data
        xml_data = await request.body()

        # Get WeChat gateway
        gateway = payment_service.gateways.get(PaymentMethod.WECHAT_PAY)
        if not gateway:
            raise HTTPException(status_code=400, detail="WeChat Pay not configured")

        # Parse and verify
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_data)
        notification_data = {child.tag: child.text for child in root}

        signature = notification_data.get("sign")

        if not await gateway.verify_webhook_signature(xml_data, signature, None):
            return gateway._dict_to_xml({"return_code": "FAIL", "return_msg": "Signature verification failed"})

        # Process notification
        result = await gateway.process_webhook_event(notification_data)

        # Update database based on notification
        # Implementation would handle different result codes

        return gateway._dict_to_xml({"return_code": "SUCCESS", "return_msg": "OK"})

    except Exception as e:
        logger.error(f"WeChat webhook error: {e}")
        gateway = payment_service.gateways.get(PaymentMethod.WECHAT_PAY)
        if gateway:
            return gateway._dict_to_xml({"return_code": "FAIL", "return_msg": str(e)})
        return ""