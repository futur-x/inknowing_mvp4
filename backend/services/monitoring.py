"""
Monitoring service for system metrics, alerts, and health checks
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from collections import defaultdict

from fastapi import HTTPException, status
from sqlmodel import select, func, and_, or_, desc, asc
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from redis import Redis

from backend.models.monitoring import (
    SystemAlert,
    SystemMetric,
    ApiHealthCheck,
    AlertSeverity,
    AlertType,
    AlertStatus
)
from backend.models.user import User
from backend.models.dialogue import DialogueSession, DialogueMessage, AIUsageTracking
from backend.models.book import Book
from backend.models.upload import Upload
from backend.models.payment import Payment
from backend.core.cache import cache_manager
from backend.core.logger import get_logger

logger = get_logger(__name__)


class MonitoringService:
    """Service for system monitoring and alerting"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager

    # ==================== Real-time Metrics ====================
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get current real-time system metrics"""
        try:
            now = datetime.utcnow()

            # Online users (active in last 5 minutes)
            stmt = select(func.count(User.id)).where(
                User.last_active > now - timedelta(minutes=5)
            )
            result = await self.db.execute(stmt)
            online_users = result.scalar() or 0

            # Active dialogues (with recent activity)
            stmt = select(func.count(DialogueSession.id)).where(
                and_(
                    DialogueSession.status == "active",
                    DialogueSession.last_message_at > now - timedelta(minutes=30)
                )
            )
            result = await self.db.execute(stmt)
            active_dialogues = result.scalar() or 0

            # API health status
            api_health = await self.get_api_health_status()

            # System resource metrics (from cache or system monitoring)
            system_load = await self.cache.get("system:load_avg")
            memory_usage = await self.cache.get("system:memory_usage")
            db_connections = await self.cache.get("system:db_connections")

            return {
                "online_users": online_users,
                "active_dialogues": active_dialogues,
                "api_health": api_health,
                "system_load": system_load,
                "memory_usage": memory_usage,
                "database_connections": db_connections or 0
            }

        except Exception as e:
            logger.error(f"Error getting real-time metrics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve real-time metrics"
            )

    async def get_today_stats(self) -> Dict[str, Any]:
        """Get today's statistics"""
        try:
            now = datetime.utcnow()
            today_start = datetime(now.year, now.month, now.day)

            # New users today
            stmt = select(func.count(User.id)).where(User.created_at >= today_start)
            result = await self.db.execute(stmt)
            new_users = result.scalar() or 0

            # Total dialogues today
            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.created_at >= today_start
            )
            result = await self.db.execute(stmt)
            total_dialogues = result.scalar() or 0

            # New books today
            stmt = select(func.count(Book.id)).where(Book.created_at >= today_start)
            result = await self.db.execute(stmt)
            new_books = result.scalar() or 0

            # API costs today
            stmt = text("""
                SELECT COALESCE(SUM(
                    CASE
                        WHEN input_tokens > 0 THEN (input_tokens * 0.0015 / 1000)
                        ELSE 0
                    END +
                    CASE
                        WHEN output_tokens > 0 THEN (output_tokens * 0.002 / 1000)
                        ELSE 0
                    END
                ), 0) as cost
                FROM ai_usage_tracking
                WHERE created_at >= :today_start
            """)
            result = await self.db.execute(stmt, {"today_start": today_start})
            api_cost = result.scalar() or 0.0

            # Revenue today (from completed payments)
            stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
                and_(
                    Payment.created_at >= today_start,
                    Payment.status == "completed"
                )
            )
            result = await self.db.execute(stmt)
            revenue = result.scalar() or 0.0

            # Upload count today
            stmt = select(func.count(Upload.id)).where(
                Upload.created_at >= today_start
            )
            result = await self.db.execute(stmt)
            upload_count = result.scalar() or 0

            # Error count today (from alerts)
            stmt = select(func.count(SystemAlert.id)).where(
                and_(
                    SystemAlert.created_at >= today_start,
                    SystemAlert.severity.in_([AlertSeverity.ERROR, AlertSeverity.CRITICAL])
                )
            )
            result = await self.db.execute(stmt)
            error_count = result.scalar() or 0

            return {
                "new_users": new_users,
                "total_dialogues": total_dialogues,
                "new_books": new_books,
                "api_cost": round(api_cost, 4),
                "revenue": float(revenue),
                "upload_count": upload_count,
                "error_count": error_count
            }

        except Exception as e:
            logger.error(f"Error getting today's stats: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve today's statistics"
            )

    async def get_trending_data(self) -> Dict[str, Any]:
        """Get trending data for dashboard"""
        try:
            # Top books by dialogue count (last 7 days)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)

            stmt = text("""
                SELECT b.id, b.title, COUNT(ds.id) as dialogue_count
                FROM books b
                JOIN dialogue_sessions ds ON ds.book_id = b.id
                WHERE ds.created_at >= :seven_days_ago
                GROUP BY b.id, b.title
                ORDER BY dialogue_count DESC
                LIMIT 10
            """)
            result = await self.db.execute(stmt, {"seven_days_ago": seven_days_ago})
            top_books_rows = result.fetchall()
            top_books = [
                {
                    "book_id": row.id,
                    "title": row.title,
                    "dialogue_count": row.dialogue_count
                }
                for row in top_books_rows
            ]

            # Top questions (most common dialogue starters)
            stmt = text("""
                SELECT
                    LEFT(dm.content, 100) as question,
                    COUNT(*) as count
                FROM dialogue_messages dm
                JOIN dialogue_sessions ds ON ds.id = dm.session_id
                WHERE dm.role = 'user'
                    AND dm.created_at >= :seven_days_ago
                    AND dm.content IS NOT NULL
                    AND LENGTH(dm.content) > 10
                GROUP BY LEFT(dm.content, 100)
                ORDER BY count DESC
                LIMIT 10
            """)
            result = await self.db.execute(stmt, {"seven_days_ago": seven_days_ago})
            top_questions_rows = result.fetchall()
            top_questions = [
                {
                    "question": row.question + ("..." if len(row.question) == 100 else ""),
                    "count": row.count
                }
                for row in top_questions_rows
            ]

            # Popular categories
            stmt = text("""
                SELECT b.category, COUNT(ds.id) as dialogue_count
                FROM books b
                JOIN dialogue_sessions ds ON ds.book_id = b.id
                WHERE ds.created_at >= :seven_days_ago
                    AND b.category IS NOT NULL
                GROUP BY b.category
                ORDER BY dialogue_count DESC
                LIMIT 5
            """)
            result = await self.db.execute(stmt, {"seven_days_ago": seven_days_ago})
            categories_rows = result.fetchall()
            popular_categories = [
                {
                    "category": row.category,
                    "dialogue_count": row.dialogue_count
                }
                for row in categories_rows
            ]

            return {
                "top_books": top_books,
                "top_questions": top_questions,
                "popular_categories": popular_categories
            }

        except Exception as e:
            logger.error(f"Error getting trending data: {e}")
            return {
                "top_books": [],
                "top_questions": [],
                "popular_categories": []
            }

    # ==================== System Alerts ====================
    async def create_alert(
        self,
        severity: AlertSeverity,
        type: AlertType,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None
    ) -> SystemAlert:
        """Create a new system alert"""
        try:
            alert = SystemAlert(
                severity=severity,
                type=type,
                message=message,
                details=details,
                source=source
            )

            self.db.add(alert)
            await self.db.commit()
            await self.db.refresh(alert)

            # Cache the alert for real-time access
            await self.cache.set(
                f"alert:{alert.id}",
                alert.dict(),
                expire=86400  # 24 hours
            )

            # Increment alert counter
            await self.cache.incr(f"alerts:count:{severity}")

            logger.info(f"Created {severity} alert: {message}")
            return alert

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating alert: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create alert"
            )

    async def get_alerts(
        self,
        severity: Optional[AlertSeverity] = None,
        alert_type: Optional[AlertType] = None,
        status: AlertStatus = AlertStatus.ACTIVE,
        limit: int = 50
    ) -> List[SystemAlert]:
        """Get system alerts with filters"""
        try:
            conditions = []

            if severity:
                conditions.append(SystemAlert.severity == severity)
            if alert_type:
                conditions.append(SystemAlert.type == alert_type)
            if status:
                conditions.append(SystemAlert.status == status)

            stmt = select(SystemAlert).where(and_(*conditions) if conditions else True)\
                .order_by(desc(SystemAlert.created_at))\
                .limit(limit)

            result = await self.db.execute(stmt)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve alerts"
            )

    async def update_alert_status(
        self,
        alert_id: str,
        status: AlertStatus,
        admin_id: Optional[str] = None,
        resolution_notes: Optional[str] = None
    ) -> SystemAlert:
        """Update alert status"""
        try:
            stmt = select(SystemAlert).where(SystemAlert.id == alert_id)
            result = await self.db.execute(stmt)
            alert = result.scalar_one_or_none()

            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alert not found"
                )

            alert.status = status

            if status == AlertStatus.ACKNOWLEDGED:
                alert.acknowledged_at = datetime.utcnow()
                alert.acknowledged_by = admin_id
            elif status == AlertStatus.RESOLVED:
                alert.resolved_at = datetime.utcnow()
                alert.resolved_by = admin_id
                alert.resolution_notes = resolution_notes

            await self.db.commit()
            await self.db.refresh(alert)

            # Update cache
            await self.cache.set(f"alert:{alert.id}", alert.dict(), expire=86400)

            return alert

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating alert status: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update alert status"
            )

    # ==================== API Health Monitoring ====================
    async def get_api_health_status(self) -> Dict[str, Dict[str, Any]]:
        """Get API health status for all services"""
        try:
            # Get recent health checks (last 5 minutes)
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)

            stmt = select(ApiHealthCheck).where(
                ApiHealthCheck.checked_at >= five_minutes_ago
            ).order_by(desc(ApiHealthCheck.checked_at))

            result = await self.db.execute(stmt)
            health_checks = result.scalars().all()

            # Group by service and get latest status
            services = {}
            for check in health_checks:
                if check.service_name not in services:
                    services[check.service_name] = {
                        "status": check.status,
                        "latency": check.response_time,
                        "last_check": check.checked_at.isoformat(),
                        "error_message": check.error_message
                    }

            # Add default services if no recent checks
            default_services = ["auth", "dialogue", "upload", "payment", "admin"]
            for service in default_services:
                if service not in services:
                    services[service] = {
                        "status": "unknown",
                        "latency": 0,
                        "last_check": datetime.utcnow().isoformat(),
                        "error_message": "No recent health checks"
                    }

            return services

        except Exception as e:
            logger.error(f"Error getting API health status: {e}")
            return {}

    async def record_health_check(
        self,
        service_name: str,
        endpoint: str,
        status: str,
        response_time: float,
        error_message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> ApiHealthCheck:
        """Record a health check result"""
        try:
            health_check = ApiHealthCheck(
                service_name=service_name,
                endpoint=endpoint,
                status=status,
                response_time=response_time,
                error_message=error_message,
                details=details
            )

            self.db.add(health_check)
            await self.db.commit()
            await self.db.refresh(health_check)

            # Create alert for unhealthy services
            if status in ["degraded", "down"]:
                await self.create_alert(
                    severity=AlertSeverity.ERROR if status == "degraded" else AlertSeverity.CRITICAL,
                    type=AlertType.API_FAILURE,
                    message=f"Service {service_name} is {status}",
                    details={
                        "endpoint": endpoint,
                        "response_time": response_time,
                        "error": error_message
                    },
                    source="health_monitor"
                )

            return health_check

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording health check: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record health check"
            )

    # ==================== Metrics Collection ====================
    async def record_metric(
        self,
        metric_name: str,
        value: float,
        metric_type: str = "gauge",
        tags: Optional[Dict[str, str]] = None,
        source: Optional[str] = None
    ) -> SystemMetric:
        """Record a system metric"""
        try:
            metric = SystemMetric(
                metric_name=metric_name,
                metric_type=metric_type,
                value=value,
                tags=tags,
                source=source
            )

            self.db.add(metric)
            await self.db.commit()
            await self.db.refresh(metric)

            # Cache latest metric value for real-time access
            cache_key = f"metric:{metric_name}"
            if tags:
                tag_str = ":".join(f"{k}={v}" for k, v in tags.items())
                cache_key += f":{tag_str}"

            await self.cache.set(cache_key, value, expire=3600)  # 1 hour

            return metric

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error recording metric {metric_name}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record metric"
            )

    async def get_metrics(
        self,
        metric_names: List[str],
        start_time: datetime,
        end_time: datetime,
        tags: Optional[Dict[str, str]] = None,
        aggregation: str = "avg"
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Query metrics data"""
        try:
            results = {}

            for metric_name in metric_names:
                conditions = [
                    SystemMetric.metric_name == metric_name,
                    SystemMetric.timestamp >= start_time,
                    SystemMetric.timestamp <= end_time
                ]

                if tags:
                    # Simple tag filtering - in production would use proper JSONB queries
                    pass  # Skip complex tag filtering for now

                stmt = select(SystemMetric).where(and_(*conditions))\
                    .order_by(SystemMetric.timestamp)

                result = await self.db.execute(stmt)
                metrics = result.scalars().all()

                # Apply aggregation if needed
                data_points = []
                for metric in metrics:
                    data_points.append({
                        "timestamp": metric.timestamp.isoformat(),
                        "value": metric.value,
                        "tags": metric.tags
                    })

                results[metric_name] = data_points

            return results

        except Exception as e:
            logger.error(f"Error querying metrics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to query metrics"
            )

    # ==================== Enhanced Statistics ====================
    async def get_enhanced_cost_statistics(
        self,
        period: str = "month",
        group_by: str = "model"
    ) -> Dict[str, Any]:
        """Get enhanced cost statistics with better breakdown"""
        try:
            # Calculate period boundaries
            now = datetime.utcnow()
            if period == "today":
                start_time = datetime(now.year, now.month, now.day)
            elif period == "week":
                start_time = now - timedelta(days=7)
            elif period == "month":
                start_time = now - timedelta(days=30)
            elif period == "year":
                start_time = now - timedelta(days=365)
            else:
                start_time = now - timedelta(days=30)

            # Get cost data
            if group_by == "model":
                stmt = text("""
                    SELECT
                        model_used as category,
                        SUM(
                            (input_tokens * 0.0015 / 1000) +
                            (output_tokens * 0.002 / 1000)
                        ) as cost,
                        COUNT(*) as count
                    FROM ai_usage_tracking
                    WHERE created_at >= :start_time
                    GROUP BY model_used
                    ORDER BY cost DESC
                """)
            else:
                # Default grouping
                stmt = text("""
                    SELECT
                        'dialogue' as category,
                        SUM(
                            (input_tokens * 0.0015 / 1000) +
                            (output_tokens * 0.002 / 1000)
                        ) as cost,
                        COUNT(*) as count
                    FROM ai_usage_tracking
                    WHERE created_at >= :start_time
                """)

            result = await self.db.execute(stmt, {"start_time": start_time})
            cost_rows = result.fetchall()

            total_cost = sum(row.cost for row in cost_rows)

            breakdown = []
            for row in cost_rows:
                percentage = (row.cost / total_cost * 100) if total_cost > 0 else 0
                breakdown.append({
                    "category": row.category,
                    "cost": round(row.cost, 4),
                    "percentage": round(percentage, 2),
                    "count": row.count
                })

            # Generate trend data (simplified)
            trend = []
            for i in range(7):  # Last 7 days
                day = now - timedelta(days=i)
                trend.append({
                    "date": day.strftime("%Y-%m-%d"),
                    "cost": round(total_cost / 7, 4)  # Simplified
                })

            # Projection
            daily_avg = total_cost / max((now - start_time).days, 1)
            monthly_projection = daily_avg * 30

            return {
                "period": period,
                "total_cost": round(total_cost, 4),
                "breakdown": breakdown,
                "trend": trend,
                "projection": {
                    "estimated_monthly": round(monthly_projection, 4),
                    "budget_status": "on_track",  # Simplified
                    "current_burn_rate": round(daily_avg, 4),
                    "days_until_budget_exceeded": None
                }
            }

        except Exception as e:
            logger.error(f"Error getting cost statistics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve cost statistics"
            )

    async def get_user_growth_trend(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get user growth trend data"""
        try:
            # Get daily user registrations
            stmt = text("""
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users
                WHERE created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE(created_at)
                ORDER BY date
            """)

            result = await self.db.execute(stmt, {
                "start_date": start_date,
                "end_date": end_date
            })

            data = []
            for row in result:
                data.append({
                    "date": row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                    "count": row.count
                })

            return data

        except Exception as e:
            logger.error(f"Error getting user growth trend: {e}")
            return []

    async def get_dialogue_trend(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get dialogue trend data"""
        try:
            stmt = text("""
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM dialogue_sessions
                WHERE created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE(created_at)
                ORDER BY date
            """)

            result = await self.db.execute(stmt, {
                "start_date": start_date,
                "end_date": end_date
            })

            data = []
            for row in result:
                data.append({
                    "date": row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                    "count": row.count
                })

            return data

        except Exception as e:
            logger.error(f"Error getting dialogue trend: {e}")
            return []

    async def get_book_category_distribution(self) -> List[Dict[str, Any]]:
        """Get book distribution by category"""
        try:
            stmt = text("""
                SELECT category, COUNT(*) as count
                FROM books
                WHERE status = 'active' AND category IS NOT NULL
                GROUP BY category
                ORDER BY count DESC
            """)

            result = await self.db.execute(stmt)

            data = []
            for row in result:
                data.append({
                    "category": row.category,
                    "count": row.count
                })

            return data

        except Exception as e:
            logger.error(f"Error getting book category distribution: {e}")
            return []

    async def get_user_activity_heatmap(self, days: int = 7) -> Dict[str, List[int]]:
        """Get user activity heatmap data"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)

            # Get hourly activity for the past N days
            stmt = text("""
                SELECT
                    EXTRACT(DOW FROM created_at) as day_of_week,
                    EXTRACT(HOUR FROM created_at) as hour,
                    COUNT(*) as count
                FROM dialogue_messages
                WHERE created_at >= :start_date
                GROUP BY day_of_week, hour
                ORDER BY day_of_week, hour
            """)

            result = await self.db.execute(stmt, {"start_date": start_date})

            # Initialize heatmap data (7 days x 24 hours)
            heatmap = {}
            days_of_week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            for day in days_of_week:
                heatmap[day] = [0] * 24

            # Fill in the data
            for row in result:
                day_idx = int(row.day_of_week)
                hour = int(row.hour)
                count = row.count
                heatmap[days_of_week[day_idx]][hour] = count

            return heatmap

        except Exception as e:
            logger.error(f"Error getting user activity heatmap: {e}")
            return {}

    async def get_system_announcements(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get system announcements"""
        try:
            # For now, return static announcements
            # In production, these would come from a database table
            announcements = [
                {
                    "id": "1",
                    "type": "info",
                    "title": "系统维护通知",
                    "content": "系统将于本周日凌晨2点进行例行维护",
                    "created_at": datetime.utcnow().isoformat()
                },
                {
                    "id": "2",
                    "type": "success",
                    "title": "新功能上线",
                    "content": "AI对话功能已全面升级，体验更流畅",
                    "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
                }
            ]

            return announcements[:limit]

        except Exception as e:
            logger.error(f"Error getting system announcements: {e}")
            return []