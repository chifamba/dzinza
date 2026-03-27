package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/auth_service/internal/models"
	"github.com/google/uuid"
)

// Repository defines the interface for user data persistence.
type Repository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	EmailExists(ctx context.Context, email string) (bool, error)
	GetRoleByName(ctx context.Context, name string) (*models.Role, error)
	AssignRoleToUser(ctx context.Context, userID uuid.UUID, roleID uint) error
	RevokeRoleFromUser(ctx context.Context, userID uuid.UUID, roleID uint) error
	UpdateLastLogin(ctx context.Context, userID uuid.UUID, loginTime time.Time) error
}
