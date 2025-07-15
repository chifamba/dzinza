from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    family_tree,
    person,
    relationship,
    event,
    notification,
    merge_suggestion,
    person_history # Added person_history
)

api_router = APIRouter()

# Include routers from endpoint modules
api_router.include_router(family_tree.router, prefix="/family-trees", tags=["Family Trees"])
api_router.include_router(person.router, prefix="", tags=["Persons"]) # Prefix managed in person.py
api_router.include_router(relationship.router, prefix="", tags=["Relationships"]) # Prefix managed in relationship.py
api_router.include_router(event.router, prefix="", tags=["Events"]) # Prefix managed in event.py
api_router.include_router(notification.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(merge_suggestion.router, prefix="/merge-suggestions", tags=["Merge Suggestions"])
api_router.include_router(person_history.router, prefix="", tags=["Person History"]) # Prefix managed in person_history.py

# Can also add general v1 utility endpoints here if needed.
# @api_router.get("/v1-status", tags=["V1 Utilities"])
# async def get_v1_status():
#     return {"status": "API v1 is active"}
