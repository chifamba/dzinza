package service

import (
	"context"

	"github.com/chifamba/dzinza/services/auth_service/internal/models"
	"github.com/google/uuid"
)

// Service defines the interface for authentication business logic.
type Service interface {
	RegisterUser(ctx context.Context, req models.RegisterRequest) (*models.TokenResponse, error)
	LoginUser(ctx context.Context, req models.LoginRequest) (*models.TokenResponse, error)
	RefreshToken(ctx context.Context, req models.RefreshTokenRequest) (*models.TokenResponse, error)
	GetUserStats(ctx context.Context, userID uuid.UUID) (*models.UserStatsResponse, error)
	AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RevokeRole(ctx context.Context, userID uuid.UUID, roleName string) error
}
