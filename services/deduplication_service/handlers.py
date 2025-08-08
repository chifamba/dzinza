"""Request handlers for deduplication_service service."""

from fastapi import APIRouter
from typing import List, Dict

router = APIRouter()

# Example in-memory profiles list for demonstration
profiles: List[Dict] = []
merge_history: List[Dict] = []

@router.post("/profiles")
def add_profile(profile: Dict):
    profiles.append(profile)
    return {"message": "Profile added", "profile": profile}

@router.get("/deduplicate/name_dob")
def deduplicate_name_dob():
    seen = {}
    duplicates = []
    for profile in profiles:
        key = (profile.get("name", "").lower(), profile.get("dob", ""))
        if key in seen:
            duplicates.append(profile)
        else:
            seen[key] = profile
    return {"duplicates": duplicates}

def profile_quality_score(profile: dict) -> float:
    score = 0
    if profile.get("name"):
        score += 1
    if profile.get("dob"):
        score += 1
    if profile.get("email"):
        score += 1
    if profile.get("address"):
        score += 1
    if profile.get("phone"):
        score += 1
    if profile.get("updated_at"):
        score += 0.5  # recency bonus
    return score

@router.post("/merge_profiles")
def merge_profiles(idx1: int, idx2: int, resolution: dict = None):
    if not (0 <= idx1 < len(profiles) and 0 <= idx2 < len(profiles)):
        return {"error": "Invalid profile indices"}
    p1 = profiles[idx1]
    p2 = profiles[idx2]
    merged = {}
    keys = set(p1.keys()).union(p2.keys())
    for k in keys:
        v1 = p1.get(k)
        v2 = p2.get(k)
        if v1 == v2 or not v2:
            merged[k] = v1
        elif not v1:
            merged[k] = v2
        else:
            # Conflict: use resolution if provided, else use higher quality
            if resolution and k in resolution:
                merged[k] = resolution[k]
            else:
                merged[k] = v1 if profile_quality_score(p1) >= profile_quality_score(p2) else v2
    # Save rollback info
    merge_history.append({
        "idx1": idx1,
        "idx2": idx2,
        "profile1": p1.copy(),
        "profile2": p2.copy()
    })
    profiles.pop(max(idx1, idx2))
    profiles[min(idx1, idx2)] = merged
    return {"message": "Profiles merged with conflict resolution and quality scoring", "merged_profile": merged}

@router.post("/rollback_merge")
def rollback_merge():
    if not merge_history:
        return {"error": "No merge to rollback"}
    last = merge_history.pop()
    idx1, idx2 = last["idx1"], last["idx2"]
    # Remove merged profile and restore originals
    profiles.pop(min(idx1, idx2))
    profiles.insert(idx1, last["profile1"])
    profiles.insert(idx2, last["profile2"])
    return {"message": "Last merge rolled back", "restored_profiles": [last["profile1"], last["profile2"]]}

@router.get("/merge_history")
def get_merge_history():
    return {"merge_history": merge_history}

@router.post("/schedule_nightly_job")
def schedule_nightly_job():
    # Placeholder: In production, use a scheduler like Celery or APScheduler
    return {"message": "Nightly deduplication job scheduled (simulated)"}

@router.get("/monitor_accuracy")
def monitor_accuracy():
    # Placeholder: In production, implement real accuracy monitoring
    return {"accuracy": "Monitoring not implemented. Placeholder endpoint."}

@router.get("/monitor_effectiveness")
def monitor_effectiveness():
    # Placeholder: In production, implement real effectiveness monitoring
    return {"effectiveness": "Monitoring not implemented. Placeholder endpoint."}

@router.get("/performance_metrics")
def performance_metrics():
    # Placeholder: In production, track real false positive/negative rates
    return {
        "false_positive_rate": "Not implemented (placeholder)",
        "false_negative_rate": "Not implemented (placeholder)"
    }

@router.get("/deduplicate/composite")
def deduplicate_composite(threshold: float = 0.8):
    import difflib
    results = []
    for i, p1 in enumerate(profiles):
        for j, p2 in enumerate(profiles):
            if i >= j:
                continue
            score = 0.0
            # Name similarity
            name1 = p1.get("name", "").lower()
            name2 = p2.get("name", "").lower()
            score += 0.3 * difflib.SequenceMatcher(None, name1, name2).ratio()
            # DOB exact match
            score += 0.2 if p1.get("dob") == p2.get("dob") and p1.get("dob") else 0
            # Email exact match
            score += 0.2 if p1.get("email", "").lower() == p2.get("email", "").lower() and p1.get("email") else 0
            # Address similarity
            addr1 = p1.get("address", "").lower()
            addr2 = p2.get("address", "").lower()
            score += 0.15 * difflib.SequenceMatcher(None, addr1, addr2).ratio()
            # Phone exact match
            score += 0.15 if p1.get("phone") == p2.get("phone") and p1.get("phone") else 0
            if score >= threshold:
                results.append({"profile1": p1, "profile2": p2, "score": score})
    return {"composite_duplicates": results}

@router.get("/deduplicate/phone")
def deduplicate_phone():
    seen = {}
    duplicates = []
    for profile in profiles:
        phone = profile.get("phone", "")
        if phone and phone in seen:
            duplicates.append(profile)
        else:
            seen[phone] = profile
    return {"duplicates": duplicates}

@router.get("/deduplicate/address")
def deduplicate_address():
    seen = {}
    duplicates = []
    for profile in profiles:
        address = profile.get("address", "").lower()
        if address and address in seen:
            duplicates.append(profile)
        else:
            seen[address] = profile
    return {"duplicates": duplicates}

@router.get("/deduplicate/fuzzy_name")
def deduplicate_fuzzy_name(threshold: float = 0.85):
    import difflib
    duplicates = []
    checked = set()
    for i, p1 in enumerate(profiles):
        name1 = p1.get("name", "").lower()
        for j, p2 in enumerate(profiles):
            if i >= j:
                continue
            name2 = p2.get("name", "").lower()
            if (i, j) in checked or (j, i) in checked:
                continue
            ratio = difflib.SequenceMatcher(None, name1, name2).ratio()
            if ratio >= threshold:
                duplicates.append((p1, p2))
            checked.add((i, j))
    return {"fuzzy_duplicates": duplicates}

@router.get("/deduplicate/email")
def deduplicate_email():
    seen = {}
    duplicates = []
    for profile in profiles:
        email = profile.get("email", "").lower()
        if email and email in seen:
            duplicates.append(profile)
        else:
            seen[email] = profile
    return {"duplicates": duplicates}
