package handlers

import (
	"net/http"

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
	var req models.FlaggedContent
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.modSvc.FlagContent(c.Request.Context(), &req); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to flag content")
		return
	}

	response.Created(c, gin.H{"message": "Content flagged"})
}

func (h *ModerationHandler) Ban(c *gin.Context) {
	var req models.UserBan
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.modSvc.BanUser(c.Request.Context(), &req); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to ban user")
		return
	}

	response.Success(c, gin.H{"message": "User banned"})
}

func (h *ModerationHandler) ListFlagged(c *gin.Context) {
	items, err := h.modSvc.ListFlaggedContent(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list flagged content")
		return
	}

	response.Success(c, items)
}
