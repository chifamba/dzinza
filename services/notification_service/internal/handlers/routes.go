package handlers

import (
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *NotificationHandler, jwtSecret string) {
	api := r.Group("/api/v1/notifications")
	{
		// Internal endpoint to create notification
		api.POST("", h.Notify)

		// Protected endpoints for users
		user := api.Group("/")
		user.Use(auth.AuthMiddleware(jwtSecret))
		{
			user.GET("", h.GetNotifications)
			user.POST("/:id/read", h.MarkAsRead)
		}
	}
}
