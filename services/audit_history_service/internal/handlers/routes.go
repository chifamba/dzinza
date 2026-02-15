package handlers

import (
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *AuditHandler, jwtSecret string) {
	// Protected routes
	api := r.Group("/api/v1/audit")
	{
		// Internal endpoint to create audit log (should be restricted to internal calls in prod)
		api.POST("", h.CreateAuditLog)

		// Admin endpoint to view audit logs
		admin := api.Group("/")
		admin.Use(auth.AuthMiddleware(jwtSecret))
		{
			admin.GET("", h.GetAuditLogs)
		}
	}
}
