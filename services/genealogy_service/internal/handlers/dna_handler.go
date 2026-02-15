package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DNAHandler struct {
	svc service.DNAService
}

func NewDNAHandler(svc service.DNAService) *DNAHandler {
	return &DNAHandler{svc: svc}
}

func (h *DNAHandler) LinkDNATest(c *gin.Context) {
	personID, err := uuid.Parse(c.Param("person_id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person ID")
		return
	}

	var req models.DNATest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.LinkDNATest(c.Request.Context(), personID, &req); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *DNAHandler) GetDNATests(c *gin.Context) {
	personID, err := uuid.Parse(c.Param("person_id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person ID")
		return
	}

	tests, err := h.svc.GetDNATests(c.Request.Context(), personID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, tests)
}

func (h *DNAHandler) SyncWithProvider(c *gin.Context) {
	testID, err := uuid.Parse(c.Param("test_id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid test ID")
		return
	}

	if err := h.svc.SyncWithProvider(c.Request.Context(), testID); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "sync initiated"})
}
