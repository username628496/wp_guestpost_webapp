"""
Custom exceptions for the application
Provides structured error handling with HTTP status codes
"""


class AppException(Exception):
    """Base exception for all application errors"""
    def __init__(self, message: str, status_code: int = 500, payload: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}

    def to_dict(self):
        """Convert exception to dictionary for JSON response"""
        result = {
            'error': self.message,
            'status_code': self.status_code
        }
        if self.payload:
            result.update(self.payload)
        return result


class ValidationError(AppException):
    """Raised when input validation fails"""
    def __init__(self, message: str, field: str = None):
        payload = {'field': field} if field else {}
        super().__init__(message, status_code=400, payload=payload)


class AuthenticationError(AppException):
    """Raised when authentication fails"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(AppException):
    """Raised when user lacks permission"""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=403)


class NotFoundError(AppException):
    """Raised when resource is not found"""
    def __init__(self, resource: str, resource_id=None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with id {resource_id} not found"
        super().__init__(message, status_code=404)


class ConflictError(AppException):
    """Raised when there's a conflict (e.g., duplicate resource)"""
    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class DatabaseError(AppException):
    """Raised when database operation fails"""
    def __init__(self, message: str = "Database operation failed", original_error=None):
        payload = {}
        if original_error:
            payload['original_error'] = str(original_error)
        super().__init__(message, status_code=500, payload=payload)


class ExternalServiceError(AppException):
    """Raised when external service (e.g., WordPress API) fails"""
    def __init__(self, service: str, message: str, status_code: int = 503):
        full_message = f"{service} error: {message}"
        super().__init__(full_message, status_code=status_code, payload={'service': service})


class RateLimitError(AppException):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = None):
        payload = {}
        if retry_after:
            payload['retry_after'] = retry_after
        super().__init__(message, status_code=429, payload=payload)


class BadRequestError(AppException):
    """Raised for malformed requests"""
    def __init__(self, message: str = "Bad request"):
        super().__init__(message, status_code=400)


class ServerError(AppException):
    """Raised for internal server errors"""
    def __init__(self, message: str = "Internal server error", original_error=None):
        payload = {}
        if original_error:
            payload['original_error'] = str(original_error)
        super().__init__(message, status_code=500, payload=payload)
