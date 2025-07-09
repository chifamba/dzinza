## Login Flow Testing Issues

### 1. Auth Service Enum Issue

The auth service is failing to start due to duplicate enum values in the `AuditLogAction` enum in `user_role_patch.py`:

```
TypeError: 'API_KEY_CREATE' already defined as 'api_key_create'
```

This needs to be fixed before we can test the login flow.

### 2. Nginx Proxy Configuration

The frontend Nginx proxy configuration needed to be updated to preserve the `/api` path when forwarding to the backend service. The change was made in `nginx.conf`:

```nginx
# Changed from
proxy_pass http://172.18.0.17:8000/;

# Changed to
proxy_pass http://172.18.0.17:8000;
```

### 3. Database Schema Changes

A database migration script (`06-fix-role-enum-mismatch.sql`) was created to document the issue with the enum mismatch between the SQLAlchemy model and the database.

Two solutions were proposed:

1. Update the database enum to use uppercase values (long-term solution)
2. Update the auth service model to use lowercase values (short-term hotfix)

We chose to implement solution #2 as a temporary fix by creating a patch file `user_role_patch.py`.

The script also ensures that the `email_verified_at` column exists in the `users` table.

### Next Steps

1. Fix the duplicate enum values in the `AuditLogAction` enum in `user_role_patch.py`
2. Restart the auth service
3. Test the login flow with curl:
   ```
   curl -i -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email": "admin@dzinza.org", "password": "admin123"}'
   ```
