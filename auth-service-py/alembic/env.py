import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add project root to sys.path to find app modules
# Assuming 'alembic' directory is at 'auth-service-py/alembic'
# and 'app' is at 'auth-service-py/app'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, project_root)

# Import Base from your application's models
# This allows Alembic to auto-generate migrations based on model changes.
from app.db.database import Base as TargetBase # Renamed to avoid conflict with Alembic's Base
from app.db.models import user_model, token_model # Ensure all models are imported here
from app.core.config import settings # To get database URL

# Configure the database URL.
# Prefer loading from your application's settings or environment variables.
# This ensures consistency between your app and migrations.
# The format in alembic.ini for sqlalchemy.url is:
# sqlalchemy.url = driver://user:pass@host/dbname
# We will construct it from our Pydantic settings.
# Alembic needs a synchronous database URL.
sync_db_url = str(settings.DATABASE_URI).replace("postgresql+asyncpg", "postgresql")
config.set_main_option("sqlalchemy.url", sync_db_url)


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=TargetBase.metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=TargetBase.metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
