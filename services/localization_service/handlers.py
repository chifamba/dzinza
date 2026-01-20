"""Request handlers for localization_service."""

from fastapi import APIRouter, HTTPException, Request
from .schemas import TranslationEntry

router = APIRouter()
_translation_store = {}
_user_language = {}
_pending_translations = []
_translation_reviews = []
_translation_metrics = {"total": 0, "complete": 0, "accuracy": 1.0}
_translation_memory = {}

@router.post("/translations/", response_model=TranslationEntry)
def create_translation(entry: TranslationEntry):
    # Add to translation memory
    _translation_memory[(entry.key, entry.language)] = entry.value
    # Update metrics
    _translation_metrics["total"] += 1
    if entry.value:
        _translation_metrics["complete"] += 1
    # Add translation
    key = (entry.key, entry.language)
    if key in _translation_store:
        raise HTTPException(status_code=409, detail="Translation already exists")
    _translation_store[key] = entry
    return entry

@router.post("/community/submit/")
def submit_community_translation(entry: TranslationEntry):
    _pending_translations.append(entry)
    return {"status": "pending", "entry": entry}

@router.post("/community/review/")
def review_community_translation(index: int, approved: bool):
    if index < 0 or index >= len(_pending_translations):
        raise HTTPException(status_code=404, detail="No such pending translation")
    entry = _pending_translations.pop(index)
    _translation_reviews.append({"entry": entry, "approved": approved})
    if approved:
        key = (entry.key, entry.language)
        _translation_store[key] = entry
    return {"reviewed": entry, "approved": approved}

@router.get("/community/pending/")
def list_pending_translations():
    return _pending_translations

@router.get("/community/reviews/")
def list_translation_reviews():
    return _translation_reviews

@router.get("/metrics/")
def get_translation_metrics():
    # Completeness = complete / total
    total = _translation_metrics["total"]
    complete = _translation_metrics["complete"]
    accuracy = _translation_metrics["accuracy"]
    completeness = complete / total if total else 1.0
    return {"total": total, "complete": complete, "accuracy": accuracy, "completeness": completeness}

@router.get("/memory/")
def get_translation_memory():
    return _translation_memory
    key = (entry.key, entry.language)
    if key in _translation_store:
        raise HTTPException(status_code=409, detail="Translation already exists")
    _translation_store[key] = entry
    return entry

@router.get("/translations/{key}/{language}", response_model=TranslationEntry)
def get_translation(key: str, language: str):
    entry = _translation_store.get((key, language))
    if not entry:
        raise HTTPException(status_code=404, detail="Translation not found")
    return entry

@router.get("/translations/", response_model=list[TranslationEntry])
def list_translations(language: str = None):
    if language:
        return [v for (k, lang), v in _translation_store.items() if lang == language]
    return list(_translation_store.values())

@router.put("/translations/{key}/{language}", response_model=TranslationEntry)
def update_translation(key: str, language: str, entry: TranslationEntry):
    if (key, language) not in _translation_store:
        raise HTTPException(status_code=404, detail="Translation not found")
    old = _translation_store[(key, language)]
    entry.version = (old.version or 1) + 1
    _translation_store[(key, language)] = entry
    return entry

@router.post("/translations/import/")
def import_translations(data: list[TranslationEntry]):
    for entry in data:
        key = (entry.key, entry.language)
        _translation_store[key] = entry
    return {"imported": len(data)}

@router.get("/translations/export/")
def export_translations():
    return list(_translation_store.values())

@router.delete("/translations/{key}/{language}")
def delete_translation(key: str, language: str):
    if (key, language) not in _translation_store:
        raise HTTPException(status_code=404, detail="Translation not found")
    del _translation_store[(key, language)]
    return {"detail": "Deleted"}

@router.post("/language/")
def set_language(request: Request, language: str):
    user = request.headers.get("X-User", "anonymous")
    _user_language[user] = language
    return {"user": user, "language": language}

@router.get("/language/")
def get_language(request: Request):
    user = request.headers.get("X-User", "anonymous")
    lang = _user_language.get(user, "en")
    rtl_languages = {"ar", "he", "fa", "ur"}
    is_rtl = lang in rtl_languages
    return {"user": user, "language": lang, "rtl": is_rtl}
