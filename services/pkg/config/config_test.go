package config

import (
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	// Set some env vars
	os.Setenv("AUTH_SERVICE_PORT", "8080")
	os.Setenv("DB_HOST", "localhost")

	// Create a dummy .env file
	f, _ := os.Create(".env")
	f.WriteString("REDIS_PORT=6379\n")
	f.Close()
	defer os.Remove(".env")

	cfg, err := LoadConfig(".")
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	if cfg.AuthServicePort != 8080 {
		t.Errorf("Expected AuthServicePort 8080, got %d", cfg.AuthServicePort)
	}

	if cfg.DBHost != "localhost" {
		t.Errorf("Expected DBHost localhost, got %s", cfg.DBHost)
	}

	if cfg.RedisPort != 6379 {
		t.Errorf("Expected RedisPort 6379, got %d", cfg.RedisPort)
	}
}
