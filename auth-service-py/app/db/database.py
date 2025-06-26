from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

DATABASE_URL = str(settings.DATABASE_URI)

# Use NullPool for async, as recommended by SQLAlchemy docs for some async setups
# to avoid issues with event loops and connections.
# For production, you might want to configure pool settings carefully.
engine = create_async_engine(DATABASE_URL, poolclass=NullPool) # echo=True for debugging SQL

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # Important for FastAPI background tasks or when objects are accessed after commit
)

Base = declarative_base()

# Dependency to get DB session
async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# For Alembic migrations (sync engine)
# Alembic needs a sync engine to work with.
# We can define it here or in alembic/env.py
# from sqlalchemy import create_engine
# SYNC_DATABASE_URL = str(settings.DATABASE_URI).replace("postgresql+asyncpg", "postgresql")
# sync_engine = create_engine(SYNC_DATABASE_URL)
