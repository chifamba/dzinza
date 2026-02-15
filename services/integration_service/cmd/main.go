package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/integration_service/internal/handlers"
	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
)

func main() {
	logger := logging.NewLogger("integration_service")
	slog.SetDefault(logger)

	svc := service.NewIntegrationService()
	handler := handlers.NewIntegrationHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("integration_service"))

	api := r.Group("/api/v1/integration")
	{
		api.POST("/sync", handler.Sync)
		api.GET("/providers", handler.ListProviders)
		api.POST("/webhook/:provider", handler.Webhook)
	}

	port := 8017 // Assigning 8017 for integration service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting integration_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
