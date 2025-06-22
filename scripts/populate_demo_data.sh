#!/bin/bash

# Script to populate demo genealogical data using curl and jq
# Updated to work with the current Dzinza genealogy API structure
# Ensure jq is installed: sudo apt-get install jq (or equivalent for your OS)

set -e # Exit immediately if a command exits with a non-zero status.
# set -x # Print commands and their arguments as they are executed (for debugging).

API_BASE_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:5173/api"
DEFAULT_EMAIL="admin@dzinza.org"
DEFAULT_PASSWORD="AdminPassword123!"

# Global variables for auth token
AUTH_TOKEN=""

# Function to check if jq is installed
check_jq() {
  if ! command -v jq &> /dev/null
  then
    echo "jq could not be found. Please install jq to run this script."
    echo "For example, on Debian/Ubuntu: sudo apt-get install jq"
    exit 1
  fi
  echo "jq found." >&2
}

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

# Function to create a person using the current API structure
# Usage: create_person <first_name> <last_name> <gender> <dob> [dod] [place_of_birth] [place_of_death] [occupation] [biography]
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

  # Build payload using our current API structure
  local payload_base=$(jq -n \
    --arg firstName "$first_name" \
    --arg lastName "$last_name" \
    --arg gender "$gender" \
    '{firstName: $firstName, lastName: $lastName, gender: $gender}')
  
  # Add optional fields
  if [ -n "$dob" ]; then
    payload_base=$(echo "$payload_base" | jq --arg dob "$dob" '. + {birthDate: $dob}')
  fi
  
  if [ -n "$dod" ]; then
    payload_base=$(echo "$payload_base" | jq --arg dod "$dod" '. + {deathDate: $dod}')
  fi
  
  if [ -n "$pob" ]; then
    payload_base=$(echo "$payload_base" | jq --arg pob "$pob" '. + {placeOfBirth: $pob}')
  fi
  
  if [ -n "$pod" ]; then
    payload_base=$(echo "$payload_base" | jq --arg pod "$pod" '. + {placeOfDeath: $pod}')
  fi
  
  if [ -n "$occupation" ]; then
    payload_base=$(echo "$payload_base" | jq --arg occ "$occupation" '. + {occupation: $occ}')
  fi
  
  if [ -n "$biography" ]; then
    payload_base=$(echo "$payload_base" | jq --arg bio "$biography" '. + {biography: $bio}')
  fi

  response=$(curl -s -X POST "$FRONTEND_URL/genealogy/members" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$payload_base")

  person_id=$(echo "$response" | jq -r '.id // empty')

  if [ -z "$person_id" ] || [ "$person_id" == "null" ]; then
    echo "Error creating person '$first_name $last_name'. Response:" >&2
    echo "$response" >&2
    echo "Continuing with next person..." >&2
    echo "" # Return empty string on failure
  else
    echo "Created $first_name $last_name with ID: $person_id" >&2
    echo "$person_id" # Return ONLY the person_id to stdout
  fi
}

# Function to create a relationship using current API
# Usage: create_relationship <person1_id> <person2_id> <type>
create_relationship() {
  local person1_id="$1"
  local person2_id="$2"
  local type="$3" # SPOUSE, PARENT_CHILD, SIBLING
  local relationship_id

  if [ -z "$person1_id" ] || [ "$person1_id" == "null" ] || [ -z "$person2_id" ] || [ "$person2_id" == "null" ]; then
    echo "Skipping relationship due to missing person ID(s) ($type between $person1_id and $person2_id)" >&2
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
    echo "Error creating relationship ($type between $person1_id and $person2_id). Response:" >&2
    echo "$response" >&2
    echo "Continuing..." >&2
  else
    echo "Relationship created with ID: $relationship_id" >&2
  fi
}

# --- Main Script ---
check_jq
authenticate

echo "Starting demo data population with current API structure..." >&2

# Note: Our current API automatically creates family trees per user,
# so we don't need separate tree creation calls

echo -e "\n--- Processing Adebayo Family (Nigerian Heritage) ---" >&2

