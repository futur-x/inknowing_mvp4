"""
Enhanced CORS Middleware for InKnowing API
This middleware ensures CORS headers are properly set even for error responses
"""
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class EnhancedCORSMiddleware:
    """
    Enhanced CORS middleware that ensures headers are set for all responses,
    including authentication errors
    """

    def __init__(self, app, **kwargs):
        self.app = app
        self.allow_origins = kwargs.get('allow_origins', [])
        self.allow_credentials = kwargs.get('allow_credentials', True)
        self.allow_methods = kwargs.get('allow_methods', ["*"])
        self.allow_headers = kwargs.get('allow_headers', ["*"])
        self.expose_headers = kwargs.get('expose_headers', [])
        self.max_age = kwargs.get('max_age', 600)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        origin = None

        # Extract origin from headers
        for name, value in scope.get("headers", []):
            if name == b"origin":
                origin = value.decode("latin-1")
                break

        # Handle the request
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add CORS headers to response
                headers = dict(message.get("headers", []))

                # Always add CORS headers for allowed origins
                if origin and (
                    "*" in self.allow_origins or
                    origin in self.allow_origins or
                    self.allow_origins == ["*"]
                ):
                    headers[b"access-control-allow-origin"] = origin.encode("latin-1")

                    if self.allow_credentials:
                        headers[b"access-control-allow-credentials"] = b"true"

                    if self.expose_headers:
                        headers[b"access-control-expose-headers"] = ", ".join(self.expose_headers).encode("latin-1")

                # Handle preflight OPTIONS request
                if scope["method"] == "OPTIONS":
                    headers[b"access-control-allow-methods"] = ", ".join(self.allow_methods).encode("latin-1")
                    headers[b"access-control-allow-headers"] = ", ".join(self.allow_headers).encode("latin-1")
                    headers[b"access-control-max-age"] = str(self.max_age).encode("latin-1")

                message["headers"] = list(headers.items())

            await send(message)

        await self.app(scope, receive, send_wrapper)


async def cors_middleware_handler(request: Request, call_next):
    """
    Fallback CORS handler for ensuring headers on all responses
    """
    # Process the request
    response = await call_next(request)

    # Get origin from request
    origin = request.headers.get("origin")

    # Add CORS headers if origin is present
    if origin:
        # Check if origin is allowed
        from backend.config.settings import settings
        allowed_origins = settings.CORS_ORIGINS

        if "*" in allowed_origins or origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"

            # Handle preflight
            if request.method == "OPTIONS":
                response.headers["Access-Control-Allow-Methods"] = ", ".join(settings.CORS_ALLOW_METHODS)
                response.headers["Access-Control-Allow-Headers"] = ", ".join(settings.CORS_ALLOW_HEADERS)
                response.headers["Access-Control-Max-Age"] = "3600"

    return response