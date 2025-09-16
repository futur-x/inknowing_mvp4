"""
Common schemas for pagination and shared data structures
"""
from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel, Field

# Type variable for generic pagination
T = TypeVar('T')

class PaginationQuery(BaseModel):
    """Common pagination query parameters"""
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=10, ge=1, le=100, description="Items per page")

class PaginationInfo(BaseModel):
    """Pagination metadata"""
    page: int = Field(description="Current page number")
    limit: int = Field(description="Items per page")
    total: int = Field(description="Total number of items")
    total_pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    items: List[T] = Field(description="List of items")
    pagination: PaginationInfo = Field(description="Pagination information")

class MessageResponse(BaseModel):
    """Simple message response"""
    message: str = Field(description="Response message")

class SuccessResponse(BaseModel):
    """Success response with optional data"""
    success: bool = Field(default=True, description="Success status")
    message: str = Field(description="Success message")
    data: Optional[dict] = Field(default=None, description="Optional data")

class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(description="Error message")
    detail: Optional[str] = Field(default=None, description="Error details")
    code: Optional[str] = Field(default=None, description="Error code")