package handlers

import (
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *MediaHandler, jwtSecret string) {
	api := r.Group("/api/v1/media")
	api.Use(auth.AuthMiddleware(jwtSecret))
	{
		api.POST("/upload", h.UploadMedia)
		api.GET("/:id", h.GetMedia)
		api.DELETE("/:id", h.DeleteMedia)
		api.GET("/person/:person_id", h.ListPersonMedia)
	}
}
