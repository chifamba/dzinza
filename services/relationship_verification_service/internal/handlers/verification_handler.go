package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/service"
	"github.com/gin-gonic/gin"
)

type VerificationHandler struct {
	verifySvc service.VerificationService
}

func NewVerificationHandler(verifySvc service.VerificationService) *VerificationHandler {
	return &VerificationHandler{
		verifySvc: verifySvc,
	}
}

func (h *VerificationHandler) Propose(c *gin.Context) {
	var req struct {
		ProposerID string `json:"proposer_id" binding:"required"`
		TargetID   string `json:"target_id" binding:"required"`
		Type       string `json:"type" binding:"required"`
		Payload    string `json:"payload" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	suggestion, err := h.verifySvc.ProposeChange(c.Request.Context(), req.ProposerID, req.TargetID, req.Type, req.Payload)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create suggestion")
		return
	}

	response.Created(c, suggestion)
}

func (h *VerificationHandler) Verify(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		VerifierID string `json:"verifier_id" binding:"required"`
		Action     string `json:"action" binding:"required"`
		Comment    string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.verifySvc.VerifySuggestion(c.Request.Context(), req.VerifierID, id, req.Action, req.Comment); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to verify suggestion")
		return
	}

	response.Success(c, gin.H{"message": "Verification recorded"})
}

func (h *VerificationHandler) ListPending(c *gin.Context) {
	suggestions, err := h.verifySvc.ListPending(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list pending suggestions")
		return
	}

	response.Success(c, suggestions)
}
