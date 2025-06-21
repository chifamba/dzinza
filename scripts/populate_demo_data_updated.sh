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
  echo "jq found."
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

echo "Starting demo data population with current API structure..."

# Note: Our current API automatically creates family trees per user,
# so we don't need separate tree creation calls

echo -e "\n--- Processing Adebayo Family (Nigerian Heritage) ---"

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

# Spouses for Generation 2
P_TAYE_ADK=$(create_person "Taye" "Adekunle" "male" "1958-01-10" "" "Abeokuta, Nigeria" "" "Business Owner" "Taye owns a successful import-export business.")

P_IFEOMA_E=$(create_person "Ifeoma" "Eze" "female" "1968-06-20" "" "Onitsha, Nigeria" "" "Doctor" "Dr. Ifeoma is a pediatrician working in both private and public health sectors.")

P_EMEKA_OKA=$(create_person "Emeka" "Okafor" "male" "1975-02-18" "" "Aba, Nigeria" "" "Banker" "Emeka is a senior banker specializing in corporate finance.")

# Create spousal relationships for Generation 2
if [ -n "$P_BOLANLE_A" ] && [ -n "$P_TAYE_ADK" ]; then
  create_relationship "$P_BOLANLE_A" "$P_TAYE_ADK" "SPOUSE"
fi

if [ -n "$P_CHINEDU_A" ] && [ -n "$P_IFEOMA_E" ]; then
  create_relationship "$P_CHINEDU_A" "$P_IFEOMA_E" "SPOUSE"
fi

if [ -n "$P_NGOZI_A" ] && [ -n "$P_EMEKA_OKA" ]; then
  create_relationship "$P_NGOZI_A" "$P_EMEKA_OKA" "SPOUSE"
fi

# Generation 3 (Current Generation)
P_FATIMA_ADK=$(create_person "Fatima" "Adekunle" "female" "1988-12-01" "" "Lagos, Nigeria" "" "Marketing Manager" "Fatima works in digital marketing for a leading telecommunications company.")

P_KWAME_A=$(create_person "Kwame" "Adebayo" "male" "1992-05-14" "" "Abuja, Nigeria" "" "Data Scientist" "Kwame is a data scientist working on AI solutions for healthcare.")

P_CHINAZA_O=$(create_person "Chinaza" "Okafor" "female" "2005-07-22" "" "Enugu, Nigeria" "" "Student" "Chinaza is a university student studying computer science.")

# Create parent-child relationships for Generation 3
if [ -n "$P_TAYE_ADK" ] && [ -n "$P_FATIMA_ADK" ]; then
  create_relationship "$P_TAYE_ADK" "$P_FATIMA_ADK" "PARENT_CHILD"
fi

if [ -n "$P_BOLANLE_A" ] && [ -n "$P_FATIMA_ADK" ]; then
  create_relationship "$P_BOLANLE_A" "$P_FATIMA_ADK" "PARENT_CHILD"
fi

if [ -n "$P_CHINEDU_A" ] && [ -n "$P_KWAME_A" ]; then
  create_relationship "$P_CHINEDU_A" "$P_KWAME_A" "PARENT_CHILD"
fi

if [ -n "$P_IFEOMA_E" ] && [ -n "$P_KWAME_A" ]; then
  create_relationship "$P_IFEOMA_E" "$P_KWAME_A" "PARENT_CHILD"
fi

if [ -n "$P_EMEKA_OKA" ] && [ -n "$P_CHINAZA_O" ]; then
  create_relationship "$P_EMEKA_OKA" "$P_CHINAZA_O" "PARENT_CHILD"
fi

if [ -n "$P_NGOZI_A" ] && [ -n "$P_CHINAZA_O" ]; then
  create_relationship "$P_NGOZI_A" "$P_CHINAZA_O" "PARENT_CHILD"
fi

echo -e "\n--- Processing Dubois-Schmidt Family (European Heritage) ---"

