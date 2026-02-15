package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/handlers"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/repository"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("admin_moderation_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	// Initialize PostgreSQL
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}

	// Auto-migrate
	db.AutoMigrate(&models.FlaggedContent{}, &models.UserBan{})

	// Initialize Redis for event bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Setup layers
	repo := repository.NewPostgresRepository(db)
	modSvc := service.NewModerationService(repo, eventBus)
	modHandler := handlers.NewModerationHandler(modSvc)

	r := gin.Default()
	
	// Health check
	r.GET("/health", health.HealthCheckHandler("admin_moderation_service"))

	api := r.Group("/api/v1/moderation")
	{
		api.POST("/flag", modHandler.Flag)
		api.POST("/ban", modHandler.Ban)
		api.GET("/flagged", modHandler.ListFlagged)
		api.POST("/review/:id", modHandler.Review)
		api.GET("/queue", modHandler.ReviewQueue)
	}

	port := cfg.AdminModerationServicePort
	if port == 0 {
		port = 8000
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("Starting admin_moderation_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
