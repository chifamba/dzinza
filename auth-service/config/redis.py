import os
import redis

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# Read password from file if specified
REDIS_PASSWORD_FILE = os.getenv("REDIS_PASSWORD_FILE")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

if REDIS_PASSWORD_FILE and os.path.exists(REDIS_PASSWORD_FILE):
    try:
        with open(REDIS_PASSWORD_FILE, 'r') as f:
            REDIS_PASSWORD = f.read().strip()
    except Exception as e:
        print(f"Warning: Could not read Redis password file: {e}")
        REDIS_PASSWORD = ""

# Create Redis connection
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD if REDIS_PASSWORD else None,
    decode_responses=True
)


def get_redis():
    """
    Dependency to get a Redis client.
    """
    return redis_client
