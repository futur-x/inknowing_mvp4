"""
Alert management service for monitoring and notifications
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update, func
from enum import Enum

from backend.models.monitoring import (
    SystemAlert, AlertSeverity, AlertType, AlertStatus,
    AlertRule, SystemMetric
)
from backend.services.logging_service import logging_service


class AlertEvaluator:
    """Evaluates alert rules against metrics"""

    def __init__(self):
        self.evaluation_cache = {}

    async def evaluate_rules(self, session: AsyncSession):
        """Evaluate all active alert rules"""
        # Get active rules
        result = await session.execute(
            select(AlertRule).where(AlertRule.enabled == True)
        )
        rules = result.scalars().all()

        for rule in rules:
            await self.evaluate_rule(session, rule)

    async def evaluate_rule(self, session: AsyncSession, rule: AlertRule):
        """Evaluate a single alert rule"""
        try:
            # Get recent metrics for the rule
            since = datetime.utcnow() - timedelta(seconds=rule.duration)
            result = await session.execute(
                select(SystemMetric).where(
                    and_(
                        SystemMetric.metric_name == rule.metric_name,
                        SystemMetric.timestamp >= since
                    )
                ).order_by(SystemMetric.timestamp.desc())
            )
            metrics = result.scalars().all()

            if not metrics:
                return

            # Check if condition is met
            should_alert = self._check_condition(metrics, rule)

            # Check if we should create a new alert
            if should_alert:
                await self._create_alert_if_needed(session, rule, metrics[0])

        except Exception as e:
            await logging_service.log_error(
                session,
                e,
                "alert_evaluator",
                metadata={"rule_id": rule.id, "rule_name": rule.name}
            )

    def _check_condition(self, metrics: List[SystemMetric], rule: AlertRule) -> bool:
        """Check if metrics meet the alert condition"""
        if not metrics:
            return False

        # Get average value for the duration
        avg_value = sum(m.value for m in metrics) / len(metrics)

        # Evaluate condition
        if rule.condition == "greater_than":
            return avg_value > rule.threshold
        elif rule.condition == "less_than":
            return avg_value < rule.threshold
        elif rule.condition == "equals":
            return abs(avg_value - rule.threshold) < 0.001
        else:
            return False

    async def _create_alert_if_needed(
        self,
        session: AsyncSession,
        rule: AlertRule,
        metric: SystemMetric
    ):
        """Create an alert if there isn't already an active one for this rule"""
        # Check for existing active alert for this rule
        cache_key = f"{rule.id}_{rule.metric_name}"
        if cache_key in self.evaluation_cache:
            last_alert_time = self.evaluation_cache[cache_key]
            if datetime.utcnow() - last_alert_time < timedelta(minutes=5):
                return  # Don't create duplicate alerts within 5 minutes

        # Create new alert
        alert = SystemAlert(
            severity=rule.severity,
            type=AlertType.SYSTEM_PERFORMANCE,
            message=f"Alert: {rule.name} - {rule.description}",
            details={
                "rule_id": rule.id,
                "metric_name": rule.metric_name,
                "metric_value": metric.value,
                "threshold": rule.threshold,
                "condition": rule.condition
            },
            status=AlertStatus.ACTIVE,
            source="alert_evaluator"
        )
        session.add(alert)
        await session.flush()

        # Update cache
        self.evaluation_cache[cache_key] = datetime.utcnow()

        # Send notifications if configured
        if rule.notification_channels:
            await self._send_notifications(alert, rule.notification_channels)

    async def _send_notifications(self, alert: SystemAlert, channels: Dict[str, Any]):
        """Send alert notifications through configured channels"""
        # This would integrate with notification services
        # For now, just log it
        print(f"ALERT: {alert.severity} - {alert.message}")


