from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Setup structured logging
from utils.logging_config import setup_logging, get_logger
log_level = os.getenv('LOG_LEVEL', 'INFO')
log_format = os.getenv('LOG_FORMAT', 'standard')  # 'standard' or 'json'
log_file = os.getenv('LOG_FILE', None)
setup_logging(level=log_level, log_format=log_format, log_file=log_file)
logger = get_logger(__name__)

from utils.error_handlers import register_error_handlers
from models.database import init_db, cleanup_old_working_sessions
from routes.check_index import bp as check_index_bp
from routes.history import bp as history_bp
from routes.wordpress import bp as wordpress_bp
from routes.wp_sites import bp as wp_sites_bp
from routes.editor_sessions import bp as editor_sessions_bp
from routes.auth import bp as auth_bp

app = Flask(__name__)

# CORS Configuration
# Allow specific origins for security
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
CORS(app,
     origins=ALLOWED_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Register error handlers
register_error_handlers(app)

# Khởi tạo DB
init_db()

# Run cleanup on startup
logger.info("Running cleanup of old working sessions...")
deleted_count = cleanup_old_working_sessions()
logger.info(f"Cleanup completed. Deleted {deleted_count} old working sessions.")

# Đăng ký routes
app.register_blueprint(auth_bp)
app.register_blueprint(check_index_bp)
app.register_blueprint(history_bp)
app.register_blueprint(wordpress_bp)
app.register_blueprint(wp_sites_bp)
app.register_blueprint(editor_sessions_bp)

@app.route("/")
def home():
    return {"message": "Guest Post Tool Backend is running"}

@app.route("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Guest Post Tool API",
        "version": "1.0.0"
    }, 200

if __name__ == "__main__":
    logger.info("Starting Guest Post Tool backend server...")
    # Get debug mode from environment variable (default False for production)
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('PORT', '5050'))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)