package models

import "time"

// PersonIndex represents the document structure in Elasticsearch
type PersonIndex struct {
	ID             string    `json:"id"`
	TreeID         string    `json:"tree_id"`
	PrimaryName    Name      `json:"primary_name"`
	AlternateNames []Name    `json:"alternate_names"`
	Gender         string    `json:"gender"`
	BirthDate      string    `json:"birth_date"`
	BirthPlace     string    `json:"birth_place"`
	DeathDate      string    `json:"death_date"`
	DeathPlace     string    `json:"death_place"`
	Biography      string    `json:"biography"`
	Clan           string    `json:"clan"`
	Tribe          string    `json:"tribe"`
	IsLiving       bool      `json:"is_living"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Name represents a person's name details
type Name struct {
	GivenName string `json:"given_name"`
	Surname   string `json:"surname"`
	Prefix    string `json:"prefix"`
	Suffix    string `json:"suffix"`
	Nickname  string `json:"nickname"`
}

// SearchResponse is the structure for search results
type SearchResponse struct {
	Total int64         `json:"total"`
	Hits  []SearchResult `json:"hits"`
}

// SearchResult is a single search hit
type SearchResult struct {
	Score  float64     `json:"score"`
	Person PersonIndex `json:"person"`
}
