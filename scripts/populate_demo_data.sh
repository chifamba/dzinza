#!/bin/bash

# Script to populate demo genealogical data using curl and jq
# Updated to work with the new Python/FastAPI Dzinza backend structure.
# Ensure jq is installed: sudo apt-get install jq (or equivalent for your OS)

set -e # Exit immediately if a command exits with a non-zero status.
# set -x # Print commands and their arguments as they are executed (for debugging).

# Use environment variables for ports, or defaults if not set.
# These should align with your .env file used by docker-compose.
GATEWAY_PORT="${GATEWAY_PORT:-3001}"
GATEWAY_URL="http://localhost:${GATEWAY_PORT}/api/v1" # Python services are under /api/v1

DEFAULT_EMAIL="admin@dzinza.org"
DEFAULT_PASSWORD="AdminPassword123!"

# Global variables
AUTH_TOKEN=""
DEMO_TREE_ID=""

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
  echo "Authenticating with the API via Gateway: $GATEWAY_URL/auth/login" >&2
  
  payload=$(jq -n \
    --arg email "$DEFAULT_EMAIL" \
    --arg password "$DEFAULT_PASSWORD" \
    '{email: $email, password: $password}')
  
  response=$(curl -s -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  AUTH_TOKEN=$(echo "$response" | jq -r '.access_token // empty') # Python auth returns access_token
  
  if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" == "null" ]; then
    echo "Failed to authenticate. Response:" >&2
    echo "$response" >&2
    exit 1
  fi
  
  echo "Authentication successful. Token obtained." >&2
}

