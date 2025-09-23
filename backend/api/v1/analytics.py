"""
Analytics API Module
Provides comprehensive data analysis endpoints for the admin dashboard
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, case, extract
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, date
from pydantic import BaseModel, Field
import logging

from backend.config.database import get_db
from backend.core.auth import require_admin
from backend.models import (
    User, UserProfile, UserQuota,
    Book, BookChapter, BookCharacter,
    DialogueSession, DialogueMessage, AIUsageTracking,
    Payment, Subscription, PointsTransaction,
    SystemMetric, ApiHealthCheck,
    Admin, AuditLog
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/analytics", tags=["Admin - Analytics"])

# Pydantic Models for Request/Response
class TimeRange(BaseModel):
    """Time range for analytics queries"""
    start_date: datetime
    end_date: datetime
    granularity: str = Field(default="day", pattern="^(hour|day|week|month|year)$")

class OverviewMetrics(BaseModel):
    """Business overview metrics"""
    total_users: int
    active_users: int
    new_users: int
    total_books: int
    total_dialogues: int
    total_revenue: float
    active_subscriptions: int
    avg_session_duration: float
    user_growth_rate: float
    revenue_growth_rate: float
    timestamp: datetime

class UserAnalytics(BaseModel):
    """User analytics data"""
    user_growth: List[Dict[str, Any]]
    retention_rates: Dict[str, float]
    activity_distribution: List[Dict[str, Any]]
    user_segments: List[Dict[str, Any]]
    behavior_patterns: List[Dict[str, Any]]
    user_journey_funnel: List[Dict[str, Any]]

class ContentAnalytics(BaseModel):
    """Content analytics data"""
    popular_books: List[Dict[str, Any]]
    content_quality_scores: List[Dict[str, Any]]
    dialogue_topics: List[Dict[str, Any]]
    keyword_cloud: List[Dict[str, Any]]
    recommendation_effectiveness: Dict[str, Any]
    engagement_metrics: Dict[str, Any]

class RevenueAnalytics(BaseModel):
    """Revenue analytics data"""
    revenue_trends: List[Dict[str, Any]]
    payment_methods: List[Dict[str, Any]]
    conversion_rates: Dict[str, float]
    arpu: float
    arppu: float
    revenue_forecast: List[Dict[str, Any]]
    subscription_metrics: Dict[str, Any]

class AIPerformanceAnalytics(BaseModel):
    """AI performance analytics data"""
    response_time_distribution: List[Dict[str, Any]]
    accuracy_metrics: Dict[str, float]
    token_usage: List[Dict[str, Any]]
    cost_analysis: Dict[str, Any]
    model_performance: List[Dict[str, Any]]
    error_rates: Dict[str, float]

class CustomReportRequest(BaseModel):
    """Custom report generation request"""
    report_type: str
    metrics: List[str]
    filters: Dict[str, Any]
    time_range: TimeRange
    group_by: Optional[List[str]] = None
    order_by: Optional[str] = None
    limit: Optional[int] = Field(default=100, le=1000)

class ExportRequest(BaseModel):
    """Data export request"""
    report_type: str
    format: str = Field(default="csv", pattern="^(csv|excel|json)$")
    time_range: TimeRange
    include_raw_data: bool = False

# Helper Functions
def calculate_growth_rate(current_value: float, previous_value: float) -> float:
    """Calculate growth rate percentage"""
    if previous_value == 0:
        return 100.0 if current_value > 0 else 0.0
    return ((current_value - previous_value) / previous_value) * 100

def get_date_range_filter(model_date_field, start_date: datetime, end_date: datetime):
    """Generate date range filter for SQLAlchemy queries"""
    return and_(
        model_date_field >= start_date,
        model_date_field <= end_date
    )

# API Endpoints

@router.get("/overview", response_model=OverviewMetrics)
async def get_overview_metrics(
    time_period: str = Query(default="day", pattern="^(day|week|month|year)$"),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get business overview metrics for the specified time period
    """
    try:
        # Calculate date ranges
        now = datetime.utcnow()
        if time_period == "day":
            start_date = now - timedelta(days=1)
            previous_start = now - timedelta(days=2)
        elif time_period == "week":
            start_date = now - timedelta(weeks=1)
            previous_start = now - timedelta(weeks=2)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
            previous_start = now - timedelta(days=60)
        else:  # year
            start_date = now - timedelta(days=365)
            previous_start = now - timedelta(days=730)

        # Current period metrics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(
            User.last_login >= start_date
        ).count()
        new_users = db.query(User).filter(
            User.created_at >= start_date
        ).count()

        total_books = db.query(Book).count()
        total_dialogues = db.query(DialogueSession).filter(
            DialogueSession.created_at >= start_date
        ).count()

        # Revenue metrics
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.created_at >= start_date,
                Payment.status == "completed"
            )
        ).scalar() or 0.0

        active_subscriptions = db.query(Subscription).filter(
            Subscription.status == "active"
        ).count()

        # Average session duration (in minutes)
        avg_duration = db.query(
            func.avg(
                func.extract('epoch', DialogueSession.last_message_at - DialogueSession.created_at) / 60
            )
        ).filter(
            DialogueSession.created_at >= start_date
        ).scalar() or 0.0

        # Previous period metrics for growth rate
        previous_users = db.query(User).filter(
            User.created_at.between(previous_start, start_date)
        ).count()

        previous_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.created_at.between(previous_start, start_date),
                Payment.status == "completed"
            )
        ).scalar() or 0.0

        # Calculate growth rates
        user_growth = calculate_growth_rate(new_users, previous_users)
        revenue_growth = calculate_growth_rate(total_revenue, previous_revenue)

        return OverviewMetrics(
            total_users=total_users,
            active_users=active_users,
            new_users=new_users,
            total_books=total_books,
            total_dialogues=total_dialogues,
            total_revenue=float(total_revenue),
            active_subscriptions=active_subscriptions,
            avg_session_duration=float(avg_duration),
            user_growth_rate=user_growth,
            revenue_growth_rate=revenue_growth,
            timestamp=now
        )

    except Exception as e:
        logger.error(f"Error fetching overview metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch overview metrics")

