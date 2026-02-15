package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/localization_service/internal/handlers"
	"github.com/chifamba/dzinza/services/localization_service/internal/models"
	"github.com/chifamba/dzinza/services/localization_service/internal/repository"
	"github.com/chifamba/dzinza/services/localization_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("localization_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// PostgreSQL connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), cfg.DBPassword, os.Getenv("DB_NAME"), os.Getenv("DB_PORT"))
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Auto-migrate
	db.AutoMigrate(&models.Translation{}, &models.CulturalNamePattern{})

	// Initialize layers
	repo := repository.NewPostgresRepository(db)
	svc := service.NewLocalizationService(repo)
	handler := handlers.NewLocalizationHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("localization_service"))

	api := r.Group("/api/v1/localization")
	{
		api.GET("/translations/:locale", handler.GetTranslations)
		api.POST("/parse-name", handler.ParseName)
	}

	port := 8008 // Default for localization_service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting localization_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
