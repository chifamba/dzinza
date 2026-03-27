package service

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// BackupService defines the interface for backup and recovery operations.
type BackupService interface {
	PerformBackup(ctx context.Context) error
	RestoreBackup(ctx context.Context, backupTimestamp string) error
	ListBackups(ctx context.Context) ([]BackupInfo, error)
}

// BackupInfo holds metadata about a backup.
type BackupInfo struct {
	Timestamp string `json:"timestamp"`
	Database  string `json:"database"`
	Size      int64  `json:"size_bytes"`
	Status    string `json:"status"` // COMPLETED, FAILED
}

type backupService struct {
	s3Client   *s3.Client
	bucketName string
	backupDir  string
}

// NewBackupService creates a backup service with S3-compatible storage.
func NewBackupService() BackupService {
	bs := &backupService{
		backupDir:  getEnvOrDefault("BACKUP_DIR", "/tmp/backups"),
		bucketName: getEnvOrDefault("S3_BUCKET_NAME", "dzinza-backups"),
	}

	// Initialize S3 client (Garage-compatible)
	s3Endpoint := getEnvOrDefault("S3_ENDPOINT", "http://garage:3900")
	s3Region := getEnvOrDefault("S3_REGION", "garage")
	s3AccessKey := getEnvOrDefault("AWS_ACCESS_KEY_ID", "")
	s3SecretKey := getEnvOrDefault("AWS_SECRET_ACCESS_KEY", "")

	if s3AccessKey != "" && s3SecretKey != "" {
		cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
			awsconfig.WithRegion(s3Region),
			awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				s3AccessKey, s3SecretKey, "",
			)),
		)
		if err != nil {
			slog.Error("failed to configure S3 client", slog.Any("error", err))
		} else {
			bs.s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(s3Endpoint)
				o.UsePathStyle = true
			})
		}
	}

	// Ensure backup directory exists
	os.MkdirAll(bs.backupDir, 0755)

	return bs
}

// PerformBackup executes database dumps and uploads to S3.
func (s *backupService) PerformBackup(ctx context.Context) error {
	timestamp := time.Now().Format("20060102_150405")
	backupSubDir := filepath.Join(s.backupDir, timestamp)
	if err := os.MkdirAll(backupSubDir, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
	}

	slog.Info("starting backup", slog.String("timestamp", timestamp))

	// 1. PostgreSQL backup
	if err := s.backupPostgres(ctx, backupSubDir, timestamp); err != nil {
		slog.Error("PostgreSQL backup failed", slog.Any("error", err))
		// Continue with other backups
	}

	// 2. Neo4j backup
	if err := s.backupNeo4j(ctx, backupSubDir, timestamp); err != nil {
		slog.Error("Neo4j backup failed", slog.Any("error", err))
	}

	// 3. MongoDB backup
	if err := s.backupMongoDB(ctx, backupSubDir, timestamp); err != nil {
		slog.Error("MongoDB backup failed", slog.Any("error", err))
	}

	// 4. Upload to S3
	if s.s3Client != nil {
		if err := s.uploadToS3(ctx, backupSubDir, timestamp); err != nil {
			slog.Error("S3 upload failed", slog.Any("error", err))
			return fmt.Errorf("backup created but S3 upload failed: %w", err)
		}
	} else {
		slog.Warn("S3 client not configured, backup stored locally only")
	}

	slog.Info("backup completed successfully", slog.String("timestamp", timestamp))
	return nil
}

func (s *backupService) backupPostgres(ctx context.Context, dir, timestamp string) error {
	pgHost := getEnvOrDefault("POSTGRES_HOST", "postgres")
	pgUser := getEnvOrDefault("POSTGRES_USER", "dzinza")
	pgPassword := getEnvOrDefault("POSTGRES_PASSWORD", "")
	pgDBs := []string{"auth_db", "verification_db", "moderation_db", "localization_db"}

	for _, db := range pgDBs {
		outFile := filepath.Join(dir, fmt.Sprintf("%s_%s.sql.gz", db, timestamp))
		cmd := exec.CommandContext(ctx, "sh", "-c",
			fmt.Sprintf("PGPASSWORD='%s' pg_dump -h %s -U %s %s | gzip > %s",
				pgPassword, pgHost, pgUser, db, outFile))

		output, err := cmd.CombinedOutput()
		if err != nil {
			slog.Error("pg_dump failed",
				slog.String("database", db),
				slog.String("output", string(output)),
				slog.Any("error", err))
			return fmt.Errorf("pg_dump for %s failed: %w", db, err)
		}
		slog.Info("PostgreSQL backup complete", slog.String("database", db), slog.String("file", outFile))
	}
	return nil
}

func (s *backupService) backupNeo4j(ctx context.Context, dir, timestamp string) error {
	neo4jHost := getEnvOrDefault("NEO4J_HOST", "neo4j")
	outFile := filepath.Join(dir, fmt.Sprintf("neo4j_%s.dump", timestamp))

	cmd := exec.CommandContext(ctx, "neo4j-admin", "database", "dump",
		"--to-path="+outFile,
		"--database=neo4j",
	)
	cmd.Env = append(os.Environ(), "NEO4J_HOST="+neo4jHost)

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Warn("neo4j-admin dump failed (may not be available in container)",
			slog.String("output", string(output)),
			slog.Any("error", err))
		return fmt.Errorf("neo4j dump failed: %w", err)
	}
	slog.Info("Neo4j backup complete", slog.String("file", outFile))
	return nil
}

