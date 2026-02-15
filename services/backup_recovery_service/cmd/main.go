package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
)

func main() {
	logger := logging.NewLogger("backup_recovery_service")
	slog.SetDefault(logger)

	backupSvc := service.NewBackupService()

	// Start scheduled backup goroutine (daily at 2 AM)
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 2, 0, 0, 0, now.Location())
			time.Sleep(time.Until(next))

			slog.Info("running scheduled backup")
			if err := backupSvc.PerformBackup(context.Background()); err != nil {
				slog.Error("scheduled backup failed", slog.Any("error", err))
			}
		}
	}()

	r := gin.Default()

	// Health check
	r.GET("/health", health.HealthCheckHandler("backup_recovery_service"))

	api := r.Group("/api/v1/backup")
	{
		api.POST("/run", func(c *gin.Context) {
			if err := backupSvc.PerformBackup(c.Request.Context()); err != nil {
				response.Error(c, http.StatusInternalServerError, "Backup failed: "+err.Error())
				return
			}
			response.Success(c, gin.H{"message": "Backup completed successfully"})
		})

		api.POST("/restore", func(c *gin.Context) {
			var req struct {
				Timestamp string `json:"timestamp" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				response.Error(c, http.StatusBadRequest, err.Error())
				return
			}
			if err := backupSvc.RestoreBackup(c.Request.Context(), req.Timestamp); err != nil {
				response.Error(c, http.StatusInternalServerError, "Restore failed: "+err.Error())
				return
			}
			response.Success(c, gin.H{"message": "Restore completed successfully"})
		})

		api.GET("/list", func(c *gin.Context) {
			backups, err := backupSvc.ListBackups(c.Request.Context())
			if err != nil {
				response.Error(c, http.StatusInternalServerError, "Failed to list backups")
				return
			}
			response.Success(c, backups)
		})
	}

	port := os.Getenv("BACKUP_SERVICE_PORT")
	if port == "" {
		port = "8020"
	}

	addr := fmt.Sprintf(":%s", port)
	logger.Info("Starting backup_recovery_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
