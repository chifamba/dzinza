package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type IntegrationHandler struct {
	svc service.IntegrationService
}

func NewIntegrationHandler(svc service.IntegrationService) *IntegrationHandler {
	return &IntegrationHandler{svc: svc}
}

func (h *IntegrationHandler) Sync(c *gin.Context) {
	provider := c.Param("provider")
	if err := h.svc.SyncExternalData(c.Request.Context(), provider); err != nil {
		response.Error(c, http.StatusInternalServerError, "Sync failed")
		return
	}
	response.Success(c, gin.H{"status": "Sync initiated"})
}
