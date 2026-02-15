package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// Media represents a file stored in the system.
type Media struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;index" json:"user_id"`
	PersonID    uuid.UUID      `gorm:"type:uuid;index" json:"person_id"`
	Filename    string         `gorm:"not null" json:"filename"`
	ContentType string         `gorm:"not null" json:"content_type"`
	Size        int64          `gorm:"not null" json:"size"`
	S3Key       string         `gorm:"not null;uniqueIndex" json:"s3_key"`
	Metadata    datatypes.JSON `json:"metadata"` // EXIF or other metadata
	CreatedAt   time.Time      `json:"created_at"`
}
