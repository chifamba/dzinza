package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/localization_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type LocalizationHandler struct {
	svc service.LocalizationService
}

func NewLocalizationHandler(svc service.LocalizationService) *LocalizationHandler {
	return &LocalizationHandler{svc: svc}
}

func (h *LocalizationHandler) GetTranslations(c *gin.Context) {
	locale := c.Param("locale")
	translations, err := h.svc.GetTranslations(c.Request.Context(), locale)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch translations")
		return
	}
	response.Success(c, translations)
}

func (h *LocalizationHandler) ParseName(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		CultureCode string `json:"culture_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.svc.ParseCulturalName(c.Request.Context(), req.Name, req.CultureCode)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to parse name")
		return
	}
	response.Success(c, result)
}
