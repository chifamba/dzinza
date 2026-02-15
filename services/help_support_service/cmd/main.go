package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/help_support_service/internal/handlers"
	"github.com/chifamba/dzinza/services/help_support_service/internal/repository"
	"github.com/chifamba/dzinza/services/help_support_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	logger := logging.NewLogger("help_support_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// MongoDB connection
	mongoURI := cfg.MongoDBURI
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		logger.Error("failed to connect to mongodb", slog.Any("error", err))
		os.Exit(1)
	}
	defer client.Disconnect(context.Background())

	db := client.Database("dzinza_help")

	// Initialize layers
	repo := repository.NewMongoDBRepository(db)
	svc := service.NewHelpService(repo)
	handler := handlers.NewHelpHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("help_support_service"))

	authMiddleware := auth.AuthMiddleware(cfg.JWTSecret)

	api := r.Group("/api/v1/help")
	{
		protected := api.Group("")
		protected.Use(authMiddleware)
		{
			protected.POST("/tickets", handler.CreateTicket)
			protected.GET("/tickets", handler.ListMyTickets)
			protected.GET("/tickets/:id", handler.GetTicket)
			protected.POST("/tickets/:id/reply", handler.Reply)
		}
	}

	port := 8014 // Default for help_support_service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting help_support_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
