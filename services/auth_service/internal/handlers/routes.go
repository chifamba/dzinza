package handlers

import (
	"time"

	"github.com/chifamba/dzinza/services/auth_service/internal/middleware"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func RegisterRoutes(r *gin.Engine, authHandler *AuthHandler, cfg *config.Config, rdb *redis.Client) {
	// Global Rate Limiting (example: 100 req/min per IP)
	r.Use(middleware.RateLimitMiddleware(rdb, 100, time.Minute))

	// Public routes
	r.POST("/register", authHandler.Register)
	r.POST("/login", authHandler.Login)
	r.POST("/refresh-token", authHandler.RefreshToken)

	// User Stats (Public/Internal for other services)
	r.GET("/api/v1/users/:id/stats", authHandler.GetUserStats)

	// Protected routes
	protected := r.Group("/")
	protected.Use(auth.AuthMiddleware(cfg.JWTSecret))
	{
		// Admin routes for RBAC
		admin := protected.Group("/admin")
		admin.Use(middleware.RBACMiddleware("admin"))
		{
			admin.POST("/assign-role", authHandler.AssignRole)
			admin.POST("/revoke-role", authHandler.RevokeRole)
		}
	}
}