# Generation 1 (Grandparents)
P_JEANLUC_D=$(create_person "Jean-Luc" "Dubois" "male" "1942-03-15" "2015-07-20" "Lyon, France" "Paris, France" "Wine Merchant" "Jean-Luc was a respected wine merchant who built a successful import business.")

P_ANNELISE_S=$(create_person "Annelise" "Schmidt" "female" "1945-09-25" "" "Berlin, Germany" "" "University Professor" "Professor Annelise taught German literature at the Sorbonne for over 30 years.")

P_BRIGITTE_M=$(create_person "Brigitte" "Moreau" "female" "1955-01-30" "" "Lille, France" "" "Art Curator" "Brigitte is a renowned art curator specializing in modern European art.")

# Create spousal relationships for Generation 1
if [ -n "$P_JEANLUC_D" ] && [ -n "$P_ANNELISE_S" ]; then
  create_relationship "$P_JEANLUC_D" "$P_ANNELISE_S" "SPOUSE"
fi

if [ -n "$P_JEANLUC_D" ] && [ -n "$P_BRIGITTE_M" ]; then
  create_relationship "$P_JEANLUC_D" "$P_BRIGITTE_M" "SPOUSE"
fi

# Generation 2 (Parents)
P_SOPHIE_D=$(create_person "Sophie" "Dubois" "female" "1968-04-10" "" "Lyon, France" "" "Fashion Designer" "Sophie runs her own sustainable fashion brand in Paris.")

P_MARKUS_DS=$(create_person "Markus" "Schmidt" "male" "1972-11-05" "" "Munich, Germany" "" "Software Architect" "Markus is a senior software architect at a major automotive company.")

P_PIERRE_D=$(create_person "Pierre" "Dubois" "male" "1992-07-20" "" "Paris, France" "" "Chef" "Pierre is an up-and-coming chef who recently opened his own restaurant.")

# Create parent-child relationships for Generation 2
if [ -n "$P_JEANLUC_D" ] && [ -n "$P_SOPHIE_D" ]; then
  create_relationship "$P_JEANLUC_D" "$P_SOPHIE_D" "PARENT_CHILD"
fi

if [ -n "$P_ANNELISE_S" ] && [ -n "$P_SOPHIE_D" ]; then
  create_relationship "$P_ANNELISE_S" "$P_SOPHIE_D" "PARENT_CHILD"
fi

if [ -n "$P_JEANLUC_D" ] && [ -n "$P_MARKUS_DS" ]; then
  create_relationship "$P_JEANLUC_D" "$P_MARKUS_DS" "PARENT_CHILD"
fi

if [ -n "$P_ANNELISE_S" ] && [ -n "$P_MARKUS_DS" ]; then
  create_relationship "$P_ANNELISE_S" "$P_MARKUS_DS" "PARENT_CHILD"
fi

if [ -n "$P_JEANLUC_D" ] && [ -n "$P_PIERRE_D" ]; then
  create_relationship "$P_JEANLUC_D" "$P_PIERRE_D" "PARENT_CHILD"
fi

if [ -n "$P_BRIGITTE_M" ] && [ -n "$P_PIERRE_D" ]; then
  create_relationship "$P_BRIGITTE_M" "$P_PIERRE_D" "PARENT_CHILD"
fi

# Spouses for Generation 2
P_KLAUS_W=$(create_person "Klaus" "Weber" "male" "1965-07-15" "" "Hamburg, Germany" "" "Marine Engineer" "Klaus designs ships and offshore platforms.")

P_LENA_B=$(create_person "Lena" "Bauer" "female" "1975-02-20" "" "Stuttgart, Germany" "" "Graphic Designer" "Lena is a freelance graphic designer specializing in brand identity.")

P_AMELIE_DUR=$(create_person "Amélie" "Durand" "female" "1994-05-05" "" "Lyon, France" "" "Environmental Scientist" "Amélie works on climate change research and sustainable development projects.")

