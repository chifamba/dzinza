package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

type BackupHandler struct {
	svc service.BackupService
}

func NewBackupHandler(svc service.BackupService) *BackupHandler {
	return &BackupHandler{svc: svc}
}

func (h *BackupHandler) TriggerBackup(c *gin.Context) {
	if err := h.svc.PerformBackup(c.Request.Context()); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, gin.H{"status": "backup completed"})
}