# Function to get or create a default family tree for the demo user
get_or_create_default_tree() {
  echo "Checking for existing family trees..." >&2

  response=$(curl -s -X GET "$GATEWAY_URL/family-trees" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  # Assuming the response is like {"items": [...], "total": ...}
  # Check if items array is empty or not present
  existing_tree_id=$(echo "$response" | jq -r '.items[0].id // empty')

  if [ -n "$existing_tree_id" ] && [ "$existing_tree_id" != "null" ]; then
    DEMO_TREE_ID="$existing_tree_id"
    echo "Found existing family tree for user: $DEMO_TREE_ID" >&2
  else
    echo "No existing tree found. Creating a default demo tree..." >&2
    tree_payload=$(jq -n \
      --arg name "Demo Family Tree (Adebayo)" \
      --arg description "A sample tree for demonstration purposes." \
      --arg privacy "private" \
      '{name: $name, description: $description, privacy: $privacy}')

    create_response=$(curl -s -X POST "$GATEWAY_URL/family-trees" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$tree_payload")

    DEMO_TREE_ID=$(echo "$create_response" | jq -r '.id // empty')
    if [ -z "$DEMO_TREE_ID" ] || [ "$DEMO_TREE_ID" == "null" ]; then
      echo "Failed to create default family tree. Response:" >&2
      echo "$create_response" >&2
      exit 1
    fi
    echo "Created default demo family tree: $DEMO_TREE_ID" >&2
  fi
}


# Function to create a person in the demo tree
# Usage: create_person <first_name> <last_name> <gender> <dob_string> [dod_string] [pob] [pod] [occupation] [biography]
create_person() {
  local first_name="$1"
  local last_name="$2"
  local gender="$3" # Python uses 'male', 'female', 'other', 'unknown', 'non_binary'
  local dob_string="${4:-}"
  local dod_string="${5:-}"
  local pob="${6:-}"
  local pod="${7:-}"
  local occupation="${8:-}"
  local biography="${9:-}"
  local person_id

  echo "Creating person: $first_name $last_name in tree $DEMO_TREE_ID..." >&2

  # Build payload for Python PersonCreate schema
  local name_obj=$(jq -n --arg gn "$first_name" --arg sn "$last_name" '{given_name: $gn, surname: $sn}')
  
  local payload=$(jq -n \
    --argjson tree_ids "[\"$DEMO_TREE_ID\"]" \
    --argjson name_obj "$name_obj" \
    --arg gender "$gender" \
    --arg dob_s "$dob_string" \
    --arg dod_s "$dod_string" \
    --arg pob_s "$pob" \
    --arg pod_s "$pod" \
    --arg occ_s "$occupation" \
    --arg bio_s "$biography" \
    '{
      tree_ids: $tree_ids,
      primary_name: $name_obj,
      gender: $gender,
      birth_date_string: (if $dob_s == "" then null else $dob_s end),
      death_date_string: (if $dod_s == "" then null else $dod_s end),
      birth_place: (if $pob_s == "" then null else $pob_s end),
      death_place: (if $pod_s == "" then null else $pod_s end),
      facts: (if $occ_s == "" then [] else [{"type": "Occupation", "value": $occ_s}] end),
      biography: (if $bio_s == "" then null else $bio_s end)
    }')
  
  # Determine is_living based on dod_string for the payload (model validator handles it too)
  if [ -n "$dod_string" ]; then
    payload=$(echo "$payload" | jq '. + {is_living: false}')
  else
    payload=$(echo "$payload" | jq '. + {is_living: true}')
  fi

  response=$(curl -s -X POST "$GATEWAY_URL/family-trees/$DEMO_TREE_ID/persons" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$payload")

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

# Function to create a relationship
# Usage: create_relationship <person1_id> <person2_id> <python_relationship_type> [spousal_status] [parental_role_p1]
create_relationship() {
  local p1_id="$1"
  local p2_id="$2"
  local type="$3" # Python RelationshipType enum value e.g. "spouse", "parent_of"
  local spousal_status="${4:-}" # Optional: e.g. "Married"
  local p1_role="${5:-}" # Optional: e.g. "BiologicalFather" for PARENT_OF
  local relationship_id

  if [ -z "$p1_id" ] || [ "$p1_id" == "null" ] || [ -z "$p2_id" ] || [ "$p2_id" == "null" ]; then
    echo "Skipping relationship due to missing person ID(s) ($type between $p1_id and $p2_id)" >&2
    return
  fi

  echo "Creating relationship: $p1_id ($type) $p2_id in tree $DEMO_TREE_ID..." >&2

  local payload_base=$(jq -n \
    --arg p1 "$p1_id" \
    --arg p2 "$p2_id" \
    --arg rt "$type" \
    '{person1_id: $p1, person2_id: $p2, relationship_type: $rt}')

  if [ "$type" == "spouse" ] && [ -n "$spousal_status" ]; then
    payload_base=$(echo "$payload_base" | jq --arg ss "$spousal_status" '. + {spousal_status: $ss}')
  fi
  if [ "$type" == "parent_of" ] && [ -n "$p1_role" ]; then # Assuming p1 is parent
    payload_base=$(echo "$payload_base" | jq --arg prp1 "$p1_role" '. + {parental_role_person1: $prp1}')
  fi

  response=$(curl -s -X POST "$GATEWAY_URL/family-trees/$DEMO_TREE_ID/relationships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$payload_base")

  relationship_id=$(echo "$response" | jq -r '.id // empty')

  if [ -z "$relationship_id" ] || [ "$relationship_id" == "null" ]; then
    echo "Error creating relationship ($type between $p1_id and $p2_id). Response:" >&2
    echo "$response" >&2
    echo "Continuing..." >&2
  else
    echo "Relationship created with ID: $relationship_id" >&2
  fi
}

# --- Main Script ---
check_jq
authenticate
get_or_create_default_tree

if [ -z "$DEMO_TREE_ID" ]; then
  echo "Failed to obtain a DEMO_TREE_ID. Exiting." >&2
  exit 1
fi

echo -e "\n--- Processing Adebayo Family (Nigerian Heritage) for Tree ID: $DEMO_TREE_ID ---" >&2

# Generation 1 (Grandparents)
# Python Gender enum: male, female, non_binary, other, unknown
P_ADEWALE_A=$(create_person "Adewale" "Adebayo" "male" "1940-05-10" "2010-12-15" "Ibadan, Nigeria" "Lagos, Nigeria" "Traditional Chief" "Adewale was a respected traditional chief...")
P_AISHA_B=$(create_person "Aisha" "Bello" "female" "1945-02-20" "1973-01-25" "Kano, Nigeria" "Lagos, Nigeria" "Trader" "Aisha was a successful trader...")
P_FUNMILAYO_O=$(create_person "Funmilayo" "Okoro" "female" "1955-11-05" "" "Enugu, Nigeria" "" "Educator" "Funmilayo is a retired school principal...")

# Create spousal relationships for Generation 1
# Python RelationshipType: spouse, SpousalStatus: Married
if [ -n "$P_ADEWALE_A" ] && [ -n "$P_AISHA_B" ]; then
  create_relationship "$P_ADEWALE_A" "$P_AISHA_B" "spouse" "Married"
fi
if [ -n "$P_ADEWALE_A" ] && [ -n "$P_FUNMILAYO_O" ]; then
  create_relationship "$P_ADEWALE_A" "$P_FUNMILAYO_O" "spouse" "Married"
fi

# Generation 2 (Parents) - Children of Adewale
P_BOLANLE_A=$(create_person "Bolanle" "Adebayo" "female" "1962-07-19" "" "Ibadan, Nigeria" "" "Nurse" "Bolanle is a dedicated nurse...")
P_CHINEDU_A=$(create_person "Chinedu" "Adebayo" "male" "1965-09-03" "" "Ibadan, Nigeria" "" "Engineer" "Chinedu is a civil engineer...")
P_NGOZI_A=$(create_person "Ngozi" "Adebayo" "female" "1978-03-25" "" "Lagos, Nigeria" "" "Lawyer" "Ngozi is a human rights lawyer...")
P_OLUMIDE_A=$(create_person "Olumide" "Adebayo" "male" "1982-11-10" "" "Lagos, Nigeria" "" "Software Developer" "Olumide is a tech entrepreneur...")

# Create parent-child relationships for Generation 2
# Python RelationshipType: parent_of, ParentalRole: BiologicalFather/BiologicalMother
# Person1 is parent, Person2 is child.
if [ -n "$P_ADEWALE_A" ] && [ -n "$P_BOLANLE_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_BOLANLE_A" "parent_of" "" "BiologicalFather"
fi
if [ -n "$P_AISHA_B" ] && [ -n "$P_BOLANLE_A" ]; then
  create_relationship "$P_AISHA_B" "$P_BOLANLE_A" "parent_of" "" "BiologicalMother"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_CHINEDU_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_CHINEDU_A" "parent_of" "" "BiologicalFather"
fi
if [ -n "$P_AISHA_B" ] && [ -n "$P_CHINEDU_A" ]; then
  create_relationship "$P_AISHA_B" "$P_CHINEDU_A" "parent_of" "" "BiologicalMother"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_NGOZI_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_NGOZI_A" "parent_of" "" "BiologicalFather"
fi
if [ -n "$P_FUNMILAYO_O" ] && [ -n "$P_NGOZI_A" ]; then
  create_relationship "$P_FUNMILAYO_O" "$P_NGOZI_A" "parent_of" "" "BiologicalMother"
fi

if [ -n "$P_ADEWALE_A" ] && [ -n "$P_OLUMIDE_A" ]; then
  create_relationship "$P_ADEWALE_A" "$P_OLUMIDE_A" "parent_of" "" "BiologicalFather"
fi
if [ -n "$P_FUNMILAYO_O" ] && [ -n "$P_OLUMIDE_A" ]; then
  create_relationship "$P_FUNMILAYO_O" "$P_OLUMIDE_A" "parent_of" "" "BiologicalMother"
fi


echo -e "\nDemo data population completed!" >&2
echo "You can now view the family tree ID $DEMO_TREE_ID through the web interface or API." >&2

# Display family tree summary (using Python API structure)
echo -e "\n--- Family Tree Summary for Tree ID: $DEMO_TREE_ID ---" >&2
echo "Fetching persons in tree..." >&2

persons_response=$(curl -s -X GET "$GATEWAY_URL/family-trees/$DEMO_TREE_ID/persons" \
  -H "Authorization: Bearer $AUTH_TOKEN")

member_count=$(echo "$persons_response" | jq '.total // 0') # Assuming PersonList has 'total'

echo "Fetching relationships in tree..." >&2
# There isn't a direct "list all relationships in tree" endpoint yet, this is more complex.
# For now, we'll just count persons.
# relationships_response=$(curl -s -X GET "$GATEWAY_URL/family-trees/$DEMO_TREE_ID/relationships" \
#   -H "Authorization: Bearer $AUTH_TOKEN")
# relationship_count=$(echo "$relationships_response" | jq '.total // 0')


echo "Total family members created in this tree (via API): $member_count" >&2
# echo "Total relationships created in this tree (via API): $relationship_count" >&2
echo "" >&2
echo "Family tree populated successfully!" >&2
