package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/handlers"
	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
)

func main() {
	logger := logging.NewLogger("backup_recovery_service")
	slog.SetDefault(logger)

	backupSvc := service.NewBackupService()
	backupHandler := handlers.NewBackupHandler(backupSvc)

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
		api.POST("/run", backupHandler.RunBackup)
		api.POST("/restore", backupHandler.RestoreBackup)
		api.GET("/list", backupHandler.ListBackups)
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
