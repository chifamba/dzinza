package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/handlers"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/repository"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := logging.NewLogger("trust_access_control_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	// Initialize Neo4j
	neo4jDriver, err := neo4j.NewDriverWithContext(
		cfg.Neo4jURI,
		neo4j.BasicAuth(cfg.Neo4jUser, cfg.Neo4jPassword, ""),
	)
	if err != nil {
		logger.Error("Failed to create neo4j driver", "error", err)
		os.Exit(1)
	}
	defer neo4jDriver.Close(context.Background())

	// Initialize Redis and Event Bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Setup layers
	trustRepo := repository.NewTrustRepository(neo4jDriver, redisClient)
	trustSvc := service.NewTrustService(trustRepo)
	
	// Start trust worker
	worker := service.NewTrustWorker(eventBus, trustSvc)
	if err := worker.Start(context.Background()); err != nil {
		logger.Error("Failed to start trust worker", "error", err)
	}

	trustHandler := handlers.NewTrustHandler(trustSvc)

	r := gin.Default()
	
	// Health check
	r.GET("/health", health.HealthCheckHandler("trust_access_control_service"))

	api := r.Group("/api/v1/trust")
	{
		api.GET("/scores/:user_id", trustHandler.GetScore)
		api.POST("/recalculate/:user_id", trustHandler.RecalculateScore)
	}

	port := cfg.TrustServicePort
	if port == 0 {
		port = 8013
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("Starting trust_access_control_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
