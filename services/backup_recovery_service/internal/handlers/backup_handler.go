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

func (h *BackupHandler) RunBackup(c *gin.Context) {
	if err := h.svc.PerformBackup(c.Request.Context()); err != nil {
		response.Error(c, http.StatusInternalServerError, "Backup failed: "+err.Error())
		return
	}
	response.Success(c, gin.H{"message": "Backup completed successfully"})
}

func (h *BackupHandler) RestoreBackup(c *gin.Context) {
	var req struct {
		Timestamp string `json:"timestamp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.svc.RestoreBackup(c.Request.Context(), req.Timestamp); err != nil {
		response.Error(c, http.StatusInternalServerError, "Restore failed: "+err.Error())
		return
	}
	response.Success(c, gin.H{"message": "Restore completed successfully"})
}

func (h *BackupHandler) ListBackups(c *gin.Context) {
	backups, err := h.svc.ListBackups(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list backups")
		return
	}
	response.Success(c, backups)
}
