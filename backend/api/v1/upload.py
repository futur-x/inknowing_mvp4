"""
Upload API endpoints
Implements /v1/uploads/* endpoints from API specification
"""
from typing import Optional, List
from uuid import UUID

from fastapi import (
    APIRouter, Depends, HTTPException, status,
    File, UploadFile, Form, Query, Path
)
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.database import get_db
from backend.core.auth import get_current_user, require_user
from backend.models.user import User
from backend.models.upload import Upload, UploadStatus
from backend.schemas.upload import (
    BookCheckRequest, BookCheckResponse,
    UploadResponse, UploadListResponse,
    UploadFilters, BookCategoryEnum
)
from backend.services.upload import UploadService
from backend.core.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/check", response_model=BookCheckResponse)
async def check_book_exists(
    request: BookCheckRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a book already exists before upload.

    This endpoint helps prevent duplicate uploads by checking if a book
    is already in the system or known to the AI.

    **Business Logic**: Pre-upload validation to avoid redundant processing

    **Response**:
    - `exists`: Whether the book exists in the system
    - `book_id`: The book's ID if it exists
    - `ai_known`: Whether the AI has knowledge of this book
    """
    service = UploadService(db)
    return await service.check_book_exists(request)


@router.post("/", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_book(
    file: UploadFile = File(..., description="Book file (TXT or PDF, max 10MB)"),
    title: str = Form(..., min_length=1, max_length=500, description="Book title"),
    author: str = Form(..., min_length=1, max_length=255, description="Book author"),
    category: Optional[BookCategoryEnum] = Form(None, description="Book category"),
    description: Optional[str] = Form(None, max_length=2000, description="Book description"),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a book file for processing.

    **Business Logic**: User Upload → AI Processing → Vectorization workflow

    **File Requirements**:
    - Formats: TXT or PDF
    - Maximum size: 10MB for TXT, 50MB for PDF
    - Must be valid text content

    **Processing Steps**:
    1. AI Detection - Check if AI knows the book
    2. Text Preprocessing - Clean and prepare text
    3. Chapter Extraction - Identify book structure
    4. Character Extraction - Find characters (for fiction)
    5. Vectorization - Create embeddings (if not AI-known)
    6. Indexing - Add to search index

    **Returns**: Upload record with processing status (202 Accepted)
    """
    try:
        service = UploadService(db)
        upload = await service.upload_book(
            user_id=str(current_user.id),
            file=file,
            title=title,
            author=author,
            category=category.value if category else None,
            description=description
        )

        # Convert to response schema
        return UploadResponse(
            id=str(upload.id),
            user_id=str(upload.user_id),
            book_id=str(upload.book_id) if upload.book_id else None,
            filename=upload.filename,
            file_size=upload.file_size,
            file_type=upload.file_type.value,
            title=upload.title,
            author=upload.author,
            category=upload.category,
            status=upload.status.value,
            processing_steps=upload.processing_steps,
            ai_known=upload.ai_known,
            vector_count=upload.vector_count,
            extracted_characters=upload.extracted_characters,
            points_earned=upload.points_earned,
            error_message=upload.error_message,
            created_at=upload.created_at,
            completed_at=upload.completed_at,
            progress=upload.get_processing_progress()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process upload"
        )


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload_status(
    upload_id: str = Path(..., description="Upload ID"),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get processing status of uploaded book.

    **Use Case**: Poll this endpoint to track upload processing progress

    **Processing States**:
    - `pending`: Upload queued for processing
    - `processing`: Currently being processed
    - `completed`: Successfully processed
    - `failed`: Processing failed (check error_message)

    **Authorization**: Users can only access their own uploads
    """
    service = UploadService(db)
    upload = await service.get_upload_status(upload_id, str(current_user.id))

    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )

    return UploadResponse(
        id=str(upload.id),
        user_id=str(upload.user_id),
        book_id=str(upload.book_id) if upload.book_id else None,
        filename=upload.filename,
        file_size=upload.file_size,
        file_type=upload.file_type.value,
        title=upload.title,
        author=upload.author,
        category=upload.category,
        status=upload.status.value,
        processing_steps=upload.processing_steps,
        ai_known=upload.ai_known,
        vector_count=upload.vector_count,
        extracted_characters=upload.extracted_characters,
        points_earned=upload.points_earned,
        error_message=upload.error_message,
        created_at=upload.created_at,
        completed_at=upload.completed_at,
        progress=upload.get_processing_progress()
    )


@router.get("/my", response_model=UploadListResponse)
async def get_user_uploads(
    status: Optional[UploadStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of books uploaded by current user.

    **Filters**:
    - `status`: Filter by processing status (pending/processing/completed/failed/all)

    **Pagination**:
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 20, max: 50)

    **Sorting**: Results are sorted by upload date (newest first)
    """
    service = UploadService(db)

    # Build filters
    filters = UploadFilters(status=status) if status else None

    # Get uploads
    uploads, total_count = await service.get_user_uploads(
        user_id=str(current_user.id),
        filters=filters,
        page=page,
        limit=limit
    )

    # Calculate pagination
    total_pages = (total_count + limit - 1) // limit
    has_next = page < total_pages
    has_prev = page > 1

    # Convert to response
    upload_responses = [
        UploadResponse(
            id=str(upload.id),
            user_id=str(upload.user_id),
            book_id=str(upload.book_id) if upload.book_id else None,
            filename=upload.filename,
            file_size=upload.file_size,
            file_type=upload.file_type.value,
            title=upload.title,
            author=upload.author,
            category=upload.category,
            status=upload.status.value,
            processing_steps=None,  # Don't include steps in list view
            ai_known=upload.ai_known,
            vector_count=upload.vector_count,
            extracted_characters=upload.extracted_characters,
            points_earned=upload.points_earned,
            error_message=upload.error_message,
            created_at=upload.created_at,
            completed_at=upload.completed_at,
            progress=upload.get_processing_progress()
        )
        for upload in uploads
    ]

    return UploadListResponse(
        uploads=upload_responses,
        pagination={
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    )


# Additional endpoints for admin (if needed)
@router.get("/", response_model=UploadListResponse, include_in_schema=False)
async def get_all_uploads(
    status: Optional[UploadStatus] = Query(None, description="Filter by status"),
    user_id: Optional[UUID] = Query(None, description="Filter by user"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all uploads (admin only).
    This endpoint is for admin monitoring and management.
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    service = UploadService(db)

    # Build filters
    filters = UploadFilters(
        status=status,
        user_id=user_id
    )

    # Get uploads (without user_id filter for admin)
    uploads, total_count = await service.get_user_uploads(
        user_id=str(user_id) if user_id else None,
        filters=filters,
        page=page,
        limit=limit
    )

    # Calculate pagination
    total_pages = (total_count + limit - 1) // limit
    has_next = page < total_pages
    has_prev = page > 1

    # Convert to response
    upload_responses = [
        UploadResponse(
            id=str(upload.id),
            user_id=str(upload.user_id),
            book_id=str(upload.book_id) if upload.book_id else None,
            filename=upload.filename,
            file_size=upload.file_size,
            file_type=upload.file_type.value,
            title=upload.title,
            author=upload.author,
            category=upload.category,
            status=upload.status.value,
            processing_steps=upload.processing_steps,
            ai_known=upload.ai_known,
            vector_count=upload.vector_count,
            extracted_characters=upload.extracted_characters,
            points_earned=upload.points_earned,
            error_message=upload.error_message,
            created_at=upload.created_at,
            completed_at=upload.completed_at,
            progress=upload.get_processing_progress()
        )
        for upload in uploads
    ]

    return UploadListResponse(
        uploads=upload_responses,
        pagination={
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    )


# Export router
__all__ = ["router"]