class AlertService:
    """Service for managing alerts"""

    def __init__(self):
        self.evaluator = AlertEvaluator()

    async def create_alert(
        self,
        session: AsyncSession,
        severity: AlertSeverity,
        alert_type: AlertType,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None
    ) -> SystemAlert:
        """Create a new alert"""
        alert = SystemAlert(
            severity=severity,
            type=alert_type,
            message=message,
            details=details,
            status=AlertStatus.ACTIVE,
            source=source
        )
        session.add(alert)
        await session.flush()
        return alert

    async def get_alerts(
        self,
        session: AsyncSession,
        status: Optional[AlertStatus] = None,
        severity: Optional[AlertSeverity] = None,
        alert_type: Optional[AlertType] = None,
        start_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[SystemAlert]:
        """Get alerts with filtering"""
        query = select(SystemAlert)

        conditions = []
        if status:
            conditions.append(SystemAlert.status == status)
        if severity:
            conditions.append(SystemAlert.severity == severity)
        if alert_type:
            conditions.append(SystemAlert.type == alert_type)
        if start_time:
            conditions.append(SystemAlert.created_at >= start_time)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(SystemAlert.created_at.desc()).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def acknowledge_alert(
        self,
        session: AsyncSession,
        alert_id: str,
        admin_id: str
    ) -> SystemAlert:
        """Acknowledge an alert"""
        alert = await session.get(SystemAlert, alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = admin_id

        await session.flush()
        return alert

    async def resolve_alert(
        self,
        session: AsyncSession,
        alert_id: str,
        admin_id: str,
        resolution_notes: Optional[str] = None
    ) -> SystemAlert:
        """Resolve an alert"""
        alert = await session.get(SystemAlert, alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = admin_id
        alert.resolution_notes = resolution_notes

        await session.flush()
        return alert

    async def create_alert_rule(
        self,
        session: AsyncSession,
        name: str,
        description: str,
        metric_name: str,
        condition: str,
        threshold: float,
        severity: AlertSeverity,
        duration: int = 60,
        notification_channels: Optional[Dict[str, Any]] = None
    ) -> AlertRule:
        """Create a new alert rule"""
        rule = AlertRule(
            name=name,
            description=description,
            metric_name=metric_name,
            condition=condition,
            threshold=threshold,
            duration=duration,
            severity=severity,
            enabled=True,
            notification_channels=notification_channels
        )
        session.add(rule)
        await session.flush()
        return rule

    async def update_alert_rule(
        self,
        session: AsyncSession,
        rule_id: str,
        **updates
    ) -> AlertRule:
        """Update an alert rule"""
        rule = await session.get(AlertRule, rule_id)
        if not rule:
            raise ValueError(f"Alert rule {rule_id} not found")

        for key, value in updates.items():
            if hasattr(rule, key):
                setattr(rule, key, value)

        rule.updated_at = datetime.utcnow()
        await session.flush()
        return rule

    async def delete_alert_rule(
        self,
        session: AsyncSession,
        rule_id: str
    ):
        """Delete an alert rule"""
        rule = await session.get(AlertRule, rule_id)
        if not rule:
            raise ValueError(f"Alert rule {rule_id} not found")

        await session.delete(rule)
        await session.flush()

    async def get_alert_rules(
        self,
        session: AsyncSession,
        enabled: Optional[bool] = None
    ) -> List[AlertRule]:
        """Get all alert rules"""
        query = select(AlertRule)
        if enabled is not None:
            query = query.where(AlertRule.enabled == enabled)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_alert_statistics(
        self,
        session: AsyncSession,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Get alert statistics for dashboard"""
        since = datetime.utcnow() - timedelta(hours=hours)

        # Count alerts by status
        active_count = await session.execute(
            select(func.count()).select_from(SystemAlert).where(
                and_(
                    SystemAlert.status == AlertStatus.ACTIVE,
                    SystemAlert.created_at >= since
                )
            )
        )

        acknowledged_count = await session.execute(
            select(func.count()).select_from(SystemAlert).where(
                and_(
                    SystemAlert.status == AlertStatus.ACKNOWLEDGED,
                    SystemAlert.created_at >= since
                )
            )
        )

        resolved_count = await session.execute(
            select(func.count()).select_from(SystemAlert).where(
                and_(
                    SystemAlert.status == AlertStatus.RESOLVED,
                    SystemAlert.created_at >= since
                )
            )
        )

        # Count by severity
        severity_counts = {}
        for severity in AlertSeverity:
            count_result = await session.execute(
                select(func.count()).select_from(SystemAlert).where(
                    and_(
                        SystemAlert.severity == severity,
                        SystemAlert.created_at >= since
                    )
                )
            )
            severity_counts[severity.value] = count_result.scalar() or 0

        return {
            "total_alerts": sum([
                active_count.scalar() or 0,
                acknowledged_count.scalar() or 0,
                resolved_count.scalar() or 0
            ]),
            "active_alerts": active_count.scalar() or 0,
            "acknowledged_alerts": acknowledged_count.scalar() or 0,
            "resolved_alerts": resolved_count.scalar() or 0,
            "alerts_by_severity": severity_counts,
            "time_range": f"Last {hours} hours"
        }


# Global alert service instance
alert_service = AlertService()