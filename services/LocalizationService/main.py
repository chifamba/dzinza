from fastapi import FastAPI, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import jwt

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Localization & Language Service",
    description="API for translation and localization of UI and data.",
    version="1.0.0"
)
logger = setup_logging("LocalizationService")
app.include_router(get_healthcheck_router("LocalizationService"))

# --- Pydantic Models ---
class TranslationResponse(BaseModel):
    translated_phrase: str
    target_language: str

class CalendarSystem(BaseModel):
    name: str
    rules: Dict[str, Any]

class NameParsingRule(BaseModel):
    culture: str
    rules: Dict[str, Any]

# --- Mock Data ---
# In a real application, this data would come from a database or a dedicated localization management system.
MOCK_CALENDAR_SYSTEMS = [
    {"name": "Gregorian", "rules": {"months": 12, "leap_year_rule": "standard"}},
    {"name": "Julian", "rules": {"months": 12, "leap_year_rule": "every_4_years"}}
]

MOCK_NAME_PARSING_RULES = [
    {"culture": "en-US", "rules": {"format": "{given_name} {surname}"}},
    {"culture": "ja-JP", "rules": {"format": "{surname} {given_name}"}}
]

MOCK_TRANSLATIONS = {
    "en": {"hello": "Hello", "goodbye": "Goodbye"},
    "es": {"hello": "Hola", "goodbye": "Adiós"},
    "fr": {"hello": "Bonjour", "goodbye": "Au revoir"},
}

# --- Auth ---
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": payload["sub"]}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- API Endpoints ---
@app.get(
    "/localization/translate",
    response_model=TranslationResponse,
    summary="Translate phrases to target language",
    dependencies=[Depends(get_current_user)]
)
async def translate_phrase(
    phrase: str = Query(..., description="The phrase to translate"),
    target_language: str = Query(..., description="The target language code (e.g., 'es')"),
    context: Optional[str] = Query(None, description="Optional context for translation")
):
    """
    Translates a given phrase to a target language.
    This is a mock implementation. A real service would integrate with a translation API.
    """
    logger.info(f"Translating '{phrase}' to '{target_language}' with context '{context}'")

    language_translations = MOCK_TRANSLATIONS.get(target_language.lower())
    if not language_translations:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Language '{target_language}' not supported.")

    translated = language_translations.get(phrase.lower())
    if not translated:
        # Fallback to returning the original phrase if no translation is found
        logger.warning(f"No translation found for '{phrase}' in '{target_language}'. Returning original.")
        translated = phrase

    return TranslationResponse(translated_phrase=translated, target_language=target_language)

@app.get(
    "/localization/calendar-systems",
    response_model=List[CalendarSystem],
    summary="List supported calendar systems",
    dependencies=[Depends(get_current_user)]
)
async def get_calendar_systems():
    """
    Returns a list of supported calendar systems and their basic rules.
    """
    return MOCK_CALENDAR_SYSTEMS

@app.get(
    "/localization/name-parsing-rules",
    response_model=List[NameParsingRule],
    summary="List name parsing rules by culture",
    dependencies=[Depends(get_current_user)]
)
async def get_name_parsing_rules():
    """
    Returns a list of name parsing rules for different cultures.
    """
    return MOCK_NAME_PARSING_RULES
