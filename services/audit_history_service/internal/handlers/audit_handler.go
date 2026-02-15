package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
	"github.com/chifamba/dzinza/services/audit_history_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type AuditHandler struct {
	svc service.Service
}

func NewAuditHandler(svc service.Service) *AuditHandler {
	return &AuditHandler{svc: svc}
}

func (h *AuditHandler) CreateAuditLog(c *gin.Context) {
	var req models.CreateAuditLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.LogAction(c.Request.Context(), req); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "audit log created"})
}

func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	var query models.AuditLogQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	logs, total, err := h.svc.GetAuditLogs(c.Request.Context(), query)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, logs, int64(query.Page), int64(query.Limit), total)
}
