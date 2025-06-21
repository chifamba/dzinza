#!/bin/bash

# Small test for the demo script functions
set -e

API_BASE_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:5173/api"
DEFAULT_EMAIL="admin@dzinza.org"
DEFAULT_PASSWORD="AdminPassword123!"

# Global variables for auth token
AUTH_TOKEN=""

# Function to authenticate and get token
authenticate() {
  echo "Authenticating with the API..." >&2
  
  payload=$(jq -n \
    --arg email "$DEFAULT_EMAIL" \
    --arg password "$DEFAULT_PASSWORD" \
    '{email: $email, password: $password}')
  
  response=$(curl -s -X POST "$FRONTEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  AUTH_TOKEN=$(echo "$response" | jq -r '.tokens.accessToken // empty')
  
  if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" == "null" ]; then
    echo "Failed to authenticate. Response:" >&2
    echo "$response" >&2
    exit 1
  fi
  
  echo "Authentication successful" >&2
}

# Function to create a person
create_person() {
  local first_name="$1"
  local last_name="$2"
  local gender="$3"
  local dob="$4"
  local dod="${5:-}"
  local pob="${6:-}"
  local pod="${7:-}"
  local occupation="${8:-}"
  local biography="${9:-}"
  local person_id

  echo "Creating person: $first_name $last_name..." >&2

  # Build payload
  local payload_base=$(jq -n \
    --arg firstName "$first_name" \
    --arg lastName "$last_name" \
    --arg gender "$gender" \
    '{firstName: $firstName, lastName: $lastName, gender: $gender}')
  
  if [ -n "$dob" ]; then
    payload_base=$(echo "$payload_base" | jq --arg dob "$dob" '. + {birthDate: $dob}')
  fi
  
  if [ -n "$pob" ]; then
    payload_base=$(echo "$payload_base" | jq --arg pob "$pob" '. + {placeOfBirth: $pob}')
  fi
  
  if [ -n "$occupation" ]; then
    payload_base=$(echo "$payload_base" | jq --arg occ "$occupation" '. + {occupation: $occ}')
  fi

  response=$(curl -s -X POST "$FRONTEND_URL/genealogy/members" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$payload_base")

  person_id=$(echo "$response" | jq -r '.id // empty')

  if [ -z "$person_id" ] || [ "$person_id" == "null" ]; then
    echo "Error creating person '$first_name $last_name'. Response:" >&2
    echo "$response" >&2
    echo ""
  else
    echo "Created $first_name $last_name with ID: $person_id" >&2
    echo "$person_id"
  fi
}

# Function to create a relationship
create_relationship() {
  local person1_id="$1"
  local person2_id="$2"
  local type="$3"

  if [ -z "$person1_id" ] || [ "$person1_id" == "null" ] || [ -z "$person2_id" ] || [ "$person2_id" == "null" ]; then
    echo "Skipping relationship due to missing person ID(s)" >&2
    return
  fi

  echo "Creating relationship: $person1_id ($type) $person2_id..." >&2

  payload=$(jq -n \
    --arg p1Id "$person1_id" \
    --arg p2Id "$person2_id" \
    --arg type "$type" \
    '{person1Id: $p1Id, person2Id: $p2Id, type: $type}')

  response=$(curl -s -X POST "$FRONTEND_URL/genealogy/relationships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$payload")

  relationship_id=$(echo "$response" | jq -r '.id // empty')

  if [ -z "$relationship_id" ] || [ "$relationship_id" == "null" ]; then
    echo "Error creating relationship. Response:" >&2
    echo "$response" >&2
  else
    echo "Relationship created with ID: $relationship_id" >&2
  fi
}

# Test the functions
authenticate

echo "Testing person creation..." >&2
FATHER=$(create_person "Test" "Father" "male" "1970-01-01" "" "Test City" "" "Engineer" "A test father")
MOTHER=$(create_person "Test" "Mother" "female" "1972-05-15" "" "Test City" "" "Teacher" "A test mother")
CHILD=$(create_person "Test" "Child" "female" "2000-08-20" "" "Test City" "" "Student" "A test child")

echo "Father ID: '$FATHER'" >&2
echo "Mother ID: '$MOTHER'" >&2
echo "Child ID: '$CHILD'" >&2

if [ -n "$FATHER" ] && [ -n "$MOTHER" ]; then
  create_relationship "$FATHER" "$MOTHER" "SPOUSE"
fi

if [ -n "$FATHER" ] && [ -n "$CHILD" ]; then
  create_relationship "$FATHER" "$CHILD" "PARENT_CHILD"
fi

if [ -n "$MOTHER" ] && [ -n "$CHILD" ]; then
  create_relationship "$MOTHER" "$CHILD" "PARENT_CHILD"
fi

echo "Test completed!" >&2
