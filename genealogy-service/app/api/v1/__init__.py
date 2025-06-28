from fastapi import APIRouter

from .family_tree_router import router as family_tree_router
from .person_router import router as person_router
from .relationship_router import router as relationship_router
from .notification_router import router as notification_router
from .merge_suggestion_router import router as merge_suggestion_router

api_v1_router = APIRouter()

api_v1_router.include_router(family_tree_router, prefix="/family-trees", tags=["Family Trees"])
api_v1_router.include_router(person_router, prefix="/persons", tags=["Persons"]) # Original was /personRoutes
api_v1_router.include_router(relationship_router, prefix="/relationships", tags=["Relationships"])
api_v1_router.include_router(notification_router, prefix="/notifications", tags=["Notifications"])
api_v1_router.include_router(merge_suggestion_router, prefix="/merge-suggestions", tags=["Merge Suggestions"])

# The original service had routes like:
# /api/family-trees
# /api/persons
# /api/relationships
# /notifications (Note: this was mounted at root in original server.ts for genealogy-service, proxied by backend)
# For consistency within this service, I'll use /api/v1/notifications and adjust proxy in backend-service-py later if needed.
# Or, I can mount notifications router at /notifications directly in main.py for this service.
# Let's stick to /api/v1 prefix for all routers here for now. The backend service can map /api/notifications to /api/v1/notifications.
