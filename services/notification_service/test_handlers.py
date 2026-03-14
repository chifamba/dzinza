import pytest
from fastapi.testclient import TestClient
import jwt
import os

# Set dummy secret for tests
os.environ["JWT_SECRET"] = "dummy_secret_for_tests_that_is_long_enough_for_jwt"

import config
config.JWT_SECRET = os.environ["JWT_SECRET"]

import handlers
handlers.JWT_SECRET = config.JWT_SECRET

from main import app

client = TestClient(app)

def test_send_email_notification_unauthenticated():
    response = client.post("/notify/email/", json={
        "to": "test@example.com",
        "subject": "Test",
        "body": "Test body"
    })
    assert response.status_code == 422 # missing Authorization header - actually fastapi returns 422 for missing required header

def test_send_email_notification_invalid_token():
    response = client.post(
        "/notify/email/",
        json={
            "to": "test@example.com",
            "subject": "Test",
            "body": "Test body"
        },
        headers={"Authorization": "Bearer invalidtoken"}
    )
    assert response.status_code == 401

def test_send_email_notification_authenticated(mocker):
    # Mock SMTP to avoid actual email sending
    mocker.patch("handlers._send_email", return_value=True)

    token = jwt.encode({"sub": "user123"}, handlers.JWT_SECRET, algorithm="HS256")

    response = client.post(
        "/notify/email/",
        json={
            "notification": {
                "to": "test@example.com",
                "subject": "Test",
                "body": "Test body"
            }
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code != 200:
        print("Response detail:", response.json())
    assert response.status_code == 200