# Create spousal relationships for Generation 2
if [ -n "$P_SOPHIE_D" ] && [ -n "$P_KLAUS_W" ]; then
  create_relationship "$P_SOPHIE_D" "$P_KLAUS_W" "SPOUSE"
fi

if [ -n "$P_MARKUS_DS" ] && [ -n "$P_LENA_B" ]; then
  create_relationship "$P_MARKUS_DS" "$P_LENA_B" "SPOUSE"
fi

if [ -n "$P_PIERRE_D" ] && [ -n "$P_AMELIE_DUR" ]; then
  create_relationship "$P_PIERRE_D" "$P_AMELIE_DUR" "SPOUSE"
fi

# Generation 3 (Current Generation)
P_LUKAS_W=$(create_person "Lukas" "Weber" "male" "1995-03-12" "" "Berlin, Germany" "" "Game Developer" "Lukas develops indie video games and mobile applications.")

P_MARIE_W=$(create_person "Marie" "Weber" "female" "1998-09-01" "" "Berlin, Germany" "" "Medical Student" "Marie is studying medicine with a focus on pediatric care.")

P_FINN_S=$(create_person "Finn" "Schmidt" "male" "2003-06-28" "" "Hamburg, Germany" "" "Student" "Finn is a high school student interested in renewable energy engineering.")

P_CHLOE_D=$(create_person "Chloé" "Dubois" "female" "2022-02-10" "" "Paris, France" "" "" "")

# Create parent-child relationships for Generation 3
if [ -n "$P_KLAUS_W" ] && [ -n "$P_LUKAS_W" ]; then
  create_relationship "$P_KLAUS_W" "$P_LUKAS_W" "PARENT_CHILD"
fi

if [ -n "$P_SOPHIE_D" ] && [ -n "$P_LUKAS_W" ]; then
  create_relationship "$P_SOPHIE_D" "$P_LUKAS_W" "PARENT_CHILD"
fi

if [ -n "$P_KLAUS_W" ] && [ -n "$P_MARIE_W" ]; then
  create_relationship "$P_KLAUS_W" "$P_MARIE_W" "PARENT_CHILD"
fi

if [ -n "$P_SOPHIE_D" ] && [ -n "$P_MARIE_W" ]; then
  create_relationship "$P_SOPHIE_D" "$P_MARIE_W" "PARENT_CHILD"
fi

if [ -n "$P_MARKUS_DS" ] && [ -n "$P_FINN_S" ]; then
  create_relationship "$P_MARKUS_DS" "$P_FINN_S" "PARENT_CHILD"
fi

if [ -n "$P_LENA_B" ] && [ -n "$P_FINN_S" ]; then
  create_relationship "$P_LENA_B" "$P_FINN_S" "PARENT_CHILD"
fi

if [ -n "$P_PIERRE_D" ] && [ -n "$P_CHLOE_D" ]; then
  create_relationship "$P_PIERRE_D" "$P_CHLOE_D" "PARENT_CHILD"
fi

if [ -n "$P_AMELIE_DUR" ] && [ -n "$P_CHLOE_D" ]; then
  create_relationship "$P_AMELIE_DUR" "$P_CHLOE_D" "PARENT_CHILD"
fi

echo -e "\nDemo data population completed!"
echo "Check the output above for any errors."
echo "You can now view the family trees through the web interface or API."

# Display family tree summary
echo -e "\n--- Family Tree Summary ---"
echo "Fetching family tree data..."

tree_response=$(curl -s -X GET "$FRONTEND_URL/genealogy/family-tree" \
  -H "Authorization: Bearer $AUTH_TOKEN")

member_count=$(echo "$tree_response" | jq '.members | length')
relationship_count=$(echo "$tree_response" | jq '.relationships | length')

echo "Total family members created: $member_count"
echo "Total relationships created: $relationship_count"
echo ""
echo "Family tree populated successfully!"
