package models

import "time"

// Translation represents a localized string.
type Translation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `json:"key"`
	Locale    string    `json:"locale"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CulturalNamePattern represents a parsing rule for a specific culture.
type CulturalNamePattern struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Culture     string `json:"culture"`
	Pattern     string `json:"pattern"`
	Description string `json:"description"`
}

// ParsedCulturalName represents the result of cultural name parsing.
type ParsedCulturalName struct {
	Culture    string `json:"culture"`
	FullName   string `json:"full_name"`
	GivenName  string `json:"given_name"`
	MiddleName string `json:"middle_name,omitempty"`
	Surname    string `json:"surname"`
	Totem      string `json:"totem,omitempty"`      // Shona: mutupo
	ClanName   string `json:"clan_name,omitempty"`   // Ndebele: isibongo
	Honorific  string `json:"honorific,omitempty"`   // e.g., "Va" in Shona
}
