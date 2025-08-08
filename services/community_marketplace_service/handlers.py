"""Request handlers for community_marketplace_service service."""

from fastapi import APIRouter
from typing import List

router = APIRouter()

saved_searches = {}

listings: List[dict] = []

CATEGORIES = [
    "Books",
    "Antiques",
    "Photos",
    "Documents",
    "DNA Kits",
    "Services",
    "Other"
]

@router.get("/categories")
def get_categories():
    return {"categories": CATEGORIES}

from datetime import datetime, timedelta

@router.post("/listings")
def create_listing(listing: dict):
    # Default status to 'active' if not provided
    if "status" not in listing:
        listing["status"] = "active"
    # Default expiration to 30 days from now if not provided
    if "expires_at" not in listing:
        listing["expires_at"] = (datetime.utcnow() + timedelta(days=30)).isoformat()
    # Initialize analytics fields
    listing["views"] = 0
    listing["inquiries"] = 0
    listing["conversions"] = 0
    listing["featured"] = False
    listings.append(listing)
    return {"message": "Listing created", "listing": listing}

@router.patch("/listings/{listing_id}/feature")
def feature_listing(listing_id: int, featured: bool):
    if 0 <= listing_id < len(listings):
        listings[listing_id]["featured"] = featured
        return {"message": "Listing feature status updated", "listing": listings[listing_id]}
    return {"error": "Listing not found"}

@router.get("/listings/featured")
def get_featured_listings():
    return {"featured_listings": [l for l in listings if l.get("featured")]}

@router.post("/listings/{listing_id}/view")
def increment_listing_view(listing_id: int):
    if 0 <= listing_id < len(listings):
        listings[listing_id]["views"] += 1
        return {"message": "View incremented", "views": listings[listing_id]["views"]}
    return {"error": "Listing not found"}

@router.get("/listings/{listing_id}/analytics")
def get_listing_analytics(listing_id: int):
    if 0 <= listing_id < len(listings):
        analytics = {
            "views": listings[listing_id].get("views", 0),
            "inquiries": listings[listing_id].get("inquiries", 0),
            "conversions": listings[listing_id].get("conversions", 0)
        }
        return analytics
    return {"error": "Listing not found"}

@router.post("/listings/expire")
def expire_old_listings():
    now = datetime.utcnow()
    expired = []
    for l in listings:
        if l["status"] == "active" and "expires_at" in l:
            try:
                expires = datetime.fromisoformat(l["expires_at"])
                if expires < now:
                    l["status"] = "expired"
                    expired.append(l)
            except Exception:
                continue
    return {"expired_listings": expired}

@router.patch("/listings/{listing_id}/status")
def update_listing_status(listing_id: int, status: str):
    if 0 <= listing_id < len(listings):
        listings[listing_id]["status"] = status
        return {"message": "Listing status updated", "listing": listings[listing_id]}
    return {"error": "Listing not found"}

@router.get("/listings/{listing_id}")
def read_listing(listing_id: int):
    if 0 <= listing_id < len(listings):
        return listings[listing_id]
    return {"error": "Listing not found"}

@router.get("/users/{user_id}/listings")
def read_user_listings(user_id: str):
    user_listings = [l for l in listings if l.get("user_id") == user_id]
    return user_listings

@router.put("/listings/{listing_id}")
def update_listing(listing_id: int, updated: dict):
    if 0 <= listing_id < len(listings):
        listings[listing_id].update(updated)
        return {"message": "Listing updated", "listing": listings[listing_id]}
    return {"error": "Listing not found"}

@router.delete("/listings/{listing_id}")
def delete_listing(listing_id: int):
    if 0 <= listing_id < len(listings):
        deleted = listings.pop(listing_id)
        return {"message": "Listing deleted", "listing": deleted}
    return {"error": "Listing not found"}

@router.post("/users/{user_id}/saved_searches")
def save_search(user_id: str, search: dict):
    if user_id not in saved_searches:
        saved_searches[user_id] = []
    saved_searches[user_id].append(search)
    return {"message": "Search saved", "search": search}

@router.get("/users/{user_id}/saved_searches")
def list_saved_searches(user_id: str):
    return {"saved_searches": saved_searches.get(user_id, [])}

@router.delete("/users/{user_id}/saved_searches/{search_idx}")
def delete_saved_search(user_id: str, search_idx: int):
    if user_id in saved_searches and 0 <= search_idx < len(saved_searches[user_id]):
        deleted = saved_searches[user_id].pop(search_idx)
        return {"message": "Saved search deleted", "search": deleted}
    return {"error": "Saved search not found"}

@router.get("/search/suggestions")
def search_suggestions(q: str = ""):
    suggestions = set()
    for listing in listings:
        title = listing.get("title", "")
        if q.lower() in title.lower():
            suggestions.add(title)
    return {"suggestions": list(suggestions)}

@router.get("/search")
def search_listings(
    q: str = "",
    category: str = "",
    min_price: float = None,
    max_price: float = None,
    condition: str = "",
    location: str = "",
    radius_km: float = None,
    date_posted_after: str = "",
    date_posted_before: str = ""
):
    results = []
    for listing in listings:
        if q.lower() not in str(listing).lower():
            continue
        if category and listing.get("category", "").lower() != category.lower():
            continue
        price = listing.get("price")
        if min_price is not None and (price is None or price < min_price):
            continue
        if max_price is not None and (price is None or price > max_price):
            continue
        if condition and listing.get("condition", "").lower() != condition.lower():
            continue
        if location and listing.get("location", "").lower() != location.lower():
            continue
        if date_posted_after:
            posted = listing.get("date_posted")
            if posted and posted < date_posted_after:
                continue
        if date_posted_before:
            posted = listing.get("date_posted")
            if posted and posted > date_posted_before:
                continue
        # radius_km is a placeholder; real implementation would require geo-coordinates
        results.append(listing)
    return {"results": results}
