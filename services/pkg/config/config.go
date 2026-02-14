package config

import (
	"fmt"
	"os"
	"reflect"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	AuthServicePort         int    `mapstructure:"AUTH_SERVICE_PORT"`
	GenealogyServicePort    int    `mapstructure:"GENEALOGY_SERVICE_PORT"`
	MediaServicePort        int    `mapstructure:"MEDIA_SERVICE_PORT"`
	NotificationServicePort int    `mapstructure:"NOTIFICATION_SERVICE_PORT"`
	SearchServicePort       int    `mapstructure:"SEARCH_SERVICE_PORT"`
	TrustServicePort        int    `mapstructure:"TRUST_SERVICE_PORT"`
	RedisPort               int    `mapstructure:"REDIS_PORT"`
	DBPort                  int    `mapstructure:"DB_PORT"`
	SMTPPort                int    `mapstructure:"SMTP_PORT"`

	DBHost        string `mapstructure:"DB_HOST"`
	DBName        string `mapstructure:"DB_NAME"`
	DBUser        string `mapstructure:"DB_USER"`
	DBPassword    string `mapstructure:"DB_PASSWORD"`
	RedisHost     string `mapstructure:"REDIS_HOST"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	SMTPHost      string `mapstructure:"SMTP_HOST"`
	SMTPUser      string `mapstructure:"SMTP_USER"`
	SMTPPass      string `mapstructure:"SMTP_PASS"`

	JWTSecret        string `mapstructure:"JWT_SECRET"`
	JWTRefreshSecret string `mapstructure:"JWT_REFRESH_SECRET"`
}

func LoadConfig(path string) (config *Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")

	viper.SetDefault("DB_HOST", "postgres")
	viper.SetDefault("DB_PORT", 5432)
	viper.SetDefault("DB_USER", "dzinza_user")
	viper.SetDefault("DB_NAME", "dzinza_db")
	viper.SetDefault("REDIS_HOST", "redis")
	viper.SetDefault("REDIS_PORT", 6379)
	viper.SetDefault("SMTP_HOST", "mailhog")
	viper.SetDefault("SMTP_PORT", 1025)

	viper.AutomaticEnv()

	// Bind env vars explicitly so Unmarshal picks them up even if not in config file
	config = &Config{}
	t := reflect.TypeOf(*config)
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		tag := field.Tag.Get("mapstructure")
		if tag != "" {
			_ = viper.BindEnv(tag)
		}
	}

	// Read from file first
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// If file not found, we rely on env vars
	}

	if err = viper.Unmarshal(config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Manually load secrets if empty
	if config.DBPassword == "" {
		config.DBPassword, _ = readSecret("db_password")
	}
	if config.RedisPassword == "" {
		config.RedisPassword, _ = readSecret("redis_password")
	}
	if config.JWTSecret == "" {
		config.JWTSecret, _ = readSecret("jwt_secret")
	}
	if config.JWTRefreshSecret == "" {
		config.JWTRefreshSecret, _ = readSecret("jwt_refresh_secret")
	}
	if config.SMTPPass == "" {
		config.SMTPPass, _ = readSecret("smtp_pass")
	}

	return config, nil
}

func readSecret(name string) (string, error) {
	content, err := os.ReadFile("/run/secrets/" + name)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(content)), nil
}
