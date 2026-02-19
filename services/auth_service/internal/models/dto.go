package models

import "time"

// RegisterRequest defines the payload for user registration.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=72"`
	Name     string `json:"name" binding:"required,min=2,max=100"`
}

// LoginRequest defines the payload for user login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// TokenResponse defines the payload returned upon successful authentication.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// RefreshTokenRequest defines the payload for refreshing access tokens.
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// BlacklistTokenRequest defines the payload for blacklisting a token (logout).
type BlacklistTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

// RoleRequest defines the payload for assigning/revoking roles.
type RoleRequest struct {
	UserID string `json:"user_id" binding:"required,uuid"`
	Role   string `json:"role" binding:"required"`
}

// UserStatsResponse defines the payload for user activity stats.
type UserStatsResponse struct {
	UserID      string    `json:"user_id"`
	CreatedAt   time.Time `json:"created_at"`
	LastLoginAt time.Time `json:"last_login_at"`
}
