package handlers

import (
	"log/slog"
	"net/http"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/models"
	"github.com/chifamba/dzinza/services/deduplication_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type DeduplicationHandler struct {
	dedupSvc service.DeduplicationService
}

func NewDeduplicationHandler(dedupSvc service.DeduplicationService) *DeduplicationHandler {
	return &DeduplicationHandler{
		dedupSvc: dedupSvc,
	}
}

func (h *DeduplicationHandler) Detect(c *gin.Context) {
	pairs, err := h.dedupSvc.DetectDuplicates(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to detect duplicates")
		return
	}

	response.Success(c, pairs)
}

func (h *DeduplicationHandler) Merge(c *gin.Context) {
	var req models.MergeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.dedupSvc.Merge(c.Request.Context(), req.SurvivingID, req.MergedID); err != nil {
		slog.Error("Merge failed", "error", err, "surviving_id", req.SurvivingID, "merged_id", req.MergedID)
		response.Error(c, http.StatusInternalServerError, "Merge failed")
		return
	}

	response.Success(c, gin.H{"message": "Merge successful"})
}
