"""
Upload service for handling book uploads
Implements business logic for file processing and vectorization
"""
import os
import uuid
import shutil
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple, BinaryIO
from pathlib import Path

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from backend.models.upload import (
    Upload, UploadStatus, FileType,
    ProcessingStep, StepStatus
)
from backend.models.book import Book, BookType, BookStatus
from backend.models.user import User
from backend.schemas.upload import (
    UploadCreate, UploadUpdate, UploadFilters,
    BookCheckRequest, BookCheckResponse,
    FileUploadMetadata
)
from backend.config.storage import storage_config
from backend.utils.file_validation import FileValidator
from backend.services.ai_dialogue import AIDialogueService
from backend.core.logger import get_logger

logger = get_logger(__name__)


class UploadService:
    """Service for handling file uploads and processing"""

    def __init__(self, db: AsyncSession):
        """
        Initialize upload service

        Args:
            db: Database session
        """
        self.db = db
        self.storage_config = storage_config
        self.validator = FileValidator()
        self.ai_service = AIDialogueService()

    async def check_book_exists(
        self,
        request: BookCheckRequest
    ) -> BookCheckResponse:
        """
        Check if a book already exists in the system

        Args:
            request: Book check request

        Returns:
            BookCheckResponse with existence status
        """
        try:
            # Search for existing book by title and author
            query = select(Book).where(
                and_(
                    func.lower(Book.title) == func.lower(request.title),
                    func.lower(Book.author) == func.lower(request.author) if request.author else True
                )
            )
            result = await self.db.execute(query)
            existing_book = result.scalar_one_or_none()

            if existing_book:
                return BookCheckResponse(
                    exists=True,
                    book_id=str(existing_book.id),
                    ai_known=existing_book.type == BookType.AI_KNOWN
                )

            # Check if AI knows this book (call AI service)
            ai_known = await self._check_ai_knowledge(request.title, request.author)

            return BookCheckResponse(
                exists=False,
                book_id=None,
                ai_known=ai_known
            )

        except Exception as e:
            logger.error(f"Error checking book existence: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check book existence"
            )

    async def upload_book(
        self,
        user_id: str,
        file: UploadFile,
        title: str,
        author: str,
        category: Optional[str] = None,
        description: Optional[str] = None
    ) -> Upload:
        """
        Handle book file upload

        Args:
            user_id: User ID
            file: Uploaded file
            title: Book title
            author: Book author
            category: Book category
            description: Book description

        Returns:
            Upload record
        """
        # Validate file
        is_valid, error_msg = await self._validate_upload_file(file)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Check if book already exists
        check_request = BookCheckRequest(title=title, author=author)
        check_result = await self.check_book_exists(check_request)
        if check_result.exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Book already exists with ID: {check_result.book_id}"
            )

        # Save file to storage
        file_path, file_size = await self._save_upload_file(file, user_id)

        # Create upload record
        upload = Upload(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            filename=self.validator.sanitize_filename(file.filename),
            file_size=file_size,
            file_type=FileType(self.validator.get_file_extension(file.filename)),
            file_path=file_path,
            title=title,
            author=author,
            category=category,
            description=description,
            status=UploadStatus.PENDING,
            ai_known=check_result.ai_known
        )

        self.db.add(upload)
        await self.db.commit()
        await self.db.refresh(upload)

        # Start async processing
        asyncio.create_task(self._process_upload(upload.id))

        return upload

    async def get_upload_status(
        self,
        upload_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Upload]:
        """
        Get upload status

        Args:
            upload_id: Upload ID
            user_id: Optional user ID for authorization

        Returns:
            Upload record or None
        """
        query = select(Upload).where(Upload.id == uuid.UUID(upload_id))
        if user_id:
            query = query.where(Upload.user_id == uuid.UUID(user_id))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_uploads(
        self,
        user_id: str,
        filters: Optional[UploadFilters] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Upload], int]:
        """
        Get user's upload history

        Args:
            user_id: User ID
            filters: Optional filters
            page: Page number
            limit: Items per page

        Returns:
            Tuple of (uploads, total_count)
        """
        # Base query
        query = select(Upload).where(Upload.user_id == uuid.UUID(user_id))

        # Apply filters
        if filters:
            if filters.status:
                query = query.where(Upload.status == filters.status)
            if filters.title:
                query = query.where(Upload.title.ilike(f"%{filters.title}%"))
            if filters.author:
                query = query.where(Upload.author.ilike(f"%{filters.author}%"))
            if filters.ai_known is not None:
                query = query.where(Upload.ai_known == filters.ai_known)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total_count = total_result.scalar()

        # Apply pagination
        query = query.order_by(Upload.created_at.desc())
        query = query.limit(limit).offset((page - 1) * limit)

        # Execute query
        result = await self.db.execute(query)
        uploads = result.scalars().all()

        return uploads, total_count

    async def _validate_upload_file(self, file: UploadFile) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file

        Args:
            file: Uploaded file

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file extension
        if not self.storage_config.is_extension_allowed(file.filename):
            return False, f"File type not allowed. Allowed types: {self.storage_config.ALLOWED_EXTENSIONS}"

        # Check content type
        if not self.storage_config.is_mime_type_allowed(file.content_type):
            return False, f"Invalid file content type: {file.content_type}"

        # Check file size (basic check, will validate actual size after saving)
        if file.size and file.size > self.storage_config.get_max_size_for_type(
            self.validator.get_file_extension(file.filename)
        ):
            return False, "File size exceeds maximum allowed size"

        return True, None

    async def _save_upload_file(
        self,
        file: UploadFile,
        user_id: str
    ) -> Tuple[str, int]:
        """
        Save uploaded file to storage

        Args:
            file: Uploaded file
            user_id: User ID

        Returns:
            Tuple of (file_path, file_size)
        """
        # Generate unique filename
        ext = self.validator.get_file_extension(file.filename)
        unique_filename = f"{user_id}_{uuid.uuid4().hex}.{ext}"

        # Determine storage path
        if self.storage_config.use_s3:
            # TODO: Implement S3 upload
            file_path = f"books/{unique_filename}"
        else:
            # Local storage
            upload_dir = Path(self.storage_config.get_upload_path("books"))
            upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = upload_dir / unique_filename

            # Save file
            try:
                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                    file_size = len(content)

                # Validate saved file
                is_valid, error = self.validator.validate_upload(
                    str(file_path),
                    file.filename,
                    self.storage_config.ALLOWED_EXTENSIONS,
                    self.storage_config.ALLOWED_MIME_TYPES
                )

                if not is_valid:
                    os.remove(file_path)
                    raise ValueError(error)

                return str(file_path), file_size

            except Exception as e:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save file: {str(e)}"
                )

    async def _check_ai_knowledge(self, title: str, author: Optional[str]) -> bool:
        """
        Check if AI knows the book

        Args:
            title: Book title
            author: Book author

        Returns:
            True if AI knows the book
        """
        try:
            # Call AI service to check book knowledge
            prompt = f"Do you have knowledge about the book '{title}'"
            if author:
                prompt += f" by {author}"
            prompt += "? Please respond with just 'yes' or 'no'."

            response = await self.ai_service.check_book_knowledge(prompt)
            return response.lower().strip() == "yes"
        except Exception as e:
            logger.error(f"Error checking AI knowledge: {str(e)}")
            return False

    async def _process_upload(self, upload_id: uuid.UUID):
        """
        Process uploaded book file (async background task)

        Args:
            upload_id: Upload ID
        """
        async with AsyncSession(self.db.bind) as session:
            try:
                # Get upload record
                upload = await session.get(Upload, upload_id)
                if not upload:
                    return

                # Update status to processing
                upload.status = UploadStatus.PROCESSING
                upload.started_at = datetime.utcnow()
                await session.commit()

                # Processing steps
                steps = [
                    (ProcessingStep.AI_DETECTION, self._step_ai_detection),
                    (ProcessingStep.TEXT_PREPROCESSING, self._step_text_preprocessing),
                    (ProcessingStep.CHAPTER_EXTRACTION, self._step_chapter_extraction),
                    (ProcessingStep.CHARACTER_EXTRACTION, self._step_character_extraction),
                ]

                # Only add vectorization if book is not AI-known
                if not upload.ai_known:
                    steps.extend([
                        (ProcessingStep.VECTORIZATION, self._step_vectorization),
                        (ProcessingStep.INDEXING, self._step_indexing),
                    ])

                # Execute processing steps
                for step_type, step_func in steps:
                    try:
                        upload.add_processing_step(
                            step_type, StepStatus.PROCESSING, 0
                        )
                        await session.commit()

                        # Execute step
                        await step_func(upload, session)

                        upload.add_processing_step(
                            step_type, StepStatus.COMPLETED, 100
                        )
                        await session.commit()

                    except Exception as e:
                        logger.error(f"Error in {step_type.value}: {str(e)}")
                        upload.add_processing_step(
                            step_type, StepStatus.FAILED, 0, str(e)
                        )
                        upload.status = UploadStatus.FAILED
                        upload.error_message = str(e)
                        await session.commit()
                        return

                # Create book record
                book = await self._create_book_from_upload(upload, session)
                upload.book_id = book.id

                # Award points
                upload.points_earned = 100 if not upload.ai_known else 50

                # Mark as completed
                upload.status = UploadStatus.COMPLETED
                upload.completed_at = datetime.utcnow()
                await session.commit()

                logger.info(f"Upload {upload_id} processed successfully")

            except Exception as e:
                logger.error(f"Error processing upload {upload_id}: {str(e)}")
                if upload:
                    upload.status = UploadStatus.FAILED
                    upload.error_message = str(e)
                    await session.commit()

    async def _step_ai_detection(self, upload: Upload, session: AsyncSession):
        """AI detection step"""
        # Already done during upload
        pass

    async def _step_text_preprocessing(self, upload: Upload, session: AsyncSession):
        """Text preprocessing step"""
        # TODO: Implement text extraction and cleaning
        await asyncio.sleep(1)  # Simulate processing

    async def _step_chapter_extraction(self, upload: Upload, session: AsyncSession):
        """Chapter extraction step"""
        # TODO: Implement chapter detection and extraction
        await asyncio.sleep(1)  # Simulate processing

    async def _step_character_extraction(self, upload: Upload, session: AsyncSession):
        """Character extraction step"""
        # TODO: Implement character detection
        # For now, simulate with sample characters
        upload.extracted_characters = ["Main Character", "Supporting Character"]
        await asyncio.sleep(1)  # Simulate processing

    async def _step_vectorization(self, upload: Upload, session: AsyncSession):
        """Vectorization step"""
        # TODO: Implement actual vectorization
        upload.vector_count = 1000  # Simulated
        await asyncio.sleep(2)  # Simulate processing

    async def _step_indexing(self, upload: Upload, session: AsyncSession):
        """Indexing step"""
        # TODO: Implement vector database indexing
        await asyncio.sleep(1)  # Simulate processing

    async def _create_book_from_upload(
        self,
        upload: Upload,
        session: AsyncSession
    ) -> Book:
        """
        Create book record from upload

        Args:
            upload: Upload record
            session: Database session

        Returns:
            Created book record
        """
        book = Book(
            id=uuid.uuid4(),
            book_id=f"book_{uuid.uuid4().hex[:8]}",
            title=upload.title,
            author=upload.author,
            category=upload.category,
            description=upload.description,
            type="ai_known" if upload.ai_known else "vectorized",
            status="published",
            source="user_upload",
            uploader_id=upload.user_id,
            dialogue_count=0,
            rating=0.0,
            created_at=datetime.utcnow()
        )

        session.add(book)
        await session.commit()

        return book


# Export service
__all__ = ["UploadService"]