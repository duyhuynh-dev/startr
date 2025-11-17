"""Custom exceptions for the application."""


class AppException(Exception):
    """Base application exception."""
    
    def __init__(self, message: str, status_code: int = 500, details: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppException):
    """Resource not found."""
    
    def __init__(self, resource: str, identifier: str, details: dict | None = None):
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message, status_code=404, details=details)


class ValidationError(AppException):
    """Validation error."""
    
    def __init__(self, message: str, field: str | None = None, details: dict | None = None):
        super().__init__(message, status_code=400, details=details)
        self.field = field


class UnauthorizedError(AppException):
    """Unauthorized access."""
    
    def __init__(self, message: str = "Unauthorized", details: dict | None = None):
        super().__init__(message, status_code=401, details=details)


class ForbiddenError(AppException):
    """Forbidden access."""
    
    def __init__(self, message: str = "Forbidden", details: dict | None = None):
        super().__init__(message, status_code=403, details=details)


class ConflictError(AppException):
    """Resource conflict (e.g., duplicate)."""
    
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message, status_code=409, details=details)


class InternalServerError(AppException):
    """Internal server error."""
    
    def __init__(self, message: str = "Internal server error", details: dict | None = None):
        super().__init__(message, status_code=500, details=details)

