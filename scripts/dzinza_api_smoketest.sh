#!/bin/bash
# dzinza_api_smoketest.sh
# Smoke test for Dzinza API: register, login, create tree, add people, create relationship, search
# Requires: curl, jq

set -euo pipefail

# CONFIGURATION
API_AUTH="http://localhost:8001/auth"           # auth-service
API_GENEALOGY="http://localhost:8003"           # genealogy-service
API_SEARCH="http://localhost:8005/search"       # search-service

EMAIL="apitest$(date +%s)@example.com"
USERNAME="apitestuser$(date +%s)"
PASSWORD="TestPassword1!"

# 1. Register

echo "[1] Registering user..."
register_resp=$(curl -s -X POST "$API_AUTH/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "'$EMAIL'",
    "username": "'$USERNAME'",
    "password": "'$PASSWORD'",
    "first_name": "API",
    "last_name": "Tester"
  }')
echo "$register_resp" | jq .

# 2. Login

echo "[2] Logging in..."
login_resp=$(curl -s -X POST "$API_AUTH/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }')
echo "$login_resp" | jq .
access_token=$(echo "$login_resp" | jq -r .access_token)

if [[ "$access_token" == "null" || -z "$access_token" ]]; then
  echo "Login failed, aborting."
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $access_token"

# 3. Create Family Tree

echo "[3] Creating family tree..."
tree_resp=$(curl -s -X POST "$API_GENEALOGY/family-trees/" \
  -H 'Content-Type: application/json' -H "$AUTH_HEADER" \
  -d '{
    "name": "API Test Tree",
    "description": "Tree created by API test script",
    "privacy": "private"
  }')
echo "$tree_resp" | jq .
tree_id=$(echo "$tree_resp" | jq -r .id)

# 4. Add two people

echo "[4] Adding person 1..."
p1_resp=$(curl -s -X POST "$API_GENEALOGY/trees/$tree_id/persons" \
  -H 'Content-Type: application/json' -H "$AUTH_HEADER" \
  -d '{
    "tree_ids": ["'$tree_id'"],
    "primary_name": {"first": "John", "last": "Doe"},
    "gender": "MALE",
    "is_living": true
  }')
echo "$p1_resp" | jq .
p1_id=$(echo "$p1_resp" | jq -r .id)

echo "[4] Adding person 2..."
p2_resp=$(curl -s -X POST "$API_GENEALOGY/trees/$tree_id/persons" \
  -H 'Content-Type: application/json' -H "$AUTH_HEADER" \
  -d '{
    "tree_ids": ["'$tree_id'"],
    "primary_name": {"first": "Jane", "last": "Smith"},
    "gender": "FEMALE",
    "is_living": true
  }')
echo "$p2_resp" | jq .
p2_id=$(echo "$p2_resp" | jq -r .id)

# 5. Create relationship

echo "[5] Creating relationship (spouse)..."
rel_resp=$(curl -s -X POST "$API_GENEALOGY/trees/$tree_id/relationships" \
  -H 'Content-Type: application/json' -H "$AUTH_HEADER" \
  -d '{
    "person1_id": "'$p1_id'",
    "person2_id": "'$p2_id'",
    "relationship_type": "SPOUSE"
  }')
echo "$rel_resp" | jq .

# 6. Search for people

echo "[6] Searching for people in tree..."
search_resp=$(curl -s -X POST "$API_SEARCH/" \
  -H 'Content-Type: application/json' -H "$AUTH_HEADER" \
  -d '{
    "query_string": "Doe",
    "record_types": ["person"],
    "filters": [{"field": "tree_id", "value": "'$tree_id'"}],
    "size": 5
  }')
echo "$search_resp" | jq .

echo "\nAll API smoke tests completed."
