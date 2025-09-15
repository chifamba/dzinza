"""Pydantic schemas for localization_service."""

from pydantic import BaseModel
from typing import Optional

class TranslationEntry(BaseModel):
    key: str
    value: str
    language: str
    version: Optional[int] = 1
