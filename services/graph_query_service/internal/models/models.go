package models

import "github.com/google/uuid"

type Name struct {
	GivenName string `json:"given_name"`
	Surname   string `json:"surname"`
	Prefix    string `json:"prefix,omitempty"`
	Suffix    string `json:"suffix,omitempty"`
	Nickname  string `json:"nickname,omitempty"`
}

type Person struct {
	ID               uuid.UUID `json:"id"`
	PrimaryName      Name      `json:"primary_name"`
	AlternateNames   []Name    `json:"alternate_names,omitempty"`
	Gender           string    `json:"gender"`
	BirthDateString  string    `json:"birth_date_string,omitempty"`
	BirthDateExact   string    `json:"birth_date_exact,omitempty"`
	BirthPlace       string    `json:"birth_place,omitempty"`
	DeathDateString  string    `json:"death_date_string,omitempty"`
	DeathDateExact   string    `json:"death_date_exact,omitempty"`
	IsLiving         bool      `json:"is_living"`
	Biography        string    `json:"biography,omitempty"`
	Clan             string    `json:"clan,omitempty"`
	Tribe            string    `json:"tribe,omitempty"`
	TreeID           string    `json:"tree_id"`
}

type FamilyTree struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	OwnerID     uuid.UUID `json:"owner_id"`
}
