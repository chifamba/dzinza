package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/handlers"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/repository"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := logging.NewLogger("genealogy_service")

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

	// Neo4j connection
	driver, err := neo4j.NewDriverWithContext(cfg.Neo4jURI, neo4j.BasicAuth(cfg.Neo4jUser, cfg.Neo4jPassword, ""))
	if err != nil {
		logger.Error("failed to create neo4j driver", slog.Any("error", err))
		os.Exit(1)
	}
	defer driver.Close(context.Background())

	// Verify connectivity
	if err := driver.VerifyConnectivity(context.Background()); err != nil {
		logger.Error("failed to verify neo4j connectivity", slog.Any("error", err))
		// We might not want to exit here if we expect neo4j to be up later, 
		// but for a microservice it's usually better to fail fast.
		os.Exit(1)
	}

	// Initialize layers
	repo := repository.NewNeo4jRepository(driver)
	svc := service.NewGenealogyService(repo, eventBus)
	dnaSvc := service.NewDNAService(repo)
	handler := handlers.NewGenealogyHandler(svc, dnaSvc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("genealogy_service"))

	handlers.RegisterRoutes(r, handler, cfg.JWTSecret)

	port := cfg.GenealogyServicePort
	if port == 0 {
		port = 8006 // Default as per spec
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting genealogy_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