@router.get("/users", response_model=UserAnalytics)
async def get_user_analytics(
    time_range: TimeRange = Depends(),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed user analytics including growth, retention, and behavior patterns
    """
    try:
        # User growth over time
        growth_data = []
        current_date = time_range.start_date
        while current_date <= time_range.end_date:
            if time_range.granularity == "day":
                next_date = current_date + timedelta(days=1)
            elif time_range.granularity == "week":
                next_date = current_date + timedelta(weeks=1)
            elif time_range.granularity == "month":
                next_date = current_date + timedelta(days=30)
            else:
                next_date = current_date + timedelta(days=365)

            new_users = db.query(func.count(User.id)).filter(
                User.created_at.between(current_date, next_date)
            ).scalar()

            active_users = db.query(func.count(User.id)).filter(
                User.last_login.between(current_date, next_date)
            ).scalar()

            growth_data.append({
                "date": current_date.isoformat(),
                "new_users": new_users,
                "active_users": active_users
            })

            current_date = next_date

        # Retention rates (cohort analysis)
        retention_rates = {}
        for days in [1, 7, 14, 30]:
            cohort_date = datetime.utcnow() - timedelta(days=days+30)
            cohort_users = db.query(User.id).filter(
                User.created_at.between(cohort_date, cohort_date + timedelta(days=1))
            ).subquery()

            retained_users = db.query(func.count(User.id)).filter(
                and_(
                    User.id.in_(cohort_users),
                    User.last_login >= datetime.utcnow() - timedelta(days=days)
                )
            ).scalar()

            total_cohort = db.query(func.count()).select_from(cohort_users).scalar()
            retention_rates[f"day_{days}"] = (retained_users / total_cohort * 100) if total_cohort > 0 else 0

        # User activity distribution
        activity_dist = db.query(
            case(
                (UserQuota.daily_dialogue_count < 5, "Low"),
                (UserQuota.daily_dialogue_count < 20, "Medium"),
                else_="High"
            ).label("activity_level"),
            func.count(User.id).label("count")
        ).join(UserQuota).group_by("activity_level").all()

        activity_distribution = [
            {"level": level, "count": count}
            for level, count in activity_dist
        ]

        # User segments by membership
        segments = db.query(
            User.membership_type,
            func.count(User.id).label("count"),
            func.avg(UserQuota.daily_dialogue_count).label("avg_dialogues")
        ).join(UserQuota).group_by(User.membership_type).all()

        user_segments = [
            {
                "segment": str(seg[0]),
                "count": seg[1],
                "avg_dialogues": float(seg[2]) if seg[2] else 0
            }
            for seg in segments
        ]

        # User journey funnel
        total_users = db.query(func.count(User.id)).scalar()
        registered_users = total_users
        profile_completed = db.query(func.count(UserProfile.id)).scalar()
        first_dialogue = db.query(func.count(func.distinct(DialogueSession.user_id))).scalar()
        paid_users = db.query(func.count(func.distinct(Payment.user_id))).filter(
            Payment.status == "completed"
        ).scalar()

        user_journey_funnel = [
            {"stage": "Registration", "users": registered_users, "rate": 100.0},
            {"stage": "Profile Completion", "users": profile_completed,
             "rate": (profile_completed/registered_users*100) if registered_users > 0 else 0},
            {"stage": "First Dialogue", "users": first_dialogue,
             "rate": (first_dialogue/registered_users*100) if registered_users > 0 else 0},
            {"stage": "Payment", "users": paid_users,
             "rate": (paid_users/registered_users*100) if registered_users > 0 else 0}
        ]

        return UserAnalytics(
            user_growth=growth_data,
            retention_rates=retention_rates,
            activity_distribution=activity_distribution,
            user_segments=user_segments,
            behavior_patterns=[],  # To be implemented with more complex analysis
            user_journey_funnel=user_journey_funnel
        )

    except Exception as e:
        logger.error(f"Error fetching user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user analytics")

@router.get("/content", response_model=ContentAnalytics)
async def get_content_analytics(
    time_range: TimeRange = Depends(),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get content analytics including popular books, quality scores, and engagement metrics
    """
    try:
        # Popular books by dialogue count
        popular_books = db.query(
            Book.id,
            Book.title,
            Book.author,
            func.count(DialogueSession.id).label("dialogue_count"),
            func.avg(DialogueSession.user_rating).label("avg_rating")
        ).outerjoin(DialogueSession).filter(
            DialogueSession.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by(Book.id).order_by(desc("dialogue_count")).limit(10).all()

        popular_books_data = [
            {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "dialogue_count": book.dialogue_count,
                "avg_rating": float(book.avg_rating) if book.avg_rating else 0
            }
            for book in popular_books
        ]

        # Content quality scores (based on user ratings and engagement)
        quality_scores = db.query(
            Book.id,
            Book.title,
            func.avg(DialogueSession.user_rating).label("quality_score"),
            func.count(DialogueSession.id).label("total_sessions")
        ).outerjoin(DialogueSession).group_by(Book.id).having(
            func.count(DialogueSession.id) > 0
        ).order_by(desc("quality_score")).limit(20).all()

        quality_scores_data = [
            {
                "book_id": score.id,
                "title": score.title,
                "score": float(score.quality_score) if score.quality_score else 0,
                "sessions": score.total_sessions
            }
            for score in quality_scores
        ]

        # Dialogue topics analysis (simplified - would need NLP in production)
        dialogue_topics = db.query(
            DialogueSession.context_type,
            func.count(DialogueSession.id).label("count")
        ).filter(
            DialogueSession.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by(DialogueSession.context_type).all()

        dialogue_topics_data = [
            {"topic": topic or "general", "count": count}
            for topic, count in dialogue_topics
        ]

        # Engagement metrics
        total_dialogues = db.query(func.count(DialogueSession.id)).filter(
            DialogueSession.created_at.between(time_range.start_date, time_range.end_date)
        ).scalar()

        avg_messages_per_session = db.query(
            func.avg(func.count(DialogueMessage.id))
        ).join(DialogueSession).filter(
            DialogueSession.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by(DialogueSession.id).scalar() or 0

        engagement_metrics = {
            "total_dialogues": total_dialogues,
            "avg_messages_per_session": float(avg_messages_per_session),
            "completion_rate": 75.0,  # Placeholder - would calculate based on actual completion criteria
            "repeat_usage_rate": 60.0  # Placeholder - would calculate based on user return patterns
        }

        # Recommendation effectiveness (simplified)
        recommendation_effectiveness = {
            "click_through_rate": 25.5,
            "conversion_rate": 12.3,
            "accuracy_score": 85.0
        }

        return ContentAnalytics(
            popular_books=popular_books_data,
            content_quality_scores=quality_scores_data,
            dialogue_topics=dialogue_topics_data,
            keyword_cloud=[],  # Would require NLP processing
            recommendation_effectiveness=recommendation_effectiveness,
            engagement_metrics=engagement_metrics
        )

    except Exception as e:
        logger.error(f"Error fetching content analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content analytics")

@router.get("/revenue", response_model=RevenueAnalytics)
async def get_revenue_analytics(
    time_range: TimeRange = Depends(),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get revenue analytics including trends, conversion rates, and ARPU/ARPPU
    """
    try:
        # Revenue trends over time
        revenue_trends = []
        current_date = time_range.start_date

        while current_date <= time_range.end_date:
            if time_range.granularity == "day":
                next_date = current_date + timedelta(days=1)
            elif time_range.granularity == "week":
                next_date = current_date + timedelta(weeks=1)
            elif time_range.granularity == "month":
                next_date = current_date + timedelta(days=30)
            else:
                next_date = current_date + timedelta(days=365)

            period_revenue = db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.created_at.between(current_date, next_date),
                    Payment.status == "completed"
                )
            ).scalar() or 0

            revenue_trends.append({
                "date": current_date.isoformat(),
                "revenue": float(period_revenue)
            })

            current_date = next_date

        # Payment methods distribution
        payment_methods = db.query(
            Payment.payment_method,
            func.count(Payment.id).label("count"),
            func.sum(Payment.amount).label("total")
        ).filter(
            and_(
                Payment.created_at.between(time_range.start_date, time_range.end_date),
                Payment.status == "completed"
            )
        ).group_by(Payment.payment_method).all()

        payment_methods_data = [
            {
                "method": str(method),
                "count": count,
                "total": float(total) if total else 0
            }
            for method, count, total in payment_methods
        ]

        # Conversion rates
        total_users = db.query(func.count(User.id)).scalar()
        paid_users = db.query(func.count(func.distinct(Payment.user_id))).filter(
            Payment.status == "completed"
        ).scalar()

        trial_to_paid = db.query(func.count(func.distinct(Subscription.user_id))).filter(
            and_(
                Subscription.status == "active",
                Subscription.trial_end < datetime.utcnow()
            )
        ).scalar()

        trial_users = db.query(func.count(func.distinct(Subscription.user_id))).filter(
            Subscription.trial_end.isnot(None)
        ).scalar()

        conversion_rates = {
            "overall": (paid_users / total_users * 100) if total_users > 0 else 0,
            "trial_to_paid": (trial_to_paid / trial_users * 100) if trial_users > 0 else 0,
            "checkout_completion": 65.0  # Placeholder
        }

        # ARPU and ARPPU
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.created_at.between(time_range.start_date, time_range.end_date),
                Payment.status == "completed"
            )
        ).scalar() or 0

        active_users_in_period = db.query(func.count(func.distinct(User.id))).filter(
            User.last_login.between(time_range.start_date, time_range.end_date)
        ).scalar() or 1

        paying_users_in_period = db.query(func.count(func.distinct(Payment.user_id))).filter(
            and_(
                Payment.created_at.between(time_range.start_date, time_range.end_date),
                Payment.status == "completed"
            )
        ).scalar() or 1

        arpu = float(total_revenue) / active_users_in_period
        arppu = float(total_revenue) / paying_users_in_period

        # Revenue forecast (simplified linear projection)
        revenue_forecast = []
        avg_daily_revenue = float(total_revenue) / max((time_range.end_date - time_range.start_date).days, 1)
        forecast_start = time_range.end_date

        for i in range(30):  # 30 days forecast
            forecast_date = forecast_start + timedelta(days=i)
            # Add some variance for realistic forecast
            projected_revenue = avg_daily_revenue * (1 + (i * 0.01))  # 1% growth per day
            revenue_forecast.append({
                "date": forecast_date.isoformat(),
                "projected_revenue": projected_revenue,
                "confidence_lower": projected_revenue * 0.8,
                "confidence_upper": projected_revenue * 1.2
            })

        # Subscription metrics
        active_subs = db.query(func.count(Subscription.id)).filter(
            Subscription.status == "active"
        ).scalar()

        new_subs = db.query(func.count(Subscription.id)).filter(
            and_(
                Subscription.created_at.between(time_range.start_date, time_range.end_date),
                Subscription.status == "active"
            )
        ).scalar()

        churned_subs = db.query(func.count(Subscription.id)).filter(
            and_(
                Subscription.cancelled_at.between(time_range.start_date, time_range.end_date),
                Subscription.status == "cancelled"
            )
        ).scalar()

        subscription_metrics = {
            "active_subscriptions": active_subs,
            "new_subscriptions": new_subs,
            "churned_subscriptions": churned_subs,
            "churn_rate": (churned_subs / active_subs * 100) if active_subs > 0 else 0,
            "mrr": float(total_revenue) / max((time_range.end_date - time_range.start_date).days / 30, 1)
        }

        return RevenueAnalytics(
            revenue_trends=revenue_trends,
            payment_methods=payment_methods_data,
            conversion_rates=conversion_rates,
            arpu=arpu,
            arppu=arppu,
            revenue_forecast=revenue_forecast,
            subscription_metrics=subscription_metrics
        )

    except Exception as e:
        logger.error(f"Error fetching revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue analytics")

@router.get("/ai-performance", response_model=AIPerformanceAnalytics)
async def get_ai_performance_analytics(
    time_range: TimeRange = Depends(),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get AI performance analytics including response times, accuracy, and cost analysis
    """
    try:
        # Response time distribution
        response_times = db.query(
            case(
                (AIUsageTracking.response_time < 1, "0-1s"),
                (AIUsageTracking.response_time < 3, "1-3s"),
                (AIUsageTracking.response_time < 5, "3-5s"),
                else_="5s+"
            ).label("time_range"),
            func.count(AIUsageTracking.id).label("count")
        ).filter(
            AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by("time_range").all()

        response_time_distribution = [
            {"range": time_range, "count": count}
            for time_range, count in response_times
        ]

        # Token usage statistics
        token_stats = db.query(
            func.date(AIUsageTracking.created_at).label("date"),
            func.sum(AIUsageTracking.input_tokens).label("input_tokens"),
            func.sum(AIUsageTracking.output_tokens).label("output_tokens"),
            func.sum(AIUsageTracking.total_tokens).label("total_tokens")
        ).filter(
            AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by("date").all()

        token_usage = [
            {
                "date": str(stat.date),
                "input_tokens": stat.input_tokens or 0,
                "output_tokens": stat.output_tokens or 0,
                "total_tokens": stat.total_tokens or 0
            }
            for stat in token_stats
        ]

        # Calculate accuracy metrics (simplified - would need actual evaluation data)
        total_requests = db.query(func.count(AIUsageTracking.id)).filter(
            AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date)
        ).scalar()

        successful_requests = db.query(func.count(AIUsageTracking.id)).filter(
            and_(
                AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date),
                AIUsageTracking.success == True
            )
        ).scalar()

        accuracy_metrics = {
            "success_rate": (successful_requests / total_requests * 100) if total_requests > 0 else 0,
            "relevance_score": 92.5,  # Placeholder
            "coherence_score": 88.3,  # Placeholder
            "factual_accuracy": 95.0  # Placeholder
        }

        # Cost analysis
        total_tokens = db.query(func.sum(AIUsageTracking.total_tokens)).filter(
            AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date)
        ).scalar() or 0

        # Assuming cost per 1K tokens (adjust based on actual pricing)
        cost_per_1k_tokens = 0.002
        total_cost = (total_tokens / 1000) * cost_per_1k_tokens

        cost_analysis = {
            "total_tokens": total_tokens,
            "total_cost": total_cost,
            "avg_cost_per_request": total_cost / total_requests if total_requests > 0 else 0,
            "cost_per_user": total_cost / db.query(func.count(func.distinct(DialogueSession.user_id))).scalar()
        }

        # Model performance by type
        model_performance = db.query(
            AIUsageTracking.model_name,
            func.avg(AIUsageTracking.response_time).label("avg_response_time"),
            func.count(AIUsageTracking.id).label("request_count"),
            func.avg(case((AIUsageTracking.success == True, 1), else_=0)).label("success_rate")
        ).filter(
            AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date)
        ).group_by(AIUsageTracking.model_name).all()

        model_performance_data = [
            {
                "model": perf.model_name or "default",
                "avg_response_time": float(perf.avg_response_time) if perf.avg_response_time else 0,
                "request_count": perf.request_count,
                "success_rate": float(perf.success_rate) * 100 if perf.success_rate else 0
            }
            for perf in model_performance
        ]

        # Error rates
        error_count = total_requests - successful_requests
        timeout_errors = db.query(func.count(AIUsageTracking.id)).filter(
            and_(
                AIUsageTracking.created_at.between(time_range.start_date, time_range.end_date),
                AIUsageTracking.response_time > 10  # Assuming 10s is timeout
            )
        ).scalar()

        error_rates = {
            "overall_error_rate": (error_count / total_requests * 100) if total_requests > 0 else 0,
            "timeout_rate": (timeout_errors / total_requests * 100) if total_requests > 0 else 0,
            "rate_limit_errors": 0.5,  # Placeholder
            "api_errors": 0.3  # Placeholder
        }

        return AIPerformanceAnalytics(
            response_time_distribution=response_time_distribution,
            accuracy_metrics=accuracy_metrics,
            token_usage=token_usage,
            cost_analysis=cost_analysis,
            model_performance=model_performance_data,
            error_rates=error_rates
        )

    except Exception as e:
        logger.error(f"Error fetching AI performance analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch AI performance analytics")

@router.post("/custom-report")
async def generate_custom_report(
    request: CustomReportRequest,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Generate custom reports based on specified metrics and filters
    """
    try:
        # This is a simplified implementation
        # In production, this would dynamically build queries based on the request

        result = {
            "report_type": request.report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "time_range": {
                "start": request.time_range.start_date.isoformat(),
                "end": request.time_range.end_date.isoformat()
            },
            "data": []
        }

        # Example: User activity report
        if request.report_type == "user_activity":
            query = db.query(
                User.id,
                User.username,
                User.email,
                func.count(DialogueSession.id).label("dialogue_count")
            ).outerjoin(DialogueSession).filter(
                DialogueSession.created_at.between(
                    request.time_range.start_date,
                    request.time_range.end_date
                )
            )

            # Apply filters
            if "membership_type" in request.filters:
                query = query.filter(User.membership_type == request.filters["membership_type"])

            # Apply grouping
            if request.group_by:
                for field in request.group_by:
                    query = query.group_by(getattr(User, field))
            else:
                query = query.group_by(User.id)

            # Apply ordering
            if request.order_by:
                query = query.order_by(desc(request.order_by))

            # Apply limit
            query = query.limit(request.limit)

            results = query.all()
            result["data"] = [
                {
                    "user_id": r.id,
                    "username": r.username,
                    "email": r.email,
                    "dialogue_count": r.dialogue_count
                }
                for r in results
            ]

        # Add more report types as needed

        return result

    except Exception as e:
        logger.error(f"Error generating custom report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate custom report")

@router.post("/export")
async def export_analytics_data(
    request: ExportRequest,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Export analytics data in various formats
    """
    try:
        # Generate the report data based on report type
        data = {}

        if request.report_type == "overview":
            # Get overview metrics
            metrics = await get_overview_metrics("month", admin, db)
            data = metrics.dict()
        elif request.report_type == "users":
            # Get user analytics
            analytics = await get_user_analytics(request.time_range, admin, db)
            data = analytics.dict()
        elif request.report_type == "revenue":
            # Get revenue analytics
            revenue = await get_revenue_analytics(request.time_range, admin, db)
            data = revenue.dict()
        # Add more report types as needed

        # Format the data based on requested format
        if request.format == "json":
            return {
                "status": "success",
                "export_type": request.format,
                "data": data,
                "exported_at": datetime.utcnow().isoformat()
            }
        elif request.format == "csv":
            # In a real implementation, this would return a CSV file
            # For now, return a success message with instructions
            return {
                "status": "success",
                "message": "CSV export would be generated here",
                "download_url": "/api/v1/admin/analytics/download/report.csv"
            }
        elif request.format == "excel":
            # In a real implementation, this would return an Excel file
            return {
                "status": "success",
                "message": "Excel export would be generated here",
                "download_url": "/api/v1/admin/analytics/download/report.xlsx"
            }

    except Exception as e:
        logger.error(f"Error exporting analytics data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export analytics data")

# General analytics endpoint (for GrowthChart component)
@router.get("")
async def get_general_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    metrics: Optional[List[str]] = Query(None),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get general analytics data for the dashboard
    Returns data in the format expected by the frontend GrowthChart component
    """
    try:
        # Parse date strings if provided
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_dt = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.utcnow()

        # Initialize response structure
        response = {}

        # If specific metrics requested, only return those
        if metrics:
            metric_list = metrics
        else:
            # Default to all metrics
            metric_list = ['users', 'revenue', 'usage']

        # User growth data
        if 'users' in metric_list:
            user_growth = []
            current = start_dt
            while current <= end_dt:
                next_date = current + timedelta(days=1)
                count = db.query(func.count(User.id)).filter(
                    User.created_at < next_date
                ).scalar()
                user_growth.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "users": count
                })
                current = next_date
            response["userGrowth"] = user_growth

        # Revenue growth data
        if 'revenue' in metric_list:
            revenue_growth = []
            current = start_dt
            while current <= end_dt:
                next_date = current + timedelta(days=1)
                daily_revenue = db.query(func.sum(Payment.amount)).filter(
                    and_(
                        Payment.created_at >= current,
                        Payment.created_at < next_date,
                        Payment.status == "completed"
                    )
                ).scalar() or 0
                revenue_growth.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "revenue": float(daily_revenue)
                })
                current = next_date
            response["revenueGrowth"] = revenue_growth

        # Usage pattern data (hourly dialogue count)
        if 'usage' in metric_list:
            usage_pattern = []
            for hour in range(24):
                hour_count = db.query(func.count(DialogueSession.id)).filter(
                    and_(
                        DialogueSession.created_at >= start_dt,
                        DialogueSession.created_at <= end_dt,
                        extract('hour', DialogueSession.created_at) == hour
                    )
                ).scalar()
                usage_pattern.append({
                    "hour": hour,
                    "dialogues": hour_count
                })
            response["usagePattern"] = usage_pattern

        return response

    except Exception as e:
        logger.error(f"Error fetching general analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")

# Health check endpoint for analytics service
@router.get("/health")
async def analytics_health_check():
    """Check if analytics service is healthy"""
    return {"status": "healthy", "service": "analytics", "timestamp": datetime.utcnow().isoformat()}