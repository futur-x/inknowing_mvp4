"""
Logging service for system-wide logging and audit trail
"""
import logging
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from contextlib import asynccontextmanager

from backend.models.monitoring import (
    SystemLog, LogLevel,
    SystemAlert, AlertSeverity, AlertStatus
)
from backend.models.admin import AuditLog


class LoggingService:
    """Service for managing system logs and audit trails"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def create_log(
        self,
        session: AsyncSession,
        level: LogLevel,
        message: str,
        source: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        stack_trace: Optional[str] = None
    ) -> SystemLog:
        """Create a system log entry"""
        log_entry = SystemLog(
            level=level,
            message=message,
            source=source,
            user_id=user_id,
            request_id=request_id,
            metadata=metadata,
            stack_trace=stack_trace
        )
        session.add(log_entry)
        await session.flush()
        return log_entry

    async def log_error(
        self,
        session: AsyncSession,
        error: Exception,
        source: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log an error with stack trace"""
        stack_trace = traceback.format_exc()

        await self.create_log(
            session,
            level=LogLevel.ERROR,
            message=str(error),
            source=source,
            user_id=user_id,
            request_id=request_id,
            metadata=metadata,
            stack_trace=stack_trace
        )

        # Create alert for critical errors
        if "critical" in str(error).lower() or "fatal" in str(error).lower():
            alert = SystemAlert(
                severity=AlertSeverity.CRITICAL,
                type="SYSTEM_PERFORMANCE",
                message=f"Critical error in {source}: {str(error)[:200]}",
                details={"source": source, "error_type": type(error).__name__},
                status=AlertStatus.ACTIVE,
                source=source
            )
            session.add(alert)

    async def create_audit_log(
        self,
        session: AsyncSession,
        admin_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Create an audit log entry for admin actions"""
        audit_entry = AuditLog(
            admin_id=admin_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(audit_entry)
        await session.flush()
        return audit_entry

    async def get_logs(
        self,
        session: AsyncSession,
        level: Optional[LogLevel] = None,
        source: Optional[str] = None,
        user_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[SystemLog]:
        """Get system logs with filtering"""
        query = select(SystemLog)

        # Apply filters
        conditions = []
        if level:
            conditions.append(SystemLog.level == level)
        if source:
            conditions.append(SystemLog.source == source)
        if user_id:
            conditions.append(SystemLog.user_id == user_id)
        if start_time:
            conditions.append(SystemLog.created_at >= start_time)
        if end_time:
            conditions.append(SystemLog.created_at <= end_time)

        if conditions:
            query = query.where(and_(*conditions))

        # Order by creation time desc and apply pagination
        query = query.order_by(desc(SystemLog.created_at)).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_audit_logs(
        self,
        session: AsyncSession,
        admin_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """Get audit logs with filtering"""
        query = select(AuditLog)

        # Apply filters
        conditions = []
        if admin_id:
            conditions.append(AuditLog.admin_id == admin_id)
        if action:
            conditions.append(AuditLog.action == action)
        if resource_type:
            conditions.append(AuditLog.resource_type == resource_type)
        if start_time:
            conditions.append(AuditLog.created_at >= start_time)
        if end_time:
            conditions.append(AuditLog.created_at <= end_time)

        if conditions:
            query = query.where(and_(*conditions))

        # Order by creation time desc and apply pagination
        query = query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def search_logs(
        self,
        session: AsyncSession,
        search_term: str,
        limit: int = 100
    ) -> List[SystemLog]:
        """Search logs by message content"""
        query = select(SystemLog).where(
            SystemLog.message.contains(search_term)
        ).order_by(desc(SystemLog.created_at)).limit(limit)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_error_summary(
        self,
        session: AsyncSession,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Get error summary for the specified time period"""
        start_time = datetime.utcnow() - timedelta(hours=hours)

        # Get error logs
        result = await session.execute(
            select(SystemLog).where(
                and_(
                    SystemLog.level.in_([LogLevel.ERROR, LogLevel.CRITICAL]),
                    SystemLog.created_at >= start_time
                )
            )
        )
        error_logs = result.scalars().all()

        # Group errors by source
        errors_by_source = {}
        for log in error_logs:
            if log.source not in errors_by_source:
                errors_by_source[log.source] = []
            errors_by_source[log.source].append({
                "message": log.message,
                "timestamp": log.created_at.isoformat(),
                "level": log.level
            })

        return {
            "total_errors": len(error_logs),
            "critical_errors": sum(1 for log in error_logs if log.level == LogLevel.CRITICAL),
            "errors_by_source": errors_by_source,
            "time_range": f"Last {hours} hours"
        }

    async def cleanup_old_logs(
        self,
        session: AsyncSession,
        days_to_keep: int = 30
    ):
        """Clean up old logs to manage storage"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        # Delete old system logs
        await session.execute(
            select(SystemLog).where(
                SystemLog.created_at < cutoff_date
            ).execution_options(synchronize_session="fetch")
        )

        # Keep audit logs longer (90 days)
        audit_cutoff = datetime.utcnow() - timedelta(days=90)
        await session.execute(
            select(AuditLog).where(
                AuditLog.created_at < audit_cutoff
            ).execution_options(synchronize_session="fetch")
        )

        await session.commit()


class LogStreamer:
    """Service for streaming logs in real-time"""

    def __init__(self):
        self.active_streams = {}
        self.logger = logging.getLogger(__name__)

    async def stream_logs(
        self,
        session: AsyncSession,
        stream_id: str,
        level: Optional[LogLevel] = None,
        source: Optional[str] = None
    ):
        """Stream logs in real-time"""
        last_id = None

        while stream_id in self.active_streams:
            try:
                query = select(SystemLog)

                conditions = []
                if last_id:
                    # Get logs created after the last one we sent
                    last_log = await session.get(SystemLog, last_id)
                    if last_log:
                        conditions.append(SystemLog.created_at > last_log.created_at)

                if level:
                    conditions.append(SystemLog.level == level)
                if source:
                    conditions.append(SystemLog.source == source)

                if conditions:
                    query = query.where(and_(*conditions))

                query = query.order_by(SystemLog.created_at).limit(10)

                result = await session.execute(query)
                new_logs = result.scalars().all()

                if new_logs:
                    last_id = new_logs[-1].id
                    yield [self._serialize_log(log) for log in new_logs]

                await asyncio.sleep(1)  # Poll every second

            except Exception as e:
                self.logger.error(f"Error in log stream: {e}")
                break

    def start_stream(self, stream_id: str):
        """Start a log stream"""
        self.active_streams[stream_id] = True

    def stop_stream(self, stream_id: str):
        """Stop a log stream"""
        if stream_id in self.active_streams:
            del self.active_streams[stream_id]

    def _serialize_log(self, log: SystemLog) -> Dict[str, Any]:
        """Serialize log entry for streaming"""
        return {
            "id": log.id,
            "level": log.level,
            "message": log.message,
            "source": log.source,
            "user_id": log.user_id,
            "request_id": log.request_id,
            "metadata": log.metadata,
            "stack_trace": log.stack_trace,
            "created_at": log.created_at.isoformat()
        }


# Global logging service instance
logging_service = LoggingService()
log_streamer = LogStreamer()