func (s *backupService) backupMongoDB(ctx context.Context, dir, timestamp string) error {
	mongoHost := getEnvOrDefault("MONGODB_HOST", "mongodb")
	mongoPort := getEnvOrDefault("MONGODB_PORT", "27017")
	outDir := filepath.Join(dir, fmt.Sprintf("mongodb_%s", timestamp))

	cmd := exec.CommandContext(ctx, "mongodump",
		"--host="+mongoHost,
		"--port="+mongoPort,
		"--out="+outDir,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Warn("mongodump failed (may not be available in container)",
			slog.String("output", string(output)),
			slog.Any("error", err))
		return fmt.Errorf("mongodump failed: %w", err)
	}
	slog.Info("MongoDB backup complete", slog.String("dir", outDir))
	return nil
}

func (s *backupService) uploadToS3(ctx context.Context, dir, timestamp string) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("failed to open file for S3 upload: %w", err)
		}
		defer file.Close()

		key := fmt.Sprintf("backups/%s/%s", timestamp, info.Name())

		_, err = s.s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(s.bucketName),
			Key:    aws.String(key),
			Body:   file,
		})
		if err != nil {
			return fmt.Errorf("failed to upload %s to S3: %w", info.Name(), err)
		}

		slog.Info("uploaded backup to S3",
			slog.String("key", key),
			slog.Int64("size", info.Size()))
		return nil
	})
}

// RestoreBackup restores databases from a specific backup timestamp.
func (s *backupService) RestoreBackup(ctx context.Context, backupTimestamp string) error {
	backupSubDir := filepath.Join(s.backupDir, backupTimestamp)

	if _, err := os.Stat(backupSubDir); os.IsNotExist(err) {
		// Try downloading from S3
		if s.s3Client != nil {
			slog.Info("backup not found locally, downloading from S3",
				slog.String("timestamp", backupTimestamp))

			// Create local directory
			if err := os.MkdirAll(backupSubDir, 0755); err != nil {
				return fmt.Errorf("failed to create backup directory for restore: %w", err)
			}

			prefix := fmt.Sprintf("backups/%s/", backupTimestamp)
			listOutput, err := s.s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
				Bucket: aws.String(s.bucketName),
				Prefix: aws.String(prefix),
			})
			if err != nil {
				return fmt.Errorf("failed to list backup files in S3: %w", err)
			}

			if len(listOutput.Contents) == 0 {
				return fmt.Errorf("backup %s not found locally or in S3", backupTimestamp)
			}

			for _, obj := range listOutput.Contents {
				getOutput, err := s.s3Client.GetObject(ctx, &s3.GetObjectInput{
					Bucket: aws.String(s.bucketName),
					Key:    obj.Key,
				})
				if err != nil {
					return fmt.Errorf("failed to download %s from S3: %w", *obj.Key, err)
				}

				// The key is backups/<timestamp>/<filename>
				fileName := filepath.Base(*obj.Key)
				localFilePath := filepath.Join(backupSubDir, fileName)

				outFile, err := os.Create(localFilePath)
				if err != nil {
					getOutput.Body.Close()
					return fmt.Errorf("failed to create local file %s: %w", localFilePath, err)
				}

				_, copyErr := io.Copy(outFile, getOutput.Body)
				outFile.Close()
				getOutput.Body.Close()

				if copyErr != nil {
					return fmt.Errorf("failed to write data to %s: %w", localFilePath, copyErr)
				}
				slog.Info("downloaded backup file from S3", slog.String("file", fileName))
			}
		} else {
			return fmt.Errorf("backup %s not found (S3 client not configured)", backupTimestamp)
		}
	}

	slog.Info("starting restore", slog.String("timestamp", backupTimestamp))

	pgHost := getEnvOrDefault("POSTGRES_HOST", "postgres")
	pgUser := getEnvOrDefault("POSTGRES_USER", "dzinza")
	pgPassword := getEnvOrDefault("POSTGRES_PASSWORD", "")

	// Restore PostgreSQL databases
	files, _ := filepath.Glob(filepath.Join(backupSubDir, "*.sql.gz"))
	for _, file := range files {
		// Extract database name from filename
		base := filepath.Base(file)
		dbName := base[:len(base)-len("_"+backupTimestamp+".sql.gz")]

		cmd := exec.CommandContext(ctx, "sh", "-c",
			fmt.Sprintf("gunzip -c %s | PGPASSWORD='%s' psql -h %s -U %s %s",
				file, pgPassword, pgHost, pgUser, dbName))

		output, err := cmd.CombinedOutput()
		if err != nil {
			slog.Error("PostgreSQL restore failed",
				slog.String("database", dbName),
				slog.String("output", string(output)),
				slog.Any("error", err))
			return fmt.Errorf("restore of %s failed: %w", dbName, err)
		}
		slog.Info("PostgreSQL restore complete", slog.String("database", dbName))
	}

	slog.Info("restore completed", slog.String("timestamp", backupTimestamp))
	return nil
}

// ListBackups lists available backups from the local backup directory.
func (s *backupService) ListBackups(ctx context.Context) ([]BackupInfo, error) {
	entries, err := os.ReadDir(s.backupDir)
	if err != nil {
		return nil, fmt.Errorf("failed to list backup directory: %w", err)
	}

	var backups []BackupInfo
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, _ := entry.Info()
		backups = append(backups, BackupInfo{
			Timestamp: entry.Name(),
			Database:  "all",
			Size:      info.Size(),
			Status:    "COMPLETED",
		})
	}

	return backups, nil
}

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
