# Auth Service UserRole Enum Patch

This directory contains a patch for the UserRole enum in the auth service to address a case sensitivity issue between the database and the auth service model.

## Issue

The database uses lowercase enum values for the `userrole` enum (`'user'`, `'admin'`, `'moderator'`), but the auth service model was using uppercase enum names (`USER`, `ADMIN`, `MODERATOR`).

## Solution

The patch changes the UserRole enum to use lowercase values as enum names while keeping the string values the same:

```python
class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"
    moderator = "moderator"
```

## How to Apply the Patch

1. Copy the `user_role_patch.py` file to the auth service app directory
2. Update the imports in `models.py` to use the patched version:

```python
# Change this line:
from enum import Enum

# To:
from app.user_role_patch import UserRole, AuditLogAction
```

3. Remove the original UserRole and AuditLogAction enum definitions from `models.py`
4. Restart the auth service

## Alternative Solutions

An alternative solution would be to update the database enum to use uppercase values, but this would require more complex migrations and potential downtime.

## Migration Script

A migration script has been created at `/database/init/07-fix-auth-service-issues.sql` that addresses this issue and ensures the email_verified_at column exists.
