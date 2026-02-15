package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Notification represents a system or user notification.
type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Type      string    `gorm:"not null" json:"type"` // e.g., "SYSTEM", "RELATIONSHIP", "MEDIA"
	Title     string    `gorm:"not null" json:"title"`
	Message   string    `gorm:"not null" json:"message"`
	Read      bool      `gorm:"default:false" json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) (err error) {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return
}
