"""
AI Model API endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config.database import get_db
from core.auth import get_admin_user
from models.admin import Admin, AIModelConfig
from schemas.ai_model import (
    AIModelCreate,
    AIModelUpdate,
    AIModelResponse,
    ModelConfig,
    ModelConfigUpdate,
    ModelTestRequest,
    ModelTestResult,
    AICheckResult,
    CostStatistics,
    TokenUsageStats,
)
from services.ai_model import ai_service
from core.security import encrypt_data, decrypt_data
from core.logger import logger


router = APIRouter(prefix="/admin/models", tags=["Admin - AI Models"])


@router.get("", response_model=ModelConfig)
async def get_ai_model_configuration(
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_admin_user)
):
    """Get AI model configuration"""
    try:
        # Check admin permission
        if not admin.has_permission("config:read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Get all model configurations
        stmt = select(AIModelConfig).where(AIModelConfig.status == "active")
        result = await db.execute(stmt)
        configs = result.scalars().all()

        primary_model = None
        backup_models = []
        embedding_model = {}
        routing_rules = {}

        for config in configs:
            model_response = AIModelResponse(
                id=config.id,
                name=config.name,
                provider=config.provider,
                model=config.model,
                api_endpoint=config.api_endpoint,
                api_key_configured=bool(config.api_key_encrypted),
                is_primary=config.is_primary,
                is_backup=config.is_backup,
                routing_rules=config.routing_rules,
                status=config.status,
                last_health_check=config.last_health_check,
                average_latency_ms=config.average_latency_ms,
                monthly_cost=config.current_month_cost,
                parameters=config.parameters
            )

            if config.is_primary:
                primary_model = model_response
                routing_rules = config.routing_rules
            elif config.is_backup:
                backup_models.append(model_response)

            # Check for embedding model
            if "embedding" in config.model.lower():
                embedding_model = {
                    "provider": config.provider,
                    "model": config.model,
                    "dimension": config.parameters.get("dimension", 1536)
                }

        if not primary_model:
            # Create a default response if no primary model
            return ModelConfig(
                primary_model=None,
                backup_models=[],
                routing_rules={},
                embedding_model={}
            )

        return ModelConfig(
            primary_model=primary_model,
            backup_models=backup_models,
            routing_rules=routing_rules,
            embedding_model=embedding_model
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get AI model configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration: {str(e)}"
        )


@router.put("", response_model=ModelConfig)
async def update_ai_model_configuration(
    config_update: ModelConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_admin_user)
):
    """Update AI model configuration"""
    try:
        # Check admin permission
        if not admin.has_permission("config:write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Handle new model creation
        if config_update.new_model:
            new_model = config_update.new_model

            # Check if model name already exists
            stmt = select(AIModelConfig).where(
                AIModelConfig.name == new_model.name
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Model with this name already exists"
                )

            # Create new model configuration
            model_config = AIModelConfig(
                name=new_model.name or f"{new_model.provider}_{new_model.model}",
                provider=new_model.provider,
                model=new_model.model,
                api_endpoint=new_model.api_endpoint,
                api_key_encrypted=encrypt_data(new_model.api_key),
                parameters=new_model.parameters,
                is_primary=new_model.is_primary,
                is_backup=new_model.is_backup,
                routing_rules=new_model.routing_rules,
                status="active",
                updated_by=admin.id
            )

            db.add(model_config)

            # If setting as primary, unset other primary models
            if new_model.is_primary:
                stmt = select(AIModelConfig).where(
                    AIModelConfig.is_primary == True,
                    AIModelConfig.id != model_config.id
                )
                result = await db.execute(stmt)
                other_primaries = result.scalars().all()

                for other in other_primaries:
                    other.is_primary = False

        # Update primary model
        if config_update.primary_model_id:
            # Unset current primary
            stmt = select(AIModelConfig).where(AIModelConfig.is_primary == True)
            result = await db.execute(stmt)
            current_primaries = result.scalars().all()

            for model in current_primaries:
                model.is_primary = False

            # Set new primary
            primary_model = await db.get(AIModelConfig, config_update.primary_model_id)
            if not primary_model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Primary model not found"
                )

            primary_model.is_primary = True
            primary_model.is_backup = False  # Can't be both

        # Update backup models
        if config_update.backup_model_ids is not None:
            # Clear current backups
            stmt = select(AIModelConfig).where(AIModelConfig.is_backup == True)
            result = await db.execute(stmt)
            current_backups = result.scalars().all()

            for model in current_backups:
                model.is_backup = False

            # Set new backups
            for model_id in config_update.backup_model_ids:
                backup_model = await db.get(AIModelConfig, model_id)
                if backup_model and not backup_model.is_primary:
                    backup_model.is_backup = True

        # Update routing rules
        if config_update.routing_rules:
            # Find primary model and update its routing rules
            stmt = select(AIModelConfig).where(AIModelConfig.is_primary == True)
            result = await db.execute(stmt)
            primary = result.scalar_one_or_none()

            if primary:
                primary.routing_rules = config_update.routing_rules

        await db.commit()

        # Reinitialize AI service
        await ai_service.initialize(db)

        # Return updated configuration
        return await get_ai_model_configuration(db, admin)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update AI model configuration: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update configuration: {str(e)}"
        )


@router.post("/test", response_model=ModelTestResult)
async def test_ai_model_connection(
    test_request: ModelTestRequest,
    admin: Admin = Depends(get_admin_user)
):
    """Test AI model connection"""
    try:
        # Check admin permission
        if not admin.has_permission("config:write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Test the model
        result = await ai_service.test_model(
            provider_type=test_request.provider,
            model=test_request.model,
            api_endpoint=test_request.api_endpoint,
            api_key=test_request.api_key,
            test_prompt=test_request.test_prompt
        )

        return result

    except Exception as e:
        logger.error(f"Model test failed: {e}")
        return ModelTestResult(
            success=False,
            latency=0,
            error=str(e)
        )


@router.post("/ai-check", response_model=AICheckResult)
async def check_ai_knowledge(
    title: str,
    author: str,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_admin_user)
):
    """Check if AI knows a book"""
    try:
        # Check admin permission
        if not admin.has_permission("books:write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Initialize AI service if not initialized
        if not ai_service.providers:
            await ai_service.initialize(db)

        # Check AI knowledge
        result = await ai_service.check_ai_knowledge(title, author)

        return result

    except Exception as e:
        logger.error(f"AI knowledge check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI check failed: {str(e)}"
        )


@router.get("/statistics/costs", response_model=CostStatistics)
async def get_cost_statistics(
    period: str = "month",
    group_by: str = "model",
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_admin_user)
):
    """Get AI usage cost statistics"""
    try:
        # Check admin permission
        if not admin.has_permission("statistics:read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Calculate date range
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)

        # Query usage tracking
        from models.dialogue import AIUsageTracking
        from sqlalchemy import func

        stmt = select(
            AIUsageTracking.provider,
            AIUsageTracking.model,
            AIUsageTracking.feature,
            func.count(AIUsageTracking.id).label("count"),
            func.sum(AIUsageTracking.cost).label("total_cost"),
            func.sum(AIUsageTracking.total_tokens).label("total_tokens")
        ).where(
            AIUsageTracking.created_at >= start_date
        )

        # Group by specified field
        if group_by == "model":
            stmt = stmt.group_by(AIUsageTracking.provider, AIUsageTracking.model)
        elif group_by == "feature":
            stmt = stmt.group_by(AIUsageTracking.feature)
        elif group_by == "user_tier":
            # Join with user table and group by membership
            from models.user import User
            stmt = stmt.join(User, AIUsageTracking.user_id == User.id)
            stmt = stmt.add_columns(User.membership)
            stmt = stmt.group_by(User.membership)

        result = await db.execute(stmt)
        rows = result.all()

        # Build breakdown
        breakdown = []
        total_cost = 0

        for row in rows:
            if group_by == "model":
                category = f"{row.provider}/{row.model}"
            elif group_by == "feature":
                category = row.feature
            else:
                category = row.membership if hasattr(row, "membership") else "unknown"

            cost = float(row.total_cost or 0)
            total_cost += cost

            breakdown.append({
                "category": category,
                "cost": cost,
                "count": row.count,
                "tokens": row.total_tokens or 0
            })

        # Calculate percentages
        for item in breakdown:
            item["percentage"] = (item["cost"] / total_cost * 100) if total_cost > 0 else 0

        # Sort by cost
        breakdown.sort(key=lambda x: x["cost"], reverse=True)

        # Get daily trend
        trend_stmt = select(
            func.date(AIUsageTracking.created_at).label("date"),
            func.sum(AIUsageTracking.cost).label("cost")
        ).where(
            AIUsageTracking.created_at >= start_date
        ).group_by(
            func.date(AIUsageTracking.created_at)
        ).order_by(
            func.date(AIUsageTracking.created_at)
        )

        trend_result = await db.execute(trend_stmt)
        trend = [
            {"date": str(row.date), "cost": float(row.cost or 0)}
            for row in trend_result
        ]

        # Calculate projection
        days_in_period = (now - start_date).days or 1
        daily_average = total_cost / days_in_period
        estimated_monthly = daily_average * 30

        # Get budget from config
        stmt = select(AIModelConfig).where(AIModelConfig.is_primary == True)
        result = await db.execute(stmt)
        primary_config = result.scalar_one_or_none()
        monthly_budget = primary_config.monthly_budget if primary_config else None

        budget_status = "on_track"
        if monthly_budget:
            if estimated_monthly > monthly_budget * 1.1:
                budget_status = "over_budget"
            elif estimated_monthly > monthly_budget * 0.9:
                budget_status = "on_track"
            else:
                budget_status = "under_budget"

        return CostStatistics(
            period=period,
            total_cost=total_cost,
            breakdown=breakdown,
            trend=trend,
            projection={
                "estimated_monthly": estimated_monthly,
                "budget_status": budget_status,
                "monthly_budget": monthly_budget
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cost statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )