# Session Management Implementation

This document describes the Redis-based session management system implemented in the auth service.

## Overview

The session management system provides:

- Redis-based session storage for scalability
- IP address and User-Agent tracking for security
- Maximum concurrent session limits
- Session validation and security checks
- Automatic session cleanup

## Key Components

### SessionManager Class (`app/session_manager.py`)

The `SessionManager` class provides the core session management functionality:

- **Session Creation**: Creates new sessions with IP/User-Agent tracking
- **Session Validation**: Validates sessions and checks for security violations
- **Session Revocation**: Revokes individual or all user sessions
- **Session Cleanup**: Removes expired sessions
- **Concurrent Session Limits**: Enforces maximum sessions per user

### Database Schema Enhancements

New fields added to support session management:

#### Users table:

- `last_login_user_agent`: Tracks the user agent of the last login
- `current_session_count`: Current number of active sessions
- `max_concurrent_sessions`: Maximum allowed concurrent sessions (default: 5)

#### RefreshTokens table:

- `session_id`: Links refresh token to Redis session
- `device_fingerprint`: Device identification
- `location_info`: Geographic location information

### Redis Storage Structure

Sessions are stored in Redis with the following structure:

```
session_<uuid> -> {
    "user_id": "uuid",
    "ip_address": "x.x.x.x",
    "user_agent": "browser_string",
    "created_at": "timestamp",
    "last_activity": "timestamp",
    "device_fingerprint": "optional",
    "location_info": "optional"
}

user_sessions:<user_id> -> Set of session IDs for the user
```

## Security Features

### IP Address Validation

- Sessions store the original IP address
- Subsequent requests validate IP consistency
- IP mismatch triggers session revocation

### User-Agent Validation

- Sessions store the original User-Agent
- User-Agent changes trigger security warnings
- Can be configured to revoke sessions on mismatch

### Concurrent Session Limits

- Default maximum: 5 sessions per user
- Configurable per user
- Oldest sessions are revoked when limit exceeded

### Session Expiration

- Sessions automatically expire after inactivity
- Configurable timeout periods
- Background cleanup of expired sessions

## API Integration

### Login Endpoint (`/login`)

- Creates new session in Redis
- Stores IP address and User-Agent
- Enforces maximum session limits
- Updates user login tracking information

### Refresh Endpoint (`/refresh`)

- Validates session security (IP/User-Agent)
- Updates session activity timestamp
- Revokes session on security violations

### Logout Endpoints (`/logout`, `/logout-all`)

- Single logout: Revokes specific session
- Logout all: Revokes all user sessions
- Updates session counts in database

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Session Configuration
SESSION_TIMEOUT_HOURS=24
MAX_CONCURRENT_SESSIONS=5
SESSION_SECURITY_STRICT=true
```

### Settings in `config.py`

```python
class Settings:
    # Session management
    SESSION_TIMEOUT_HOURS: int = 24
    MAX_CONCURRENT_SESSIONS: int = 5
    SESSION_SECURITY_STRICT: bool = True
    SESSION_CLEANUP_INTERVAL_HOURS: int = 1
```

## Usage Examples

### Creating a Session

```python
from app.session_manager import SessionManager

session_manager = SessionManager()

session_id = await session_manager.create_session(
    user_id="user-uuid",
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0..."
)
```

### Validating Session Security

```python
is_valid = await session_manager.validate_session_security(
    session_id,
    current_ip="192.168.1.1",
    current_user_agent="Mozilla/5.0..."
)

if not is_valid:
    # Handle security violation
    await session_manager.revoke_session(session_id)
```

### Enforcing Session Limits

```python
revoked_count = await session_manager.enforce_max_sessions(
    user_id="user-uuid",
    max_sessions=3
)
```

## Testing

The session management system includes comprehensive tests in `tests/test_session_manager.py`:

- Unit tests for all SessionManager methods
- Mock Redis interactions
- Security validation tests
- Session limit enforcement tests
- Cleanup functionality tests

Run tests with:

```bash
cd auth-service
python -m pytest tests/test_session_manager.py -v
```

## Monitoring and Maintenance

### Session Metrics

Monitor these Redis keys for session analytics:

- Active session count: `SCARD user_sessions:<user_id>`
- Total sessions: `SCAN session_*`
- Session data: `GET session_<uuid>`

### Cleanup Tasks

Automated cleanup runs periodically to:

- Remove expired sessions
- Update session counts in database
- Clean up orphaned user session sets

### Performance Considerations

- Redis operations are async for better performance
- Session data is JSON-encoded for flexibility
- Efficient Redis data structures (Sets) for user session tracking
- Configurable timeouts to balance security vs UX

## Security Best Practices

1. **Enable IP validation** for sensitive applications
2. **Set appropriate session timeouts** based on security requirements
3. **Monitor concurrent sessions** for anomalous activity
4. **Regular session cleanup** to prevent Redis bloat
5. **Log security violations** for audit trails
6. **Use HTTPS** to protect session data in transit

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**

   - Check Redis server status
   - Verify connection credentials
   - Ensure Redis is accessible from auth service

2. **Session Validation Failures**

   - Check IP address changes (VPN, mobile networks)
   - Verify User-Agent consistency
   - Review session timeout settings

3. **High Memory Usage**
   - Monitor session count
   - Check cleanup job status
   - Adjust session timeout if needed

### Debug Commands

```bash
# Check Redis session count
redis-cli SCAN 0 MATCH "session_*" COUNT 1000

# View user sessions
redis-cli SMEMBERS "user_sessions:<user_id>"

# Check session data
redis-cli GET "session_<session_id>"
```

## Future Enhancements

- Geographic location tracking
- Device fingerprinting improvements
- Session analytics dashboard
- Advanced anomaly detection
- Integration with SIEM systems
