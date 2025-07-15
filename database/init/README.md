# Dzinza Database Initialization Scripts

This directory contains SQL scripts to initialize and manage the PostgreSQL database for the Dzinza application.

## Script Overview

The database initialization and migration scripts must be run in the following order:

1. **01-schema.sql** - Base schema (tables, types, functions, indexes)
2. **04-auth-schema-patch.sql** - Auth-related columns/tables
3. **05-auth-audit-logs.sql** - Audit logs table (if present)
4. **06-username-nullable-patch.sql** - Username column patch
5. **07-create-missing-tables.sql** - Create any missing tables (e.g., audit_logs, refresh_tokens)
6. **08-sync-models.sql** - Patch columns and add comments to ensure schema matches application models
7. **02-data.sql** - Initial seed data
8. **03-cleanup.sql** - Cleanup and migration logic

> **Note:** Always ensure table creation scripts are executed before any patch scripts that add columns or comments to those tables. This prevents migration errors and ensures a consistent schema.

## Usage

### For Development Environments

Run these scripts in sequential order:

```bash
# Connect to the database
psql -U dzinza_user -d dzinza_db

# Or use the VS Code task
# "🗄️ Connect to PostgreSQL"

# Then run the scripts in order
\i /path/to/01-schema.sql
\i /path/to/02-data.sql
\i /path/to/03-cleanup.sql
```

### For Docker Environments

These scripts are automatically executed when the PostgreSQL container is started for the first time, in alphabetical order. **Rename scripts as needed to enforce the correct order.**

### Initial Login Credentials

After running the scripts, you can log in with:

- Admin User:

  - Email: `admin@dzinza.org`
  - Password: `AdminPassword123!`

- Test User:
  - Email: `test@dzinza.com`
  - Password: `TestPassword123!`

**Note:** For production deployments, change these default passwords immediately after first login.

## Schema Overview

The database schema supports the following features:

- User authentication and profile management
- DNA test results and matching
- Family trees and genealogy data
- File storage metadata (synced with MongoDB)
- Historical records and sources
- Subscription and billing management

## Maintenance

When making schema changes:

1. Add new tables in a new script with a lower number than any patch scripts.
2. Add column or comment patches in a script that runs after table creation.
3. For backward-incompatible changes, add migration logic to `03-cleanup.sql`.
4. Test the scripts on a development database before committing.
5. Document significant changes in the commit message

## Troubleshooting

If you encounter errors when running these scripts:

1. Check that the PostgreSQL server is running
2. Verify the user has sufficient privileges
3. Look for syntax errors in the SQL scripts
4. Check if tables or columns already exist
5. Run the scripts in the correct order

For detailed PostgreSQL logs, use the VS Code task "🗄️ View Database Logs".
