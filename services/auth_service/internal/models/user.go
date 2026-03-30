package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a registered user in the system.
type User struct {
	ID             uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email          string         `gorm:"uniqueIndex;not null" json:"email"`
	HashedPassword string         `gorm:"not null" json:"-"`
	Name           string         `gorm:"not null" json:"name"`
	Roles          []Role         `gorm:"many2many:user_roles;" json:"roles"`
	LastLoginAt    time.Time      `json:"last_login_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// Role represents a system-wide role (e.g., Admin, Moderator, User).
type Role struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"uniqueIndex;not null" json:"name"`
	Description string `json:"description"`
}

// UserTreeRole represents a user's role on a specific family tree.
// This is likely stored in PostgreSQL to enforce authz before hitting Neo4j,
// or maybe it's just for reference. The requirements say "Models: Role, UserTreeRole".
type UserTreeRole struct {
	UserID uuid.UUID `gorm:"primaryKey;type:uuid" json:"user_id"`
	TreeID string    `gorm:"primaryKey" json:"tree_id"` // ID from Neo4j
	Role   string    `gorm:"not null" json:"role"`      // e.g., "admin", "editor", "viewer"
}
