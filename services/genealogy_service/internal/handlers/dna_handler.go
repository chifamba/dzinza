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
	dnaSvc service.DNAService
}

func NewDNAHandler(dnaSvc service.DNAService) *DNAHandler {
	return &DNAHandler{dnaSvc: dnaSvc}
}

func (h *DNAHandler) LinkDNATest(c *gin.Context) {
	personIDStr := c.Param("person_id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person ID format")
		return
	}

	var req models.DNATest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.dnaSvc.LinkDNATest(c.Request.Context(), personID, &req); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, req)
}

func (h *DNAHandler) GetDNATests(c *gin.Context) {
	personIDStr := c.Param("person_id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person ID format")
		return
	}

	tests, err := h.dnaSvc.GetDNATests(c.Request.Context(), personID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, tests)
}

func (h *DNAHandler) SyncDNATest(c *gin.Context) {
	testIDStr := c.Param("test_id")
	testID, err := uuid.Parse(testIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid test ID format")
		return
	}

	if err := h.dnaSvc.SyncWithProvider(c.Request.Context(), testID); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "DNA test synchronized successfully"})
}
