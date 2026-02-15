package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/analytics_service/internal/handlers"
	"github.com/chifamba/dzinza/services/analytics_service/internal/models"
	"github.com/chifamba/dzinza/services/analytics_service/internal/repository"
	"github.com/chifamba/dzinza/services/analytics_service/internal/service"
	"github.com/chifamba/dzinza/services/analytics_service/internal/worker"
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
	logger := logging.NewLogger("analytics_service")
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
	db.AutoMigrate(&models.PlatformMetrics{}, &models.EventMetric{})

	// Redis connection for event bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Initialize layers
	repo := repository.NewPostgresRepository(db)
	svc := service.NewAnalyticsService(repo)
	handler := handlers.NewAnalyticsHandler(svc)
	
	// Start worker in background
	analyticsWorker := worker.NewAnalyticsWorker(svc, eventBus)
	go analyticsWorker.Start(context.Background())

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("analytics_service"))

	api := r.Group("/api/v1/analytics")
	{
		api.GET("/platform", handler.GetPlatformStats)
		api.GET("/events", handler.GetEventStats)
	}

	port := 8001 // Default for analytics_service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting analytics_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
