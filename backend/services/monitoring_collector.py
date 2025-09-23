"""
Monitoring data collector service
Collects system metrics, health checks, and performance data
"""
import asyncio
import psutil
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from redis import asyncio as aioredis
import logging

from backend.models.monitoring import (
    SystemMetric, ApiHealthCheck, SystemLog,
    LogLevel, AlertStatus, SystemAlert, AlertSeverity
)
from backend.models.dialogue import DialogueSession
from backend.models.user import User
from backend.config.database import get_db

logger = logging.getLogger(__name__)


class MonitoringCollector:
    """Collects various system metrics and health data"""

    def __init__(self, redis_client: Optional[aioredis.Redis] = None):
        self.redis = redis_client
        self.collection_interval = 60  # seconds
        self.is_running = False

    async def start_collection(self):
        """Start the monitoring collection loop"""
        self.is_running = True
        while self.is_running:
            try:
                await self.collect_all_metrics()
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                logger.error(f"Error in monitoring collection: {e}")
                await asyncio.sleep(self.collection_interval)

    async def stop_collection(self):
        """Stop the monitoring collection"""
        self.is_running = False

    async def collect_all_metrics(self):
        """Collect all system metrics"""
        async with get_session() as session:
            # System resource metrics
            await self.collect_system_metrics(session)

            # Database metrics
            await self.collect_database_metrics(session)

            # API performance metrics
            await self.collect_api_metrics(session)

            # Redis metrics
            if self.redis:
                await self.collect_redis_metrics(session)

            await session.commit()

    async def collect_system_metrics(self, session: AsyncSession):
        """Collect system resource metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            await self._save_metric(session, "system.cpu.usage", cpu_percent, "gauge")

            # Memory usage
            memory = psutil.virtual_memory()
            await self._save_metric(session, "system.memory.usage", memory.percent, "gauge")
            await self._save_metric(session, "system.memory.available", memory.available / (1024**3), "gauge")  # GB

            # Disk usage
            disk = psutil.disk_usage('/')
            await self._save_metric(session, "system.disk.usage", disk.percent, "gauge")
            await self._save_metric(session, "system.disk.free", disk.free / (1024**3), "gauge")  # GB

            # Network I/O
            net_io = psutil.net_io_counters()
            await self._save_metric(session, "system.network.bytes_sent", net_io.bytes_sent, "counter")
            await self._save_metric(session, "system.network.bytes_recv", net_io.bytes_recv, "counter")

            # Process count
            process_count = len(psutil.pids())
            await self._save_metric(session, "system.process.count", process_count, "gauge")

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

    async def collect_database_metrics(self, session: AsyncSession):
        """Collect database-related metrics"""
        try:
            # Active database connections (approximation)
            result = await session.execute(
                select(func.count()).select_from(
                    select(1).select_from(User).limit(1).subquery()
                )
            )
            db_responsive = result.scalar() is not None
            await self._save_metric(session, "database.responsive", 1 if db_responsive else 0, "gauge")

            # Count of recent queries (last minute)
            recent_time = datetime.utcnow() - timedelta(minutes=1)
            dialogue_count = await session.execute(
                select(func.count()).select_from(DialogueSession).where(
                    DialogueSession.created_at >= recent_time
                )
            )
            recent_queries = dialogue_count.scalar() or 0
            await self._save_metric(session, "database.queries.recent", recent_queries, "gauge")

            # Total users
            user_count = await session.execute(select(func.count()).select_from(User))
            total_users = user_count.scalar() or 0
            await self._save_metric(session, "database.users.total", total_users, "gauge")

        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")

    async def collect_api_metrics(self, session: AsyncSession):
        """Collect API performance metrics"""
        try:
            # Get recent API health checks
            recent_time = datetime.utcnow() - timedelta(minutes=5)
            result = await session.execute(
                select(ApiHealthCheck).where(
                    ApiHealthCheck.checked_at >= recent_time
                )
            )
            health_checks = result.scalars().all()

            if health_checks:
                # Average response time
                avg_response_time = sum(hc.response_time for hc in health_checks) / len(health_checks)
                await self._save_metric(session, "api.response_time.avg", avg_response_time, "gauge")

                # Error rate
                error_count = sum(1 for hc in health_checks if hc.status != "healthy")
                error_rate = (error_count / len(health_checks)) * 100
                await self._save_metric(session, "api.error_rate", error_rate, "gauge")

        except Exception as e:
            logger.error(f"Error collecting API metrics: {e}")

    async def collect_redis_metrics(self, session: AsyncSession):
        """Collect Redis metrics"""
        try:
            if not self.redis:
                return

            # Redis info
            info = await self.redis.info()

            # Memory usage
            used_memory = info.get('used_memory', 0) / (1024**2)  # MB
            await self._save_metric(session, "redis.memory.used", used_memory, "gauge")

            # Connected clients
            connected_clients = info.get('connected_clients', 0)
            await self._save_metric(session, "redis.clients.connected", connected_clients, "gauge")

            # Commands processed
            total_commands = info.get('total_commands_processed', 0)
            await self._save_metric(session, "redis.commands.total", total_commands, "counter")

            # Keyspace
            for db_key in info.keys():
                if db_key.startswith('db'):
                    db_info = info[db_key]
                    if isinstance(db_info, dict):
                        keys = db_info.get('keys', 0)
                        await self._save_metric(
                            session,
                            f"redis.keys.{db_key}",
                            keys,
                            "gauge",
                            {"database": db_key}
                        )

        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")

    async def _save_metric(
        self,
        session: AsyncSession,
        metric_name: str,
        value: float,
        metric_type: str,
        tags: Optional[Dict[str, str]] = None
    ):
        """Save a metric to the database"""
        metric = SystemMetric(
            metric_name=metric_name,
            metric_type=metric_type,
            value=value,
            tags=tags,
            timestamp=datetime.utcnow()
        )
        session.add(metric)

    async def perform_health_check(self, session: AsyncSession, service_name: str, endpoint: str) -> Dict[str, Any]:
        """Perform a health check on a service endpoint"""
        start_time = time.time()
        status = "healthy"
        error_message = None
        details = {}

        try:
            # Simulate health check (replace with actual check)
            if service_name == "database":
                result = await session.execute(select(1))
                if not result:
                    raise Exception("Database not responding")
            elif service_name == "redis" and self.redis:
                await self.redis.ping()
            else:
                # Generic endpoint check
                pass

            response_time = (time.time() - start_time) * 1000  # ms

        except Exception as e:
            status = "down"
            error_message = str(e)
            response_time = (time.time() - start_time) * 1000

            # Create alert for failed health check
            alert = SystemAlert(
                severity=AlertSeverity.ERROR,
                type="SYSTEM_PERFORMANCE",
                message=f"Health check failed for {service_name}",
                details={"service": service_name, "endpoint": endpoint, "error": error_message},
                status=AlertStatus.ACTIVE,
                source="health_check"
            )
            session.add(alert)

        # Save health check result
        health_check = ApiHealthCheck(
            service_name=service_name,
            endpoint=endpoint,
            status=status,
            response_time=response_time,
            error_message=error_message,
            details=details
        )
        session.add(health_check)

        return {
            "service": service_name,
            "status": status,
            "response_time": response_time,
            "error": error_message
        }


class MetricsAggregator:
    """Aggregates metrics for reporting"""

    @staticmethod
    async def get_current_metrics(session: AsyncSession) -> Dict[str, Any]:
        """Get current system metrics"""
        recent_time = datetime.utcnow() - timedelta(minutes=5)

        # Get latest metrics for each metric name
        result = await session.execute(
            select(SystemMetric).where(
                SystemMetric.timestamp >= recent_time
            ).order_by(SystemMetric.timestamp.desc())
        )
        metrics = result.scalars().all()

        # Group by metric name and get latest value
        latest_metrics = {}
        for metric in metrics:
            if metric.metric_name not in latest_metrics:
                latest_metrics[metric.metric_name] = {
                    "value": metric.value,
                    "type": metric.metric_type,
                    "timestamp": metric.timestamp.isoformat(),
                    "tags": metric.tags
                }

        return latest_metrics

    @staticmethod
    async def get_metrics_history(
        session: AsyncSession,
        metric_name: str,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Get metric history for charting"""
        start_time = datetime.utcnow() - timedelta(hours=hours)

        result = await session.execute(
            select(SystemMetric).where(
                and_(
                    SystemMetric.metric_name == metric_name,
                    SystemMetric.timestamp >= start_time
                )
            ).order_by(SystemMetric.timestamp)
        )
        metrics = result.scalars().all()

        return [
            {
                "timestamp": m.timestamp.isoformat(),
                "value": m.value,
                "tags": m.tags
            }
            for m in metrics
        ]

    @staticmethod
    async def calculate_qps(session: AsyncSession) -> float:
        """Calculate queries per second"""
        one_minute_ago = datetime.utcnow() - timedelta(minutes=1)

        result = await session.execute(
            select(func.count()).select_from(DialogueSession).where(
                DialogueSession.created_at >= one_minute_ago
            )
        )
        count = result.scalar() or 0

        return count / 60.0  # Convert to per second