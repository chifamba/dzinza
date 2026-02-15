package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/help_support_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type HelpHandler struct {
	svc service.HelpService
}

func NewHelpHandler(svc service.HelpService) *HelpHandler {
	return &HelpHandler{svc: svc}
}

func (h *HelpHandler) CreateTicket(c *gin.Context) {
	var req struct {
		Subject     string `json:"subject" binding:"required"`
		Description string `json:"description" binding:"required"`
		Category    string `json:"category" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	claims, _ := c.Get("user")
	userClaims := claims.(*auth.Claims)

	ticket, err := h.svc.CreateTicket(c.Request.Context(), userClaims.UserID, req.Subject, req.Description, req.Category)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create ticket")
		return
	}
	response.Created(c, ticket)
}

func (h *HelpHandler) ListMyTickets(c *gin.Context) {
	claims, _ := c.Get("user")
	userClaims := claims.(*auth.Claims)

	tickets, err := h.svc.ListUserTickets(c.Request.Context(), userClaims.UserID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list tickets")
		return
	}
	response.Success(c, tickets)
}

func (h *HelpHandler) GetTicket(c *gin.Context) {
	id := c.Param("id")
	ticket, err := h.svc.GetTicket(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Ticket not found")
		return
	}
	response.Success(c, ticket)
}

func (h *HelpHandler) Reply(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	claims, _ := c.Get("user")
	userClaims := claims.(*auth.Claims)

	if err := h.svc.ReplyToTicket(c.Request.Context(), id, userClaims.UserID, req.Content); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to add reply")
		return
	}
	response.Success(c, gin.H{"message": "Reply added"})
}
