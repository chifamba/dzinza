"""
This module contains a modified RefreshToken model that includes the token field.
"""

from sqlalchemy import Column, String
from app.models import RefreshToken


# Add the token column to the RefreshToken model
if not hasattr(RefreshToken, 'token'):
    RefreshToken.token = Column(String, unique=True, index=True, nullable=True)


def apply_refresh_token_patches():
    """
    Apply patches to the RefreshToken model.
    """
    # This function is intentionally left empty as the column is added
    # when the module is imported
    pass
