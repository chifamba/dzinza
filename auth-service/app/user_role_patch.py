"""
Hotfix patch for UserRole enum in auth service.

This patch addresses the case sensitivity issue between the userrole enum
in the database (lowercase) and the UserRole enum in the auth service model (uppercase).

The patch changes the UserRole enum to use lowercase values as enum names
while keeping the string values the same.
"""
import enum

class UserRole(str, enum.Enum):
    """User role enum with lowercase values to match database."""
    user = "user"
    admin = "admin"
    moderator = "moderator"

class AuditLogAction(str, enum.Enum):
    """Audit log action types."""
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGE = "password_change"
    EMAIL_VERIFICATION = "email_verification"
    PROFILE_UPDATE = "profile_update"
    ACCOUNT_LOCK = "account_lock"
    ACCOUNT_UNLOCK = "account_unlock"
    MFA_ENABLE = "mfa_enable"
    MFA_DISABLE = "mfa_disable"
    API_KEY_CREATE = "api_key_create"
    API_KEY_DELETE = "api_key_delete"
    PERMISSIONS_CHANGE = "permissions_change"
