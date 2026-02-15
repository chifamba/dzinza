package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/handlers"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/repository"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/service"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := logging.NewLogger("search_discovery_service")
	slog.SetDefault(logger)

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	// Initialize Elasticsearch
	esClient, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{cfg.ElasticsearchURL},
	})
	if err != nil {
		logger.Error("Failed to create elasticsearch client", "error", err)
		os.Exit(1)
	}

	// Initialize Redis for event bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Initialize Neo4j for sync fetching
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
	searchRepo := repository.NewElasticsearchRepository(esClient, "persons")
	neo4jRepo := repository.NewNeo4jRepository(neo4jDriver)
	
	searchSvc := service.NewSearchService(searchRepo)
	syncWorker := service.NewSyncWorker(eventBus, searchSvc, neo4jRepo)

	// Start sync worker
	ctx := context.Background()
	if err := syncWorker.Start(ctx); err != nil {
		logger.Error("Failed to start sync worker", "error", err)
	}

	// Wait for Elasticsearch to be ready and initialize index
	go func() {
		time.Sleep(10 * time.Second) // Give ES time to start
		if err := searchSvc.InitializeIndex(ctx); err != nil {
			logger.Error("Failed to auto-initialize index", "error", err)
		}
	}()

	// Setup HTTP server
	r := gin.Default()
	
	// Health check
	r.GET("/health", health.HealthCheckHandler("search_discovery_service"))

	searchHandler := handlers.NewSearchHandler(searchSvc)
	
	api := r.Group("/api/v1/search")
	{
		api.GET("/persons", searchHandler.Search)
		api.POST("/initialize", searchHandler.Initialize)
	}

	port := cfg.SearchServicePort
	if port == 0 {
		port = 8012
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("Starting search_discovery_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
