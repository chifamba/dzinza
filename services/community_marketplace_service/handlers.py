"""Handlers for Community Marketplace Service."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter()

# In-memory storage for demo
_messages = {}
_offers = {}

class Message(BaseModel):
    sender_id: str
    receiver_id: str
    listing_id: str
    content: str
    timestamp: str
    thread_id: Optional[str] = None
    attachments: Optional[List[str]] = None

@router.post("/market/message/")
def send_message(msg: Message):
    thread = msg.thread_id or f"{msg.sender_id}-{msg.receiver_id}-{msg.listing_id}"
    _messages.setdefault(thread, []).append(msg.dict())
    return {"thread_id": thread, "message_count": len(_messages[thread])}

@router.get("/market/messages/{thread_id}")
def get_messages(thread_id: str):
    return {"thread_id": thread_id, "messages": _messages.get(thread_id, [])}

@router.post("/market/message/encrypted/")
def send_encrypted_message(msg: Message):
    # Stub for encrypted messaging
    return {"thread_id": msg.thread_id, "encrypted": True, "status": "not implemented"}

@router.post("/market/message/attachment/")
def upload_attachment(file: UploadFile = File(...)):
    # Stub: just return filename
    return {"filename": file.filename}

class Offer(BaseModel):
    buyer_id: str
    listing_id: str
    amount: float
    message: Optional[str] = None
    status: str = "pending"

@router.post("/market/offer/")
def make_offer(offer: Offer):
    key = f"{offer.buyer_id}-{offer.listing_id}"
    _offers[key] = offer.dict()
    return {"offer_id": key, "status": offer.status}

@router.get("/market/offer/{offer_id}")
def get_offer(offer_id: str):
    return _offers.get(offer_id, {})

@router.post("/market/offer/{offer_id}/accept")
def accept_offer(offer_id: str):
    if offer_id in _offers:
        _offers[offer_id]["status"] = "accepted"
        return {"offer_id": offer_id, "status": "accepted"}
    raise HTTPException(status_code=404, detail="Offer not found")

@router.post("/market/offer/{offer_id}/reject")
def reject_offer(offer_id: str):
    if offer_id in _offers:
        _offers[offer_id]["status"] = "rejected"
        return {"offer_id": offer_id, "status": "rejected"}
    raise HTTPException(status_code=404, detail="Offer not found")

# --- Payment Processing Stubs ---
@router.post("/market/payment/stripe/")
def pay_stripe(listing_id: str, buyer_id: str, amount: float):
    # Stub for Stripe integration
    return {"status": "paid (stripe stub)", "listing_id": listing_id, "buyer_id": buyer_id, "amount": amount}

@router.post("/market/payment/paypal/")
def pay_paypal(listing_id: str, buyer_id: str, amount: float):
    # Stub for PayPal integration
    return {"status": "paid (paypal stub)", "listing_id": listing_id, "buyer_id": buyer_id, "amount": amount}

@router.post("/market/payment/escrow/")
def escrow_payment(listing_id: str, buyer_id: str, amount: float):
    # Stub for escrow service
    return {"status": "escrowed (stub)", "listing_id": listing_id, "buyer_id": buyer_id, "amount": amount}

@router.post("/market/payment/refund/")
def refund_payment(listing_id: str, buyer_id: str, amount: float):
    # Stub for refund system
    return {"status": "refunded (stub)", "listing_id": listing_id, "buyer_id": buyer_id, "amount": amount}

@router.get("/market/payment/analytics/")
def payment_analytics():
    # Stub for payment analytics
    return {"status": "analytics (stub)"}

@router.post("/market/payment/currency/")
def set_currency(listing_id: str, currency: str):
    # Stub for multi-currency support
    return {"listing_id": listing_id, "currency": currency}

# --- Rating and Review System ---
_ratings = {}
_reviews = {}
_review_flags = {}
_review_responses = {}

from typing import Any

class Rating(BaseModel):
    user_id: str
    seller_id: str
    rating: int  # 1-5

@router.post("/market/rating/")
def create_rating(rating: Rating):
    key = f"{rating.user_id}-{rating.seller_id}"
    _ratings[key] = rating.rating
    return {"rating_id": key, "rating": rating.rating}

@router.get("/market/rating/{seller_id}")
def get_ratings(seller_id: str):
    ratings = [v for k, v in _ratings.items() if k.endswith(f"-{seller_id}")]
    avg = sum(ratings) / len(ratings) if ratings else 0
    return {"seller_id": seller_id, "average_rating": avg, "count": len(ratings)}

class Review(BaseModel):
    user_id: str
    seller_id: str
    content: str
    verified: bool = False

@router.post("/market/review/")
def create_review(review: Review):
    key = f"{review.user_id}-{review.seller_id}"
    _reviews[key] = review.dict()
    return {"review_id": key}

@router.get("/market/review/{seller_id}")
def get_reviews(seller_id: str):
    return [v for k, v in _reviews.items() if k.endswith(f"-{seller_id}")]

@router.post("/market/review/{review_id}/flag")
def flag_review(review_id: str, reason: str):
    _review_flags.setdefault(review_id, []).append(reason)
    return {"review_id": review_id, "flags": _review_flags[review_id]}

@router.post("/market/review/{review_id}/response")
def respond_to_review(review_id: str, response: str):
    _review_responses[review_id] = response
    return {"review_id": review_id, "response": response}

@router.get("/market/rating/analytics/{seller_id}")
def rating_analytics(seller_id: str):
    ratings = [v for k, v in _ratings.items() if k.endswith(f"-{seller_id}")]
    return {
        "seller_id": seller_id,
        "average_rating": sum(ratings) / len(ratings) if ratings else 0,
        "ratings": ratings,
        "count": len(ratings)
    }

@router.get("/market/review/verify/{review_id}")
def verify_review(review_id: str):
    review = _reviews.get(review_id)
    if review:
        review["verified"] = True
        return {"review_id": review_id, "verified": True}
    return {"review_id": review_id, "verified": False}