# Generation 1 (Grandparents)
P_ADEWALE_A=$(create_person "Adewale" "Adebayo" "male" "1940-05-10" "2010-12-15" "Ibadan, Nigeria" "Lagos, Nigeria" "Traditional Chief" "Adewale was a respected traditional chief in the Yoruba community. He was known for his wisdom and commitment to preserving cultural heritage.")

P_AISHA_B=$(create_person "Aisha" "Bello" "female" "1945-02-20" "1973-01-25" "Kano, Nigeria" "Lagos, Nigeria" "Trader" "Aisha was a successful trader in the Kano markets before her early passing.")

P_FUNMILAYO_O=$(create_person "Funmilayo" "Okoro" "female" "1955-11-05" "" "Enugu, Nigeria" "" "Educator" "Funmilayo is a retired school principal who dedicated her life to educating children.")

# Create spousal relationships for Generation 1
if [ -n "$P_ADEWALE_A" ] && [ -n "$P_AISHA_B" ]; then
  create_relationship "$P_ADEWALE_A" "$P_AISHA_B" "SPOUSE"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_FUNMILAYO_O" ]; then
  create_relationship "$P_ADEWALE_A" "$P_FUNMILAYO_O" "SPOUSE"
fi

# Generation 2 (Parents) - Children of Adewale
P_BOLANLE_A=$(create_person "Bolanle" "Adebayo" "female" "1962-07-19" "" "Ibadan, Nigeria" "" "Nurse" "Bolanle is a dedicated nurse who has worked in both rural and urban hospitals.")

P_CHINEDU_A=$(create_person "Chinedu" "Adebayo" "male" "1965-09-03" "" "Ibadan, Nigeria" "" "Engineer" "Chinedu is a civil engineer who has worked on major infrastructure projects across Nigeria.")

P_NGOZI_A=$(create_person "Ngozi" "Adebayo" "female" "1978-03-25" "" "Lagos, Nigeria" "" "Lawyer" "Ngozi is a human rights lawyer advocating for women's rights and social justice.")

P_OLUMIDE_A=$(create_person "Olumide" "Adebayo" "male" "1982-11-10" "" "Lagos, Nigeria" "" "Software Developer" "Olumide is a tech entrepreneur building fintech solutions for African markets.")

# Create parent-child relationships for Generation 2
if [ -n "$P_ADEWALE_A" ] && [ -n "$P_BOLANLE_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_BOLANLE_A" "PARENT_CHILD"
fi

if [ -n "$P_AISHA_B" ] && [ -n "$P_BOLANLE_A" ]; then
  create_relationship "$P_AISHA_B" "$P_BOLANLE_A" "PARENT_CHILD"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_CHINEDU_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_CHINEDU_A" "PARENT_CHILD"
fi

if [ -n "$P_AISHA_B" ] && [ -n "$P_CHINEDU_A" ]; then
  create_relationship "$P_AISHA_B" "$P_CHINEDU_A" "PARENT_CHILD"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_NGOZI_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_NGOZI_A" "PARENT_CHILD"
fi

if [ -n "$P_FUNMILAYO_O" ] && [ -n "$P_NGOZI_A" ]; then
  create_relationship "$P_FUNMILAYO_O" "$P_NGOZI_A" "PARENT_CHILD"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_OLUMIDE_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_OLUMIDE_A" "PARENT_CHILD"
fi

if [ -n "$P_FUNMILAYO_O" ] && [ -n "$P_OLUMIDE_A" ]; then
  create_relationship "$P_FUNMILAYO_O" "$P_OLUMIDE_A" "PARENT_CHILD"
fi

echo -e "\nDemo data population completed!" >&2
echo "You can now view the family trees through the web interface or API." >&2

# Display family tree summary
echo -e "\n--- Family Tree Summary ---" >&2
echo "Fetching family tree data..." >&2

tree_response=$(curl -s -X GET "$FRONTEND_URL/genealogy/family-tree" \
  -H "Authorization: Bearer $AUTH_TOKEN")

member_count=$(echo "$tree_response" | jq '.members | length')
relationship_count=$(echo "$tree_response" | jq '.relationships | length')

echo "Total family members created: $member_count" >&2
echo "Total relationships created: $relationship_count" >&2
echo "" >&2
echo "Family tree populated successfully!" >&2
