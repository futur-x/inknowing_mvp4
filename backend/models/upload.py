"""
Upload model for book uploads
Based on API specification Upload schema
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text,
    ForeignKey, Enum as SQLEnum, JSON, DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime

from backend.config.database import Base


class FileType(str, enum.Enum):
    """Allowed file types for uploads"""
    TXT = "txt"
    PDF = "pdf"


class UploadStatus(str, enum.Enum):
    """Upload processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStep(str, enum.Enum):
    """Processing step types"""
    AI_DETECTION = "ai_detection"
    TEXT_PREPROCESSING = "text_preprocessing"
    CHAPTER_EXTRACTION = "chapter_extraction"
    CHARACTER_EXTRACTION = "character_extraction"
    VECTORIZATION = "vectorization"
    INDEXING = "indexing"
    MODEL_GENERATION = "model_generation"


class StepStatus(str, enum.Enum):
    """Processing step status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Upload(Base):
    """Upload model for tracking user book uploads"""
    __tablename__ = "uploads"
    __table_args__ = {"schema": "content"}

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(UUID(as_uuid=True), ForeignKey("content.books.id", ondelete="SET NULL"), nullable=True, index=True)

    # File Information
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    file_type = Column(SQLEnum(FileType), nullable=False)
    file_path = Column(String(500), nullable=True)  # storage path

    # Book Metadata
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Processing Status
    status = Column(SQLEnum(UploadStatus), nullable=False, default=UploadStatus.PENDING, index=True)
    processing_steps = Column(JSON, nullable=True, default=list)
    # Example structure:
    # [
    #   {
    #     "step": "ai_detection",
    #     "status": "completed",
    #     "progress": 100,
    #     "message": "Book is known to AI",
    #     "started_at": "2024-01-20T10:00:00Z",
    #     "completed_at": "2024-01-20T10:00:05Z"
    #   },
    #   ...
    # ]

    # AI Processing Results
    ai_known = Column(Boolean, nullable=True)  # null until AI detection completes
    vector_count = Column(Integer, nullable=True)  # number of vectors created
    extracted_characters = Column(JSON, nullable=True, default=list)  # list of character names

    # User Rewards
    points_earned = Column(Integer, nullable=False, default=0)

    # Error Tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)  # when processing started
    completed_at = Column(DateTime, nullable=True)  # when processing completed
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    book = relationship("Book", foreign_keys=[book_id])

    def __repr__(self):
        return f"<Upload(id={self.id}, title='{self.title}', status={self.status.value})>"

    def add_processing_step(self, step: ProcessingStep, status: StepStatus,
                           progress: int = 0, message: str = None):
        """Add or update a processing step"""
        if not self.processing_steps:
            self.processing_steps = []

        # Find existing step or create new
        step_data = None
        for s in self.processing_steps:
            if s.get("step") == step.value:
                step_data = s
                break

        if not step_data:
            step_data = {"step": step.value}
            self.processing_steps.append(step_data)

        # Update step data
        step_data["status"] = status.value
        step_data["progress"] = progress
        if message:
            step_data["message"] = message

        # Add timestamps
        if status == StepStatus.PROCESSING and "started_at" not in step_data:
            step_data["started_at"] = datetime.utcnow().isoformat()
        elif status in [StepStatus.COMPLETED, StepStatus.FAILED]:
            step_data["completed_at"] = datetime.utcnow().isoformat()

    def get_processing_progress(self) -> float:
        """Calculate overall processing progress (0-100)"""
        if not self.processing_steps:
            return 0.0

        total_steps = len(ProcessingStep)
        completed_steps = sum(
            1 for step in self.processing_steps
            if step.get("status") == StepStatus.COMPLETED.value
        )

        return (completed_steps / total_steps) * 100

    def to_dict(self, include_steps=False):
        """Convert to dictionary for API responses"""
        data = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "book_id": str(self.book_id) if self.book_id else None,
            "filename": self.filename,
            "file_size": self.file_size,
            "file_type": self.file_type.value,
            "title": self.title,
            "author": self.author,
            "category": self.category,
            "description": self.description,
            "status": self.status.value,
            "ai_known": self.ai_known,
            "vector_count": self.vector_count,
            "extracted_characters": self.extracted_characters,
            "points_earned": self.points_earned,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress": self.get_processing_progress()
        }

        if include_steps:
            data["processing_steps"] = self.processing_steps

        return data