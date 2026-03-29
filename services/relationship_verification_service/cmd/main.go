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
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/handlers"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/repository"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("relationship_verification_service")
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
	if err := db.AutoMigrate(&models.Suggestion{}); err != nil {
		logger.Error("Failed to migrate database", "error", err)
		os.Exit(1)
	}

	// Initialize Neo4j
	driver, err := neo4j.NewDriverWithContext(
		cfg.Neo4jURI,
		neo4j.BasicAuth(cfg.Neo4jUser, cfg.Neo4jPassword, ""),
	)
	if err != nil {
		logger.Error("Failed to create Neo4j driver", "error", err)
		os.Exit(1)
	}
	defer driver.Close(context.Background())

	// Initialize Redis and Event Bus
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
	})
	eventBus := events.NewRedisBus(redisClient)

	// Setup layers
	pgRepo := repository.NewPostgresRepository(db)
	neo4jRepo := repository.NewNeo4jRepository(driver)
	compositeRepo := repository.NewCompositeRepository(pgRepo, neo4jRepo)

	verifySvc := service.NewVerificationService(compositeRepo, eventBus)
	verifyHandler := handlers.NewVerificationHandler(verifySvc)

	r := gin.Default()
	
	// Health check
	r.GET("/health", health.HealthCheckHandler("relationship_verification_service"))

	api := r.Group("/api/v1/verification")
	{
		api.POST("/propose", verifyHandler.Propose)
		api.POST("/verify/:id", verifyHandler.Verify)
		api.GET("/pending", verifyHandler.ListPending)
	}

	port := cfg.RelationshipVerificationServicePort
	if port == 0 {
		port = 8011
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("Starting relationship_verification_service", "addr", addr)
	if err := r.Run(addr); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
