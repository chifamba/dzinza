# Dzinza Database Initialization Scripts

This directory contains SQL scripts to initialize and manage the PostgreSQL database for the Dzinza application.

## Script Overview

The database initialization has been consolidated into three optimized scripts:

1. **01-schema.sql** - Database structure including:

   - Tables, columns, and constraints
   - User-defined types and enums
   - Functions and triggers
   - Indexes for performance optimization

2. **02-data.sql** - Initial seed data:

   - Default admin and test users
   - Default family trees
   - Reference data needed for application functionality

3. **03-cleanup.sql** - Migration and cleanup script:
   - Safely removes deprecated columns
   - Fixes data inconsistencies
   - Ensures proper data migration between schema versions
   - Handles enum value updates

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

These scripts are automatically executed when the PostgreSQL container is started for the first time, in alphabetical order. The Docker setup uses the init scripts in this directory.

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

1. Add your changes to the appropriate script
2. For backward-incompatible changes, add migration logic to `03-cleanup.sql`
3. Test the scripts on a development database before committing
4. Document significant changes in the commit message

## Troubleshooting

If you encounter errors when running these scripts:

1. Check that the PostgreSQL server is running
2. Verify the user has sufficient privileges
3. Look for syntax errors in the SQL scripts
4. Check if tables or columns already exist
5. Run the scripts in the correct order

For detailed PostgreSQL logs, use the VS Code task "🗄️ View Database Logs".
