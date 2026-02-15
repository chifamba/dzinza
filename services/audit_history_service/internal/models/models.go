package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// AuditLog represents an entry in the audit history.
type AuditLog struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	UserID     uuid.UUID      `gorm:"type:uuid;index" json:"user_id"`
	Action     string         `gorm:"not null;index" json:"action"`      // e.g., "CREATE", "UPDATE", "DELETE"
	EntityType string         `gorm:"not null;index" json:"entity_type"` // e.g., "PERSON", "TREE", "RELATIONSHIP"
	EntityID   string         `gorm:"not null;index" json:"entity_id"`   // UUID or other ID of the entity
	OldValue   datatypes.JSON `json:"old_value"`
	NewValue   datatypes.JSON `json:"new_value"`
	IPAddress  string         `json:"ip_address"`
	Timestamp  time.Time      `gorm:"autoCreateTime;index" json:"timestamp"`
}
