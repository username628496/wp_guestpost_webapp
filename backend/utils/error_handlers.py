"""
Centralized error handlers for Flask application
Registers error handlers for common exceptions and custom app exceptions
"""
from flask import jsonify
import logging
from werkzeug.exceptions import HTTPException
from utils.exceptions import AppException

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """
    Register all error handlers with the Flask app

    Args:
        app: Flask application instance
    """

    @app.errorhandler(AppException)
    def handle_app_exception(error):
        """Handle custom application exceptions"""
        logger.warning(f"App exception: {error.message} (status: {error.status_code})")
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle Werkzeug HTTP exceptions (404, 405, etc.)"""
        logger.warning(f"HTTP exception: {error.name} - {error.description}")
        response = jsonify({
            'error': error.description,
            'status_code': error.code
        })
        response.status_code = error.code
        return response

    @app.errorhandler(ValueError)
    def handle_value_error(error):
        """Handle ValueError as bad request"""
        logger.warning(f"ValueError: {str(error)}")
        response = jsonify({
            'error': f'Invalid value: {str(error)}',
            'status_code': 400
        })
        response.status_code = 400
        return response

    @app.errorhandler(KeyError)
    def handle_key_error(error):
        """Handle KeyError as bad request"""
        logger.warning(f"KeyError: {str(error)}")
        response = jsonify({
            'error': f'Missing required field: {str(error)}',
            'status_code': 400
        })
        response.status_code = 400
        return response

    @app.errorhandler(TypeError)
    def handle_type_error(error):
        """Handle TypeError as bad request"""
        logger.warning(f"TypeError: {str(error)}")
        response = jsonify({
            'error': f'Invalid data type: {str(error)}',
            'status_code': 400
        })
        response.status_code = 400
        return response

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Handle any uncaught exceptions"""
        logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        response = jsonify({
            'error': 'Internal server error',
            'status_code': 500,
            'message': str(error) if app.debug else 'An unexpected error occurred'
        })
        response.status_code = 500
        return response

    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 Not Found"""
        response = jsonify({
            'error': 'Resource not found',
            'status_code': 404
        })
        response.status_code = 404
        return response

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 Method Not Allowed"""
        response = jsonify({
            'error': 'Method not allowed',
            'status_code': 405
        })
        response.status_code = 405
        return response

    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle 500 Internal Server Error"""
        logger.error(f"Internal server error: {str(error)}", exc_info=True)
        response = jsonify({
            'error': 'Internal server error',
            'status_code': 500
        })
        response.status_code = 500
        return response

    logger.info("Error handlers registered successfully")
