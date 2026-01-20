"""
Configuration for Help Support Service
"""

import os

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "dzinza_db")
DB_USER = os.getenv("DB_USER", "dzinza_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "secure_password_123")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redis_secure_password_789")

# MongoDB Configuration
MONGODB_HOST = os.getenv("MONGODB_HOST", "mongodb")
MONGODB_PORT = int(os.getenv("MONGODB_PORT", "27017"))
MONGODB_USER = os.getenv("MONGODB_USER", "dzinza_user")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD", "mongo_secure_password_456")
MONGODB_HELP_DB = os.getenv("MONGODB_HELP_DB", "dzinza_help")

# Service Configuration
SERVICE_NAME = "help_support_service"
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8000"))

# Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Chat Configuration
CHAT_MAX_CONNECTIONS = int(os.getenv("CHAT_MAX_CONNECTIONS", "100"))
CHAT_TIMEOUT_MINUTES = int(os.getenv("CHAT_TIMEOUT_MINUTES", "30"))
