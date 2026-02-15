package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/handlers"
	"github.com/chifamba/dzinza/services/deduplication_service/internal/repository"
	"github.com/chifamba/dzinza/services/deduplication_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	logger := logging.NewLogger("deduplication_service")
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

	// Setup layers
	repo := repository.NewNeo4jRepository(neo4jDriver)
	dedupSvc := service.NewDeduplicationService(repo)
	dedupHandler := handlers.NewDeduplicationHandler(dedupSvc)

	r := gin.Default()
	
	// Health check
	r.GET("/health", health.HealthCheckHandler("deduplication_service"))

	api := r.Group("/api/v1/deduplication")
	{
		api.GET("/detect", dedupHandler.Detect)
		api.POST("/merge", dedupHandler.Merge)
	}

	port := cfg.DeduplicationServicePort
	if port == 0 {
		port = 8005
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("Starting deduplication_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
