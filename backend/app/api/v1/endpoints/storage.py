"""File storage endpoints for uploads, downloads, and file management."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_session
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.storage import (
    FileDeleteResponse,
    FileUploadResponse,
    SignedUrlRequest,
    SignedUrlResponse,
)
from app.services.storage_service import (
    FileValidationError,
    StorageServiceError,
    storage_service,
)

router = APIRouter()


@router.post(
    "/upload/profile-photo",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload profile photo",
    description="""
    Upload a profile photo image.
    
    **Supported formats:** JPEG, PNG, WebP, GIF
    **Max size:** 10 MB (default, configurable)
    **Image optimization:** Automatically resized and optimized
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/storage/upload/profile-photo" \\
      -H "Authorization: Bearer <token>" \\
      -F "file=@photo.jpg"
    ```
    
    **Response:**
    ```json
    {
        "file_url": "https://...",
        "file_path": "profile-photos/user-id/file-id.jpg",
        "file_size": 245678,
        "content_type": "image/jpeg",
        "metadata": null
    }
    ```
    """,
)
async def upload_profile_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> FileUploadResponse:
    """Upload profile photo."""
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service is not available. Please configure storage settings.",
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Validate file
        content_type, ext = storage_service.validate_file(
            file_content=file_content,
            filename=file.filename or "photo.jpg",
            content_type=file.content_type,
            allowed_types=settings.allowed_image_types,
        )
        
        # Optimize image
        optimized_content = storage_service.optimize_image(file_content)
        
        # Generate file path
        file_path = storage_service.generate_file_path(
            category="profile-photos",
            user_id=user.id,
            filename=file.filename or "photo.jpg",
        )
        
        # Upload file
        file_url = storage_service.upload_file(
            file_content=optimized_content,
            file_path=file_path,
            content_type=content_type,
            metadata={
                "original_filename": file.filename,
                "uploaded_by": user.id,
                "category": "profile-photo",
            },
        )
        
        return FileUploadResponse(
            file_url=file_url,
            file_path=file_path,
            file_size=len(optimized_content),
            content_type=content_type,
        )
        
    except FileValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except StorageServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/upload/verification-doc",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload verification document",
    description="""
    Upload a verification document (PDF, image).
    
    **Supported formats:** PDF, JPEG, PNG
    **Max size:** 10 MB (default)
    
    Used for profile verification and accreditation documents.
    """,
)
async def upload_verification_doc(
    file: UploadFile = File(...),
    doc_type: str = Form(..., description="Document type (e.g., 'id', 'accreditation', 'company_registration')"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> FileUploadResponse:
    """Upload verification document."""
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service is not available.",
        )
    
    try:
        file_content = await file.read()
        
        # Validate file
        content_type, ext = storage_service.validate_file(
            file_content=file_content,
            filename=file.filename or "document.pdf",
            content_type=file.content_type,
            allowed_types=settings.allowed_document_types,
        )
        
        # Generate file path
        file_path = storage_service.generate_file_path(
            category="verification-docs",
            user_id=user.id,
            filename=f"{doc_type}_{file.filename or 'document.pdf'}",
        )
        
        # Upload file
        file_url = storage_service.upload_file(
            file_content=file_content,
            file_path=file_path,
            content_type=content_type,
            metadata={
                "original_filename": file.filename,
                "uploaded_by": user.id,
                "category": "verification-doc",
                "doc_type": doc_type,
            },
        )
        
        return FileUploadResponse(
            file_url=file_url,
            file_path=file_path,
            file_size=len(file_content),
            content_type=content_type,
        )
        
    except FileValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except StorageServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.post(
    "/upload/attachment",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload message attachment",
    description="""
    Upload a file attachment for messages.
    
    **Supported formats:** Images (JPEG, PNG, WebP) and PDFs
    **Max size:** 10 MB
    """,
)
async def upload_attachment(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> FileUploadResponse:
    """Upload message attachment."""
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service is not available.",
        )
    
    try:
        file_content = await file.read()
        
        # Validate file (images and PDFs)
        allowed_types = settings.allowed_image_types + settings.allowed_document_types
        content_type, ext = storage_service.validate_file(
            file_content=file_content,
            filename=file.filename or "attachment",
            content_type=file.content_type,
            allowed_types=allowed_types,
        )
        
        # Optimize if image
        if content_type.startswith("image/"):
            file_content = storage_service.optimize_image(file_content)
        
        # Generate file path
        file_path = storage_service.generate_file_path(
            category="attachments",
            user_id=user.id,
            filename=file.filename or "attachment",
        )
        
        # Upload file
        file_url = storage_service.upload_file(
            file_content=file_content,
            file_path=file_path,
            content_type=content_type,
            metadata={
                "original_filename": file.filename,
                "uploaded_by": user.id,
                "category": "attachment",
            },
        )
        
        return FileUploadResponse(
            file_url=file_url,
            file_path=file_path,
            file_size=len(file_content),
            content_type=content_type,
        )
        
    except FileValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except StorageServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.post(
    "/signed-url",
    response_model=SignedUrlResponse,
    summary="Generate signed URL for file access",
    description="""
    Generate a time-limited signed URL for accessing a file.
    
    Useful for secure file access without making files fully public.
    """,
)
def generate_signed_url(
    request: SignedUrlRequest,
    user: User = Depends(get_current_user),
) -> SignedUrlResponse:
    """Generate signed URL for file access."""
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service is not available.",
        )
    
    try:
        expires = request.expires_in_seconds or settings.signed_url_expire_seconds
        signed_url = storage_service.generate_signed_url(
            file_path=request.file_path,
            expires_in_seconds=expires,
        )
        
        return SignedUrlResponse(
            signed_url=signed_url,
            expires_in_seconds=expires,
        )
    except StorageServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate signed URL: {str(e)}",
        )


@router.delete(
    "/files/{file_path:path}",
    response_model=FileDeleteResponse,
    summary="Delete a file",
    description="""
    Delete a file from storage.
    
    **Note:** Users can only delete their own files. File path must be within their user directory.
    """,
)
def delete_file(
    file_path: str,
    user: User = Depends(get_current_user),
) -> FileDeleteResponse:
    """Delete a file."""
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service is not available.",
        )
    
    # Security: Verify file belongs to user
    if f"/{user.id}/" not in file_path:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own files.",
        )
    
    try:
        deleted = storage_service.delete_file(file_path)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or could not be deleted.",
            )
        
        return FileDeleteResponse(
            message="File deleted successfully.",
            file_path=file_path,
        )
    except StorageServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}",
        )

