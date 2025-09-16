"""
File validation utilities for upload system
Provides security checks and content validation
"""
import os
import hashlib
import re
from typing import Optional, Tuple, BinaryIO
import chardet
from pathlib import Path

# Alternative to python-magic for basic file type detection
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False


class FileValidator:
    """File validation and security utilities"""

    # Dangerous patterns to check in files
    DANGEROUS_PATTERNS = [
        rb'<script',  # JavaScript
        rb'javascript:',  # JavaScript protocol
        rb'on\w+\s*=',  # Event handlers
        rb'<%',  # Server-side code
        rb'<?php',  # PHP code
        rb'#!/',  # Shell scripts
    ]

    # Magic bytes for file type detection
    FILE_SIGNATURES = {
        'pdf': b'%PDF',
        'txt': None,  # Text files don't have a specific signature
    }

    # Maximum file sizes (in bytes)
    MAX_SIZES = {
        'txt': 10 * 1024 * 1024,  # 10MB
        'pdf': 50 * 1024 * 1024,  # 50MB
    }

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent directory traversal and other attacks

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path components
        filename = os.path.basename(filename)

        # Remove special characters except dots and underscores
        filename = re.sub(r'[^\w\s.-]', '', filename)

        # Replace spaces with underscores
        filename = filename.replace(' ', '_')

        # Remove multiple dots (prevent extension confusion)
        filename = re.sub(r'\.+', '.', filename)

        # Limit length
        max_length = 100
        if len(filename) > max_length:
            name, ext = os.path.splitext(filename)
            filename = name[:max_length - len(ext)] + ext

        return filename

    @staticmethod
    def get_file_extension(filename: str) -> Optional[str]:
        """
        Get file extension from filename

        Args:
            filename: Filename to check

        Returns:
            File extension or None
        """
        if '.' not in filename:
            return None
        return filename.rsplit('.', 1)[1].lower()

    @staticmethod
    def validate_extension(filename: str, allowed_extensions: list) -> bool:
        """
        Validate file extension

        Args:
            filename: Filename to check
            allowed_extensions: List of allowed extensions

        Returns:
            True if extension is allowed
        """
        ext = FileValidator.get_file_extension(filename)
        return ext in allowed_extensions if ext else False

    @staticmethod
    def validate_mime_type(file_path: str, allowed_types: list) -> Tuple[bool, str]:
        """
        Validate file MIME type

        Args:
            file_path: Path to file
            allowed_types: List of allowed MIME types

        Returns:
            Tuple of (is_valid, detected_mime_type)
        """
        try:
            if HAS_MAGIC:
                mime = magic.Magic(mime=True)
                mime_type = mime.from_file(file_path)
                is_valid = mime_type in allowed_types
                return is_valid, mime_type
            else:
                # Fallback: detect by file extension
                file_ext = Path(file_path).suffix.lower()
                extension_to_mime = {
                    '.txt': 'text/plain',
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
                mime_type = extension_to_mime.get(file_ext, 'application/octet-stream')
                is_valid = mime_type in allowed_types
                return is_valid, mime_type
        except Exception as e:
            return False, str(e)

    @staticmethod
    def validate_file_size(file_path: str, max_size: int) -> Tuple[bool, int]:
        """
        Validate file size

        Args:
            file_path: Path to file
            max_size: Maximum allowed size in bytes

        Returns:
            Tuple of (is_valid, actual_size)
        """
        try:
            size = os.path.getsize(file_path)
            return size <= max_size, size
        except Exception:
            return False, 0

    @staticmethod
    def check_file_content(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Check file content for malicious patterns

        Args:
            file_path: Path to file

        Returns:
            Tuple of (is_safe, warning_message)
        """
        try:
            with open(file_path, 'rb') as f:
                # Read first 8KB for pattern checking
                content = f.read(8192)

                # Check for dangerous patterns
                for pattern in FileValidator.DANGEROUS_PATTERNS:
                    if pattern in content.lower():
                        return False, f"Potentially dangerous pattern detected: {pattern}"

            return True, None
        except Exception as e:
            return False, f"Error reading file: {str(e)}"

    @staticmethod
    def detect_encoding(file_path: str) -> Optional[str]:
        """
        Detect text file encoding

        Args:
            file_path: Path to text file

        Returns:
            Detected encoding or None
        """
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Read first 10KB
                result = chardet.detect(raw_data)
                return result['encoding'] if result['confidence'] > 0.7 else 'utf-8'
        except Exception:
            return 'utf-8'

    @staticmethod
    def calculate_hash(file_path: str, algorithm: str = 'sha256') -> str:
        """
        Calculate file hash for integrity checking

        Args:
            file_path: Path to file
            algorithm: Hash algorithm to use

        Returns:
            File hash as hex string
        """
        hash_obj = hashlib.new(algorithm)
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()

    @staticmethod
    def validate_pdf(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate PDF file structure

        Args:
            file_path: Path to PDF file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            with open(file_path, 'rb') as f:
                # Check PDF header
                header = f.read(4)
                if header != b'%PDF':
                    return False, "Invalid PDF header"

                # Check for EOF marker (basic validation)
                f.seek(-1024, os.SEEK_END)
                tail = f.read()
                if b'%%EOF' not in tail:
                    return False, "PDF file appears to be truncated"

            return True, None
        except Exception as e:
            return False, f"Error validating PDF: {str(e)}"

    @staticmethod
    def validate_text_file(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate text file

        Args:
            file_path: Path to text file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            encoding = FileValidator.detect_encoding(file_path)
            with open(file_path, 'r', encoding=encoding) as f:
                # Try to read the file as text
                f.read(1024)  # Read first 1KB as validation
            return True, None
        except UnicodeDecodeError:
            return False, "File contains invalid text encoding"
        except Exception as e:
            return False, f"Error validating text file: {str(e)}"

    @classmethod
    def validate_upload(cls, file_path: str, filename: str,
                       allowed_extensions: list, allowed_mime_types: list,
                       max_size: Optional[int] = None) -> Tuple[bool, Optional[str]]:
        """
        Complete file validation for uploads

        Args:
            file_path: Path to uploaded file
            filename: Original filename
            allowed_extensions: List of allowed file extensions
            allowed_mime_types: List of allowed MIME types
            max_size: Maximum file size in bytes

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check extension
        if not cls.validate_extension(filename, allowed_extensions):
            return False, f"File type not allowed. Allowed types: {allowed_extensions}"

        # Check MIME type
        is_valid, mime_type = cls.validate_mime_type(file_path, allowed_mime_types)
        if not is_valid:
            return False, f"Invalid MIME type: {mime_type}"

        # Check file size
        ext = cls.get_file_extension(filename)
        size_limit = max_size or cls.MAX_SIZES.get(ext, 10 * 1024 * 1024)
        is_valid, size = cls.validate_file_size(file_path, size_limit)
        if not is_valid:
            return False, f"File size ({size} bytes) exceeds limit ({size_limit} bytes)"

        # Check for malicious content
        is_safe, warning = cls.check_file_content(file_path)
        if not is_safe:
            return False, warning

        # Type-specific validation
        if ext == 'pdf':
            is_valid, error = cls.validate_pdf(file_path)
            if not is_valid:
                return False, error
        elif ext == 'txt':
            is_valid, error = cls.validate_text_file(file_path)
            if not is_valid:
                return False, error

        return True, None


# Export main class
__all__ = ["FileValidator"]