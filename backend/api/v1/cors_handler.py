"""
CORS Handler for Admin API
Ensures proper CORS handling for admin routes
"""
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

router = APIRouter()


@router.options("/{full_path:path}")
async def handle_options(full_path: str):
    """
    Handle OPTIONS preflight requests for all admin routes
    """
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Max-Age": "3600",
        }
    )