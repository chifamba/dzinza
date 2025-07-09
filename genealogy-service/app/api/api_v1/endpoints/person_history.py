import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models_main import PersonPrivacyOptions
from app import schemas # API Schemas (specifically schemas.person_history)
from app.crud import crud_person_history, crud_person # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency
from .relationship import check_tree_permission # Re-use or adapt permission helper

router = APIRouter()

@router.get("/persons/{person_id}/history", response_model=schemas.person_history.PersonHistoryList)
async def list_person_history_entries(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100), # History can be paginated
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Retrieve the change history for a specific person.
    User must have view access to the person.
    """
    person = await crud_person.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Permission check: Can user view this person? (Simplified from person.py endpoint)
    can_view = False
    if person.tree_ids:
        for tree_id in person.tree_ids:
            try:
                await check_tree_permission(db, tree_id, current_user.id, require_edit=False)
                can_view = True
                break
            except HTTPException:
                continue

    if not can_view and person.privacy_settings.show_profile != PersonPrivacyOptions.PUBLIC:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this person's history.")

    history_entries = await crud_person_history.get_history_for_person(
        db=db, person_id=person_id, skip=skip, limit=limit
    )
    # For total count, we might need a separate count function in crud_person_history
    # For now, if PersonHistoryList schema requires 'total', this might be an issue.
    # Let's assume the schema can handle items only, or adjust the schema/crud.
    # A simple way:
    # total_history_entries = await db[PERSON_HISTORY_COLLECTION].count_documents({"person_id": person_id})
    # This is better than len(history_entries) if paginated.
    # For now, let's assume PersonHistoryList doesn't strictly need total or crud_person_history handles it.

    # If PersonHistoryList requires total:
    # from app.db.base import PERSON_HISTORY_COLLECTION
    # total_count = await db[PERSON_HISTORY_COLLECTION].count_documents({"person_id": person_id})
    # return schemas.person_history.PersonHistoryList(items=history_entries, total=total_count, person_id=person_id)

    # Returning raw list for now if schema is flexible
    # To match the schema PersonHistoryList(items, total, person_id):
    # We need a count function. Let's assume it's added to crud_person_history or done here.

    # Quick count for now:
    from app.db.base import PERSON_HISTORY_COLLECTION # Already imported if this file is long
    total_count = await db[PERSON_HISTORY_COLLECTION].count_documents({"person_id": person_id})

    return schemas.person_history.PersonHistoryList(
        items=history_entries,
        total=total_count,
        person_id=person_id
    )


@router.get("/persons/{person_id}/history/{version}", response_model=schemas.person_history.PersonHistoryRead)
async def read_specific_person_history_version(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    version: int = Path(
        ..., ge=1,
        description="The specific version number of the history entry."
    ),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Retrieve a specific version from a person's change history.
    User must have view access to the person.
    """
    # Permission check (same as listing history)
    person = await crud_person.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")
    can_view = False
    if person.tree_ids:
        for tree_id in person.tree_ids:
            try:
                await check_tree_permission(db, tree_id, current_user.id, require_edit=False)
                can_view = True
                break
            except HTTPException:
                continue
    if not can_view and person.privacy_settings.show_profile != PersonPrivacyOptions.PUBLIC:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this person's history.")

    history_entry = await crud_person_history.get_person_version(
        db=db, person_id=person_id, version=version
    )
    if not history_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version {version} not found for this person's history.")

    return history_entry

# Note: Reverting to a version would be a POST/PUT operation, potentially on the Person resource itself,
# e.g., PUT /persons/{person_id}/revert-to-version/{version}
# That logic would use crud_person_history.get_person_version to get the data_snapshot,
# then update the main Person document, and then log a new PersonHistory entry of type REVERT.
# This is complex and usually an admin/curator action. Not implementing here for now.
