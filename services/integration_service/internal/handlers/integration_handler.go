package handlers

import (
	"io"
	"net/http"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

// IntegrationHandler handles HTTP requests for the integration service.
type IntegrationHandler struct {
	svc service.IntegrationService
}

// NewIntegrationHandler creates a new integration handler.
func NewIntegrationHandler(svc service.IntegrationService) *IntegrationHandler {
	return &IntegrationHandler{svc: svc}
}

// Sync triggers a data sync for a given provider.
func (h *IntegrationHandler) Sync(c *gin.Context) {
	var req struct {
		Provider string            `json:"provider" binding:"required"`
		Config   map[string]string `json:"config"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.svc.SyncExternalData(c.Request.Context(), req.Provider, req.Config)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, result)
}

// ListProviders returns all registered external providers.
func (h *IntegrationHandler) ListProviders(c *gin.Context) {
	providers := h.svc.ListProviders(c.Request.Context())
	response.Success(c, providers)
}

// Webhook handles incoming webhook calls from external providers.
func (h *IntegrationHandler) Webhook(c *gin.Context) {
	provider := c.Param("provider")

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to read webhook payload")
		return
	}

	if err := h.svc.HandleWebhook(c.Request.Context(), provider, body); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Webhook processed"})
}
