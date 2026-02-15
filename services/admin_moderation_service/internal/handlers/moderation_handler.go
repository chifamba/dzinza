package handlers

import (
	"net/http"
	"time"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type ModerationHandler struct {
	modSvc service.ModerationService
}

func NewModerationHandler(modSvc service.ModerationService) *ModerationHandler {
	return &ModerationHandler{
		modSvc: modSvc,
	}
}

func (h *ModerationHandler) Flag(c *gin.Context) {
	var req struct {
		ContentType string `json:"content_type" binding:"required"`
		ContentID   string `json:"content_id" binding:"required"`
		Content     string `json:"content" binding:"required"`
		Reason      string `json:"reason" binding:"required"`
		ReporterID  string `json:"reporter_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	flagged, err := h.modSvc.FlagContent(c.Request.Context(),
		req.ContentType, req.ContentID, req.Content, req.Reason, req.ReporterID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to flag content")
		return
	}

	response.Created(c, flagged)
}

func (h *ModerationHandler) Ban(c *gin.Context) {
	var req struct {
		UserID    string     `json:"user_id" binding:"required"`
		BannedBy  string     `json:"banned_by" binding:"required"`
		Reason    string     `json:"reason" binding:"required"`
		ExpiresAt *time.Time `json:"expires_at,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.modSvc.BanUser(c.Request.Context(), req.UserID, req.BannedBy, req.Reason, req.ExpiresAt); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to ban user")
		return
	}

	response.Success(c, gin.H{"message": "User banned"})
}

func (h *ModerationHandler) ListFlagged(c *gin.Context) {
	items, err := h.modSvc.ListFlagged(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list flagged content")
		return
	}

	response.Success(c, items)
}

func (h *ModerationHandler) Review(c *gin.Context) {
	flagID := c.Param("id")
	var req models.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.modSvc.ReviewFlaggedContent(c.Request.Context(), flagID, req.ReviewerID, req.Action, req.Note); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to review content")
		return
	}

	response.Success(c, gin.H{"message": "Review recorded"})
}

func (h *ModerationHandler) ReviewQueue(c *gin.Context) {
	items, err := h.modSvc.ListReviewQueue(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list review queue")
		return
	}

	response.Success(c, items)
}
