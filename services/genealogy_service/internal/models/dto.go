package models

// CreateTreeRequest defines the payload for creating a new family tree.
type CreateTreeRequest struct {
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	PrivacyLevel string `json:"privacy_level" binding:"required,oneof=PUBLIC FAMILY_TREE_ONLY PRIVATE"`
}

// CreatePersonRequest defines the payload for adding a person to a tree.
type CreatePersonRequest struct {
	TreeID            string   `json:"tree_id" binding:"required"`
	PrimaryName       Name     `json:"primary_name" binding:"required"`
	Gender            string   `json:"gender" binding:"required,oneof=MALE FEMALE OTHER UNKNOWN"`
	BirthDateString   string   `json:"birth_date_string"`
	BirthPlace        string   `json:"birth_place"`
	IsLiving          bool     `json:"is_living"`
	Biography         string   `json:"biography"`
	Clan              string   `json:"clan"`
	Tribe             string   `json:"tribe"`
	TraditionalTitles []string `json:"traditional_titles"`
}

// CreateRelationshipRequest defines the payload for linking two persons.
type CreateRelationshipRequest struct {
	Person1ID string                 `json:"person1_id" binding:"required,uuid"`
	Person2ID string                 `json:"person2_id" binding:"required,uuid"`
	Type      string                 `json:"type" binding:"required,oneof=PARENT_OF SPOUSE_OF SIBLING_OF"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// CreateDNATestRequest defines the payload for linking a DNA test to a person.
type CreateDNATestRequest struct {
	Provider     string `json:"provider" binding:"required"`
	TestType     string `json:"test_type" binding:"required"`
	KitID        string `json:"kit_id"`
	ResultURL    string `json:"result_url"`
	HaplogroupP  string `json:"haplogroup_p,omitempty"`
	HaplogroupM  string `json:"haplogroup_m,omitempty"`
	RawDataS3Key string `json:"raw_data_s3_key,omitempty"`
}
