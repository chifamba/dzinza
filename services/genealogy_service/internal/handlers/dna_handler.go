package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *GenealogyHandler) LinkDNATest(c *gin.Context) {
	personIDStr := c.Param("id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person id")
		return
	}

	var req models.LinkDNATestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	test := &models.DNATest{
		Provider:     req.Provider,
		TestType:     req.TestType,
		KitID:        req.KitID,
		ResultURL:    req.ResultURL,
		RawDataS3Key: req.RawDataS3Key,
	}

	if err := h.dnaSvc.LinkDNATest(c.Request.Context(), personID, test); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, test)
}

func (h *GenealogyHandler) GetDNATests(c *gin.Context) {
	personIDStr := c.Param("id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person id")
		return
	}

	tests, err := h.dnaSvc.GetDNATests(c.Request.Context(), personID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, tests)
}

func (h *GenealogyHandler) SyncDNATest(c *gin.Context) {
	testIDStr := c.Param("id")
	testID, err := uuid.Parse(testIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid test id")
		return
	}

	if err := h.dnaSvc.SyncWithProvider(c.Request.Context(), testID); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "DNA test synced successfully"})
}
