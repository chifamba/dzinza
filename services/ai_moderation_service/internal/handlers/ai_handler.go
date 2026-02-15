package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	svc service.AIService
}

func NewAIHandler(svc service.AIService) *AIHandler {
	return &AIHandler{svc: svc}
}

func (h *AIHandler) Moderate(c *gin.Context) {
	var req models.ModerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.svc.ModerateContent(c.Request.Context(), req.Content, req.ContentType)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "AI moderation failed")
		return
	}

	response.Success(c, result)
}
