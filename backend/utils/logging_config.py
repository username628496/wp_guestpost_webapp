"""
Structured logging configuration
Provides consistent logging across the application with JSON format support
"""
import logging
import sys
import json
from datetime import datetime
from typing import Dict, Any


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs logs in structured JSON format"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # Add extra fields from LogRecord
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)

        return json.dumps(log_data, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """Formatter with colors for console output"""

    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m'    # Magenta
    }
    RESET = '\033[0m'

    def format(self, record: logging.LogRecord) -> str:
        """Format with colors"""
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(
    level: str = 'INFO',
    log_format: str = 'standard',
    log_file: str = None,
    enable_colors: bool = True
) -> logging.Logger:
    """
    Setup structured logging for the application

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: 'standard' or 'json'
        log_file: Optional path to log file
        enable_colors: Enable colored output for console (only for standard format)

    Returns:
        Configured logger instance
    """
    # Get root logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)

    if log_format == 'json':
        console_formatter = StructuredFormatter()
    else:
        if enable_colors and sys.stdout.isatty():
            console_formatter = ColoredFormatter(
                '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        else:
            console_formatter = logging.Formatter(
                '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )

    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] [%(module)s:%(funcName)s:%(lineno)d] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """
    Custom logger adapter for adding contextual information to logs
    """

    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Add extra fields to log record"""
        if 'extra' not in kwargs:
            kwargs['extra'] = {}

        # Add context from adapter
        kwargs['extra'].update(self.extra)

        return msg, kwargs


def create_logger_with_context(**context) -> LoggerAdapter:
    """
    Create a logger with contextual information

    Args:
        **context: Key-value pairs to add to all log messages

    Returns:
        LoggerAdapter with context

    Example:
        logger = create_logger_with_context(user_id=123, request_id='abc')
        logger.info('User action')  # Will include user_id and request_id
    """
    base_logger = logging.getLogger()
    return LoggerAdapter(base_logger, context)


# Initialize default logger
default_logger = setup_logging(
    level='INFO',
    log_format='standard',
    enable_colors=True
)
