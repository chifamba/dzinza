package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/handlers"
	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
)

func main() {
	logger := logging.NewLogger("ai_moderation_service")
	slog.SetDefault(logger)

	_, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize layers
	svc := service.NewAIService()
	handler := handlers.NewAIHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("ai_moderation_service"))

	api := r.Group("/api/v1/ai")
	{
		api.POST("/moderate", handler.Moderate)
	}

	port := 8015 // Assigning 8015 for AI moderation
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting ai_moderation_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
