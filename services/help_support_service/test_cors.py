import pytest
from fastapi.testclient import TestClient
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'help_support_service'))
import config

# Set ALLOWED_ORIGINS for the test
os.environ["ALLOWED_ORIGINS"] = "http://test-origin.com,http://another-test.com"

# Reload config to apply environment variable changes
import importlib
importlib.reload(config)

from main import app

client = TestClient(app)

def test_cors_allowed_origin():
    response = client.options("/api/v1/health", headers={"Origin": "http://test-origin.com", "Access-Control-Request-Method": "GET"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://test-origin.com"

def test_cors_disallowed_origin():
    response = client.options("/api/v1/health", headers={"Origin": "http://evil-origin.com", "Access-Control-Request-Method": "GET"})
    assert response.status_code == 400 or response.headers.get("access-control-allow-origin") != "http://evil-origin.com"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "help_support_service"}
