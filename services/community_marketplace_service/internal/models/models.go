package models

import (
	"time"
	"github.com/google/uuid"
)

type Listing struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Type        string    `json:"type"` // DOCUMENT, RESEARCH, SERVICE
	Price       float64   `json:"price"`
	Currency    string    `json:"currency"`
	OwnerID     uuid.UUID `gorm:"type:uuid" json:"owner_id"`
	Status      string    `json:"status"` // AVAILABLE, SOLD, REMOVED
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
