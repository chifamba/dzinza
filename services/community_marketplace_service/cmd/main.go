package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/handlers"
	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/models"
	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/repository"
	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("community_marketplace_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// PostgreSQL connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Auto-migrate
	db.AutoMigrate(&models.Listing{})

	// Initialize layers
	repo := repository.NewPostgresRepository(db)
	svc := service.NewMarketplaceService(repo)
	handler := handlers.NewMarketplaceHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("community_marketplace_service"))

	authMiddleware := auth.AuthMiddleware(cfg.JWTSecret)

	api := r.Group("/api/v1/marketplace")
	{
		api.GET("/listings", handler.ListListings)
		api.GET("/listings/:id", handler.GetListing)
		
		protected := api.Group("")
		protected.Use(authMiddleware)
		{
			protected.POST("/listings", handler.CreateListing)
		}
	}

	port := 8004 // Default for community_marketplace_service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting community_marketplace_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
