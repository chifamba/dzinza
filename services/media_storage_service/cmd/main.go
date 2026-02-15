package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/handlers"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/repository"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/service"
	pkgconfig "github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	logger := logging.NewLogger("media_storage_service")

	cfg, err := pkgconfig.LoadConfig(".")
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
	if err := db.AutoMigrate(&models.Media{}); err != nil {
		logger.Error("failed to migrate database", slog.Any("error", err))
		os.Exit(1)
	}

	// S3 / Garage configuration
	awsRegion := os.Getenv("AWS_REGION")
	if awsRegion == "" {
		awsRegion = "us-east-1"
	}
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	if s3Endpoint == "" {
		s3Endpoint = "http://garage1:39000" // Default to first node in cluster
	}
	s3Bucket := os.Getenv("S3_BUCKET")
	if s3Bucket == "" {
		s3Bucket = "dzinza-media"
	}

	accessKey := cfg.AWSAccessKeyID
	secretKey := cfg.AWSSecretAccessKey

	// Load AWS config with custom resolver for Garage
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               s3Endpoint,
			SigningRegion:     awsRegion,
			HostnameImmutable: true,
		}, nil
	})

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(awsRegion),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		logger.Error("failed to load aws config", slog.Any("error", err))
		os.Exit(1)
	}

	s3Client := s3.NewFromConfig(awsCfg)

	// Initialize layers
	metaRepo := repository.NewPostgresRepository(db)
	storageRepo := repository.NewS3Repository(s3Client, s3Bucket)
	cdnBaseURL := os.Getenv("CDN_BASE_URL")
	svc := service.NewMediaService(metaRepo, storageRepo, cdnBaseURL)
	handler := handlers.NewMediaHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("media_storage_service"))

	handlers.RegisterRoutes(r, handler, cfg.JWTSecret)

	port := cfg.MediaServicePort
	if port == 0 {
		port = 8009 // Default as per spec
	}

	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting media_storage_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
