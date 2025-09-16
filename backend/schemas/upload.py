"""
Upload schemas for API request/response validation
Based on API specification Upload and related schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, validator, conint


# Enums matching API specification
class FileTypeEnum(str, Enum):
    """Allowed file types"""
    TXT = "txt"
    PDF = "pdf"


class UploadStatusEnum(str, Enum):
    """Upload processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStepEnum(str, Enum):
    """Processing steps"""
    AI_DETECTION = "ai_detection"
    TEXT_PREPROCESSING = "text_preprocessing"
    CHAPTER_EXTRACTION = "chapter_extraction"
    CHARACTER_EXTRACTION = "character_extraction"
    VECTORIZATION = "vectorization"
    INDEXING = "indexing"
    MODEL_GENERATION = "model_generation"


class StepStatusEnum(str, Enum):
    """Step status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BookCategoryEnum(str, Enum):
    """Book categories"""
    BUSINESS = "business"
    PSYCHOLOGY = "psychology"
    FICTION = "fiction"
    SCIENCE = "science"
    HISTORY = "history"
    PHILOSOPHY = "philosophy"


# Request Schemas
class BookCheckRequest(BaseModel):
    """Request schema for checking if book exists"""
    title: str = Field(..., min_length=1, max_length=500, description="Book title")
    author: Optional[str] = Field(None, max_length=255, description="Book author")

    class Config:
        schema_extra = {
            "example": {
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald"
            }
        }


class UploadBookRequest(BaseModel):
    """Request schema for book upload metadata"""
    title: str = Field(..., min_length=1, max_length=500, description="Book title")
    author: str = Field(..., min_length=1, max_length=255, description="Book author")
    category: Optional[BookCategoryEnum] = Field(None, description="Book category")
    description: Optional[str] = Field(None, max_length=2000, description="Book description")

    class Config:
        schema_extra = {
            "example": {
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "category": "fiction",
                "description": "A classic American novel about the Jazz Age"
            }
        }


# Response Schemas
class BookCheckResponse(BaseModel):
    """Response schema for book existence check"""
    exists: bool = Field(..., description="Whether the book exists in the system")
    book_id: Optional[str] = Field(None, description="Book ID if it exists")
    ai_known: bool = Field(False, description="Whether AI knows this book")

    class Config:
        schema_extra = {
            "example": {
                "exists": True,
                "book_id": "550e8400-e29b-41d4-a716-446655440000",
                "ai_known": True
            }
        }


class ProcessingStep(BaseModel):
    """Processing step status"""
    step: ProcessingStepEnum
    status: StepStatusEnum
    progress: conint(ge=0, le=100) = Field(0, description="Progress percentage")
    message: Optional[str] = Field(None, description="Status message")
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "step": "ai_detection",
                "status": "completed",
                "progress": 100,
                "message": "Book is known to AI",
                "started_at": "2024-01-20T10:00:00Z",
                "completed_at": "2024-01-20T10:00:05Z"
            }
        }


class UploadResponse(BaseModel):
    """Response schema for upload status"""
    id: str = Field(..., description="Upload ID")
    user_id: str = Field(..., description="User ID")
    book_id: Optional[str] = Field(None, description="Book ID once processing is complete")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    file_type: FileTypeEnum = Field(..., description="File type")
    title: str = Field(..., description="Book title")
    author: str = Field(..., description="Book author")
    category: Optional[str] = Field(None, description="Book category")
    status: UploadStatusEnum = Field(..., description="Processing status")
    processing_steps: Optional[List[ProcessingStep]] = Field(None, description="Processing steps")
    ai_known: Optional[bool] = Field(None, description="Whether AI knows this book")
    vector_count: Optional[int] = Field(None, description="Number of vectors created")
    extracted_characters: Optional[List[str]] = Field(None, description="Extracted character names")
    points_earned: int = Field(0, description="Points earned for upload")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Upload creation time")
    completed_at: Optional[datetime] = Field(None, description="Processing completion time")
    progress: float = Field(0.0, ge=0.0, le=100.0, description="Overall progress percentage")

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user-123",
                "book_id": None,
                "filename": "gatsby.pdf",
                "file_size": 2048576,
                "file_type": "pdf",
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "category": "fiction",
                "status": "processing",
                "ai_known": True,
                "points_earned": 0,
                "created_at": "2024-01-20T10:00:00Z",
                "progress": 25.0
            }
        }


class UploadListResponse(BaseModel):
    """Response schema for user uploads list"""
    uploads: List[UploadResponse]
    pagination: Dict[str, Any] = Field(
        ...,
        description="Pagination information",
        example={
            "page": 1,
            "limit": 20,
            "total": 45,
            "total_pages": 3,
            "has_next": True,
            "has_prev": False
        }
    )


class UploadCreate(BaseModel):
    """Internal schema for creating upload record"""
    user_id: UUID
    filename: str
    file_size: int
    file_type: FileTypeEnum
    file_path: Optional[str] = None
    title: str
    author: str
    category: Optional[str] = None
    description: Optional[str] = None


class UploadUpdate(BaseModel):
    """Internal schema for updating upload record"""
    status: Optional[UploadStatusEnum] = None
    book_id: Optional[UUID] = None
    ai_known: Optional[bool] = None
    vector_count: Optional[int] = None
    extracted_characters: Optional[List[str]] = None
    points_earned: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class UploadFilters(BaseModel):
    """Filters for querying uploads"""
    status: Optional[UploadStatusEnum] = Field(None, description="Filter by status")
    user_id: Optional[UUID] = Field(None, description="Filter by user")
    title: Optional[str] = Field(None, description="Search by title")
    author: Optional[str] = Field(None, description="Search by author")
    ai_known: Optional[bool] = Field(None, description="Filter by AI knowledge status")


class FileUploadMetadata(BaseModel):
    """Metadata for file upload validation"""
    filename: str
    file_size: int
    content_type: str

    @validator("file_size")
    def validate_file_size(cls, v):
        max_size = 50 * 1024 * 1024  # 50MB max
        if v > max_size:
            raise ValueError(f"File size exceeds maximum allowed size of {max_size} bytes")
        return v

    @validator("filename")
    def validate_filename(cls, v):
        if not v or len(v) > 255:
            raise ValueError("Invalid filename")
        # Check for allowed extensions
        allowed_extensions = ["txt", "pdf"]
        if "." in v:
            ext = v.rsplit(".", 1)[1].lower()
            if ext not in allowed_extensions:
                raise ValueError(f"File type not allowed. Allowed types: {allowed_extensions}")
        return v


# Export all schemas
__all__ = [
    # Enums
    "FileTypeEnum",
    "UploadStatusEnum",
    "ProcessingStepEnum",
    "StepStatusEnum",
    "BookCategoryEnum",
    # Request schemas
    "BookCheckRequest",
    "UploadBookRequest",
    # Response schemas
    "BookCheckResponse",
    "ProcessingStep",
    "UploadResponse",
    "UploadListResponse",
    # Internal schemas
    "UploadCreate",
    "UploadUpdate",
    "UploadFilters",
    "FileUploadMetadata",
]