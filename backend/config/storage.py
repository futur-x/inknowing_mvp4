"""
Storage configuration for file uploads
Supports local filesystem and S3-compatible storage
"""
import os
from typing import Optional
from enum import Enum
from pydantic import Field
from pydantic_settings import BaseSettings


class StorageBackend(str, Enum):
    """Available storage backends"""
    LOCAL = "local"
    S3 = "s3"
    MINIO = "minio"
    ALIYUN_OSS = "aliyun_oss"


class StorageConfig(BaseSettings):
    """Storage configuration settings"""

    # Storage backend selection
    STORAGE_BACKEND: StorageBackend = Field(
        default=StorageBackend.LOCAL,
        description="Storage backend to use"
    )

    # Local storage settings
    LOCAL_UPLOAD_PATH: str = Field(
        default="/tmp/uploads",
        description="Local directory for file uploads"
    )
    LOCAL_TEMP_PATH: str = Field(
        default="/tmp/uploads/temp",
        description="Temporary directory for processing"
    )

    # S3-compatible storage settings
    S3_ENDPOINT_URL: Optional[str] = Field(
        default=None,
        description="S3 endpoint URL (for MinIO or other S3-compatible services)"
    )
    S3_ACCESS_KEY: Optional[str] = Field(
        default=None,
        description="S3 access key ID"
    )
    S3_SECRET_KEY: Optional[str] = Field(
        default=None,
        description="S3 secret access key"
    )
    S3_BUCKET_NAME: str = Field(
        default="inknowing-uploads",
        description="S3 bucket name for uploads"
    )
    S3_REGION: str = Field(
        default="us-east-1",
        description="S3 region"
    )
    S3_USE_SSL: bool = Field(
        default=True,
        description="Whether to use SSL for S3 connections"
    )

    # Aliyun OSS settings (if using Aliyun)
    OSS_ENDPOINT: Optional[str] = Field(
        default=None,
        description="Aliyun OSS endpoint"
    )
    OSS_ACCESS_KEY_ID: Optional[str] = Field(
        default=None,
        description="Aliyun OSS access key ID"
    )
    OSS_ACCESS_KEY_SECRET: Optional[str] = Field(
        default=None,
        description="Aliyun OSS access key secret"
    )
    OSS_BUCKET_NAME: Optional[str] = Field(
        default=None,
        description="Aliyun OSS bucket name"
    )

    # File upload settings
    MAX_UPLOAD_SIZE: int = Field(
        default=10 * 1024 * 1024,  # 10MB
        description="Maximum file size in bytes"
    )
    MAX_UPLOAD_SIZE_PDF: int = Field(
        default=50 * 1024 * 1024,  # 50MB for PDFs
        description="Maximum PDF file size in bytes"
    )
    ALLOWED_EXTENSIONS: list[str] = Field(
        default=["txt", "pdf"],
        description="Allowed file extensions"
    )
    ALLOWED_MIME_TYPES: list[str] = Field(
        default=[
            "text/plain",
            "application/pdf",
            "text/markdown",
            "text/html",
        ],
        description="Allowed MIME types"
    )

    # File processing settings
    CHUNK_SIZE: int = Field(
        default=8192,
        description="Chunk size for file reading/writing"
    )
    CLEANUP_TEMP_FILES: bool = Field(
        default=True,
        description="Whether to automatically cleanup temporary files"
    )
    TEMP_FILE_TTL: int = Field(
        default=3600,  # 1 hour
        description="Time to live for temporary files in seconds"
    )

    # Security settings
    ENABLE_VIRUS_SCAN: bool = Field(
        default=False,
        description="Whether to enable virus scanning for uploads"
    )
    ENABLE_CONTENT_VALIDATION: bool = Field(
        default=True,
        description="Whether to validate file content matches extension"
    )
    SANITIZE_FILENAMES: bool = Field(
        default=True,
        description="Whether to sanitize uploaded filenames"
    )

    # URL generation
    UPLOAD_URL_EXPIRES: int = Field(
        default=3600,  # 1 hour
        description="Expiration time for signed upload URLs in seconds"
    )
    DOWNLOAD_URL_EXPIRES: int = Field(
        default=7200,  # 2 hours
        description="Expiration time for signed download URLs in seconds"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    def ensure_directories(self):
        """Ensure required directories exist for local storage"""
        if self.STORAGE_BACKEND == StorageBackend.LOCAL:
            os.makedirs(self.LOCAL_UPLOAD_PATH, exist_ok=True)
            os.makedirs(self.LOCAL_TEMP_PATH, exist_ok=True)
            # Create subdirectories for organization
            for subdir in ["books", "avatars", "covers", "temp"]:
                os.makedirs(os.path.join(self.LOCAL_UPLOAD_PATH, subdir), exist_ok=True)

    def get_upload_path(self, file_type: str = "books") -> str:
        """Get the upload path for a specific file type"""
        if self.STORAGE_BACKEND == StorageBackend.LOCAL:
            return os.path.join(self.LOCAL_UPLOAD_PATH, file_type)
        else:
            # For S3-compatible storage, return the prefix
            return f"{file_type}/"

    def get_max_size_for_type(self, file_extension: str) -> int:
        """Get maximum allowed size for a file type"""
        if file_extension.lower() == "pdf":
            return self.MAX_UPLOAD_SIZE_PDF
        return self.MAX_UPLOAD_SIZE

    def is_extension_allowed(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        if "." not in filename:
            return False
        extension = filename.rsplit(".", 1)[1].lower()
        return extension in self.ALLOWED_EXTENSIONS

    def is_mime_type_allowed(self, mime_type: str) -> bool:
        """Check if MIME type is allowed"""
        return mime_type in self.ALLOWED_MIME_TYPES

    @property
    def use_s3(self) -> bool:
        """Check if S3-compatible storage is being used"""
        return self.STORAGE_BACKEND in [
            StorageBackend.S3,
            StorageBackend.MINIO,
            StorageBackend.ALIYUN_OSS
        ]


# Create global storage configuration instance
storage_config = StorageConfig()

# Ensure directories exist on startup
storage_config.ensure_directories()