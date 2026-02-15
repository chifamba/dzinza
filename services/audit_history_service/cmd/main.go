package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/handlers"
	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
	"github.com/chifamba/dzinza/services/audit_history_service/internal/repository"
	"github.com/chifamba/dzinza/services/audit_history_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("audit_history_service")

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// Database connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Error("failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Auto Migrate
	if err := db.AutoMigrate(&models.AuditLog{}); err != nil {
		logger.Error("failed to migrate database", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize layers
	repo := repository.NewPostgresRepository(db)
	svc := service.NewAuditService(repo)
	handler := handlers.NewAuditHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("audit_history_service"))

	handlers.RegisterRoutes(r, handler, cfg.JWTSecret)

	port := cfg.AuditHistoryServicePort
	if port == 0 {
		port = 8002 // Default as per spec
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting audit_history_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
