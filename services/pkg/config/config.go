package config

import (
	"fmt"
	"os"
	"reflect"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	AdminModerationServicePort       int `mapstructure:"ADMIN_MODERATION_SERVICE_PORT"`
	AnalyticsServicePort             int `mapstructure:"ANALYTICS_SERVICE_PORT"`
	AuditHistoryServicePort          int `mapstructure:"AUDIT_HISTORY_SERVICE_PORT"`
	AuthServicePort                  int `mapstructure:"AUTH_SERVICE_PORT"`
	CommunityMarketplaceServicePort  int `mapstructure:"COMMUNITY_MARKETPLACE_SERVICE_PORT"`
	DeduplicationServicePort         int `mapstructure:"DEDUPLICATION_SERVICE_PORT"`
	GenealogyServicePort             int `mapstructure:"GENEALOGY_SERVICE_PORT"`
	GraphQueryServicePort            int `mapstructure:"GRAPH_QUERY_SERVICE_PORT"`
	LocalizationServicePort          int `mapstructure:"LOCALIZATION_SERVICE_PORT"`
	MediaServicePort                 int `mapstructure:"MEDIA_STORAGE_SERVICE_PORT"`
	NotificationServicePort          int `mapstructure:"NOTIFICATION_SERVICE_PORT"`
	RelationshipVerificationServicePort int `mapstructure:"RELATIONSHIP_VERIFICATION_SERVICE_PORT"`
	SearchServicePort                int `mapstructure:"SEARCH_DISCOVERY_SERVICE_PORT"`
	TrustServicePort                 int `mapstructure:"TRUST_ACCESS_CONTROL_SERVICE_PORT"`
	HelpSupportServicePort           int `mapstructure:"HELP_SUPPORT_SERVICE_PORT"`

	RedisPort int `mapstructure:"REDIS_PORT"`
	DBPort    int `mapstructure:"DB_PORT"`
	SMTPPort  int `mapstructure:"SMTP_PORT"`

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

	Neo4jURI      string `mapstructure:"NEO4J_URI"`
	Neo4jUser     string `mapstructure:"NEO4J_USER"`
	Neo4jPassword string `mapstructure:"NEO4J_PASSWORD"`

	ElasticsearchURL string `mapstructure:"ELASTICSEARCH_URL"`
	MongoDBURI      string `mapstructure:"MONGODB_URI"`
	CDNBaseURL      string `mapstructure:"CDN_BASE_URL"`

	AWSAccessKeyID     string `mapstructure:"AWS_ACCESS_KEY_ID"`
	AWSSecretAccessKey string `mapstructure:"AWS_SECRET_ACCESS_KEY"`
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
	viper.SetDefault("NEO4J_URI", "bolt://neo4j:7687")
	viper.SetDefault("NEO4J_USER", "neo4j")
	viper.SetDefault("ELASTICSEARCH_URL", "http://elasticsearch:9200")
	viper.SetDefault("MONGODB_URI", "mongodb://mongodb:27017")

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
	if config.Neo4jPassword == "" {
		config.Neo4jPassword, _ = readSecret("neo4j_password")
	}
	if config.AWSAccessKeyID == "" {
		config.AWSAccessKeyID, _ = readSecret("aws_access_key_id")
	}
	if config.AWSSecretAccessKey == "" {
		config.AWSSecretAccessKey, _ = readSecret("aws_secret_access_key")
	}
	if config.MongoDBURI == "mongodb://mongodb:27017" {
		// Try to append password if secret exists
		pass, err := readSecret("mongo_password")
		if err == nil && pass != "" {
			config.MongoDBURI = fmt.Sprintf("mongodb://dzinza_user:%s@mongodb:27017", pass)
		}
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
