package models

type Translation struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Key      string `gorm:"uniqueIndex:idx_key_locale" json:"key"`
	Locale   string `gorm:"uniqueIndex:idx_key_locale" json:"locale"`
	Value    string `json:"value"`
	Category string `json:"category"` // UI, EMAIL, ERROR
}

type CulturalNamePattern struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	CultureCode string `json:"culture_code"` // e.g., "ZW-SHONA"
	Pattern     string `json:"pattern"`      // regex or template
	Description string `json:"description"`
}
