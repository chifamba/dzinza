package models

import (
	"time"

	"github.com/google/uuid"
)

// Person represents a node in the Neo4j graph.
type Person struct {
	ID                 uuid.UUID              `json:"id"`
	PrimaryName        Name                   `json:"primary_name"`
	AlternateNames     []Name                 `json:"alternate_names"`
	Gender             string                 `json:"gender"`
	BirthDateString    string                 `json:"birth_date_string"`
	BirthDateExact     *time.Time             `json:"birth_date_exact"`
	BirthPlace         string                 `json:"birth_place"`
	DeathDateString    string                 `json:"death_date_string"`
	DeathDateExact     *time.Time             `json:"death_date_exact"`
	IsLiving           bool                   `json:"is_living"`
	Biography          string                 `json:"biography"`
	Clan               string                 `json:"clan"`
	Tribe              string                 `json:"tribe"`
	TraditionalTitles  []string               `json:"traditional_titles"`
	PrivacySettings    map[string]interface{} `json:"privacy_settings"`
	Facts              []Fact                 `json:"facts"`
	DNATests           []DNATest              `json:"dna_tests"`
	TreeID             string                 `json:"tree_id"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

// Name represents a person's name structure.
type Name struct {
	GivenName  string `json:"given_name"`
	Surname    string `json:"surname"`
	Prefix     string `json:"prefix"`
	Suffix     string `json:"suffix"`
	Nickname   string `json:"nickname"`
	Type       string `json:"type"` // e.g., "birth", "married", "alias"
}

// Fact represents a life event.
type Fact struct {
	Type         string                 `json:"type"` // e.g., "Birth", "Death", "Marriage"
	Date         string                 `json:"date"`
	Place        string                 `json:"place"`
	Description  string                 `json:"description"`
	Sources      []string               `json:"sources"`
	PrivacyLevel string                 `json:"privacy_level"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// FamilyTree represents a metadata node for a family tree.
type FamilyTree struct {
	ID            string    `json:"id"`
	OwnerID       uuid.UUID `json:"owner_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	RootPersonID  uuid.UUID `json:"root_person_id"`
	PrivacyLevel  string    `json:"privacy_level"` // e.g., "PUBLIC", "FAMILY_TREE_ONLY", "PRIVATE"
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Relationship types
const (
	RelParentOf  = "PARENT_OF"
	RelSpouseOf  = "SPOUSE_OF"
	RelSiblingOf = "SIBLING_OF"
	RelMemberOf  = "MEMBER_OF"
)

// DNATest represents DNA testing data linked to a person.
type DNATest struct {
	ID             uuid.UUID `json:"id"`
	PersonID       uuid.UUID `json:"person_id"`
	Provider       string    `json:"provider"` // e.g., "Ancestry", "23andMe", "MyHeritage"
	TestType       string    `json:"test_type"` // e.g., "Autosomal", "Y-DNA", "mtDNA"
	KitID          string    `json:"kit_id"`
	ResultURL      string    `json:"result_url"`
	HaplogroupP    string    `json:"haplogroup_p,omitempty"` // Paternal
	HaplogroupM    string    `json:"haplogroup_m,omitempty"` // Maternal
	RawDataS3Key   string    `json:"raw_data_s3_key,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// ImportSummary tracks results of a GEDCOM import.
type ImportSummary struct {
	PersonsCreated       int      `json:"persons_created"`
	RelationshipsCreated int      `json:"relationships_created"`
	Warnings             []string `json:"warnings"`
}

// Relationship represents a graph edge between two persons.
type Relationship struct {
	Person1ID uuid.UUID              `json:"person1_id"`
	Person2ID uuid.UUID              `json:"person2_id"`
	Type      string                 `json:"type"`
	Metadata  map[string]interface{} `json:"metadata"`
}
