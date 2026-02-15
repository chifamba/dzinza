package handlers

import (
	"net/http"
	"strconv"

	"github.com/chifamba/dzinza/services/analytics_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	svc service.AnalyticsService
}

func NewAnalyticsHandler(svc service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{svc: svc}
}

func (h *AnalyticsHandler) GetPlatformStats(c *gin.Context) {
	stats, err := h.svc.GetPlatformStats(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch platform stats")
		return
	}
	response.Success(c, stats)
}

func (h *AnalyticsHandler) GetEventStats(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	days, _ := strconv.Atoi(daysStr)

	stats, err := h.svc.GetEventStats(c.Request.Context(), days)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch event stats")
		return
	}
	response.Success(c, stats)
}
