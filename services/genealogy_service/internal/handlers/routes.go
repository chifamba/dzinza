package handlers

import (
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *GenealogyHandler, jwtSecret string) {
	// Protected routes
	api := r.Group("/api/v1")
	api.Use(auth.AuthMiddleware(jwtSecret))
	{
		// Tree management
		trees := api.Group("/familytrees")
		{
			trees.POST("", h.CreateTree)
			trees.GET("", h.ListUserTrees)
			trees.GET("/:id", h.GetTree)
			trees.POST("/:id/import", h.ImportGEDCOM)
			trees.GET("/:id/export", h.ExportGEDCOM)
			trees.GET("/:id/persons", h.ListTreePersons)
			trees.GET("/:id/relationships", h.ListRelationshipsByTree)
		}

		// Person management
		persons := api.Group("/persons")
		{
			persons.POST("", h.AddPerson)
			persons.GET("/:id", h.GetPerson)
			persons.PUT("/:id", h.UpdatePerson)
			persons.DELETE("/:id", h.DeletePerson)

			// DNA integration
			persons.POST("/:id/dna", h.LinkDNATest)
			persons.GET("/:id/dna", h.GetDNATests)
		}

		// Relationship management
		api.POST("/relationships", h.CreateRelationship)
	}
}
