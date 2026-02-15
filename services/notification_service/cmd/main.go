package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/notification_service/internal/handlers"
	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/chifamba/dzinza/services/notification_service/internal/repository"
	"github.com/chifamba/dzinza/services/notification_service/internal/service"
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
	logger := logging.NewLogger("notification_service")

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// Redis connection for event bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Database connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Auto Migrate
	if err := db.AutoMigrate(&models.Notification{}); err != nil {
		logger.Error("failed to migrate database", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize layers
	emailSender := service.NewSMTPEmailSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, "noreply@dzinza.org")
	repo := repository.NewPostgresRepository(db)
	svc := service.NewNotificationService(repo, emailSender)

	// Start notification worker
	worker := service.NewNotificationWorker(eventBus, svc)
	go func() {
		if err := worker.Start(context.Background()); err != nil {
			logger.Error("failed to start notification worker", slog.Any("error", err))
		}
	}()

	handler := handlers.NewNotificationHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("notification_service"))

	handlers.RegisterRoutes(r, handler, cfg.JWTSecret)

	port := cfg.NotificationServicePort
	if port == 0 {
		port = 8010 // Default as per spec
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting notification_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
