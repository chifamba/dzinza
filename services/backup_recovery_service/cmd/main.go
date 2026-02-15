package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
)

func main() {
	logger := logging.NewLogger("backup_recovery_service")
	slog.SetDefault(logger)

	svc := service.NewBackupService()
	svc.ScheduleBackup(context.Background())

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("backup_recovery_service"))

	port := 8016 // Assigning 8016 for backup service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting backup_recovery_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
