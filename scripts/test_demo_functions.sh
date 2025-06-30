#!/bin/bash

# Small test for the demo script functions
# This script now sources functions from the updated populate_demo_data.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.." # Not strictly needed here if not cd'ing to root

# Source the main demo data script to get its functions and variables
# This assumes populate_demo_data.sh is in the same directory
# Sourcing will execute the initial check_jq, authenticate, get_or_create_default_tree
echo "Sourcing populate_demo_data.sh to setup environment and functions..." >&2
source "$SCRIPT_DIR/populate_demo_data.sh"

echo ""
echo "--- Starting Test Demo Functions ---" >&2

if [ -z "$AUTH_TOKEN" ]; then
  echo "ERROR: Authentication failed (AUTH_TOKEN not set from sourced script). Exiting test." >&2
  exit 1
fi

if [ -z "$DEMO_TREE_ID" ]; then
  echo "ERROR: DEMO_TREE_ID not set (get_or_create_default_tree might have failed in sourced script). Exiting test." >&2
  exit 1
fi

echo "Using API Gateway: $GATEWAY_URL" >&2
echo "Using Tree ID: $DEMO_TREE_ID for tests." >&2
echo "Testing person and relationship creation..." >&2

# create_person function is now from the sourced populate_demo_data.sh
# Usage: create_person <first_name> <last_name> <gender> <dob_string> [dod_string] [pob] [pod] [occupation] [biography]
# Python Gender enum values: "male", "female", "non_binary", "other", "unknown"

# create_relationship function is also from sourced script
# Usage: create_relationship <p1_id> <p2_id> <python_relationship_type> [spousal_status] [parental_role_p1]
# Python RelationshipType enum values: "spouse", "parent_of", "child_of", "sibling_of", etc.
# SpousalStatus: "Married", "Divorced", etc.
# ParentalRole: "BiologicalFather", "BiologicalMother", etc. (for person1 if type is parent_of)

FATHER_FN="TestFather"
FATHER_LN="ScriptUser"
MOTHER_FN="TestMother"
MOTHER_LN="ScriptUser"
CHILD_FN="TestChild"
CHILD_LN="ScriptUser"

# Create Persons
FATHER_ID=$(create_person "$FATHER_FN" "$FATHER_LN" "male" "1970-01-01" "" "Test City" "" "Engineer" "A test father created by script.")
MOTHER_ID=$(create_person "$MOTHER_FN" "$MOTHER_LN" "female" "1972-05-15" "" "Test City" "" "Teacher" "A test mother created by script.")
CHILD_ID=$(create_person "$CHILD_FN" "$CHILD_LN" "female" "2000-08-20" "" "Test City" "" "Student" "A test child created by script.")

echo ""
echo "--- Person Creation Results ---" >&2
echo "Father ID: '$FATHER_ID'" >&2
echo "Mother ID: '$MOTHER_ID'" >&2
echo "Child ID: '$CHILD_ID'" >&2
echo ""

echo "--- Testing Relationship Creation ---" >&2
# Create Relationships
if [ -n "$FATHER_ID" ] && [ -n "$MOTHER_ID" ] && [ "$FATHER_ID" != "null" ] && [ "$MOTHER_ID" != "null" ]; then
  create_relationship "$FATHER_ID" "$MOTHER_ID" "spouse" "Married"
else
  echo "Skipping FATHER-MOTHER spouse relationship due to missing ID(s)." >&2
fi

if [ -n "$FATHER_ID" ] && [ -n "$CHILD_ID" ] && [ "$FATHER_ID" != "null" ] && [ "$CHILD_ID" != "null" ]; then
  create_relationship "$FATHER_ID" "$CHILD_ID" "parent_of" "" "BiologicalFather"
else
  echo "Skipping FATHER-CHILD parent_of relationship due to missing ID(s)." >&2
fi

if [ -n "$MOTHER_ID" ] && [ -n "$CHILD_ID" ] && [ "$MOTHER_ID" != "null" ] && [ "$CHILD_ID" != "null" ]; then
  create_relationship "$MOTHER_ID" "$CHILD_ID" "parent_of" "" "BiologicalMother"
else
  echo "Skipping MOTHER-CHILD parent_of relationship due to missing ID(s)." >&2
fi

echo ""
echo "--- Test Demo Functions Completed! ---" >&2
echo "Verify results by checking the application or database for tree $DEMO_TREE_ID." >&2
echo "Persons created: $FATHER_FN $FATHER_LN, $MOTHER_FN $MOTHER_LN, $CHILD_FN $CHILD_LN." >&2
