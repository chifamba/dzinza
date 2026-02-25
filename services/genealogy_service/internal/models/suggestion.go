package models

import "encoding/json"

// SuggestionPayload represents the data structure stored in the payload of a suggestion.
type SuggestionPayload struct {
	Action string          `json:"action"` // e.g., UPDATE_PERSON, CREATE_RELATIONSHIP
	Data   json.RawMessage `json:"data"`
}

// Actions
const (
	ActionUpdatePerson       = "UPDATE_PERSON"
	ActionCreateRelationship = "CREATE_RELATIONSHIP"
	ActionDeleteRelationship = "DELETE_RELATIONSHIP"
	ActionDeletePerson       = "DELETE_PERSON"
)
