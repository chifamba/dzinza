package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/service"
	"github.com/gin-gonic/gin"
)

type TrustHandler struct {
	trustSvc service.TrustService
}

func NewTrustHandler(trustSvc service.TrustService) *TrustHandler {
	return &TrustHandler{
		trustSvc: trustSvc,
	}
}

func (h *TrustHandler) GetScore(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		response.Error(c, http.StatusBadRequest, "User ID is required")
		return
	}

	score, err := h.trustSvc.GetScore(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get trust score")
		return
	}

	if score == nil {
		response.Error(c, http.StatusNotFound, "Trust score not found")
		return
	}

	response.Success(c, score)
}

func (h *TrustHandler) RecalculateScore(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		response.Error(c, http.StatusBadRequest, "User ID is required")
		return
	}

	if err := h.trustSvc.CalculateAndStoreScore(c.Request.Context(), userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to recalculate trust score")
		return
	}

	response.Success(c, gin.H{"message": "Trust score recalculated"})
}
