package logging

import (
	"log/slog"
	"os"
)

// NewLogger creates a new structured logger with JSON handler.
// It includes the service name in every log entry.
func NewLogger(serviceName string) *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger := slog.New(handler)
	return logger.With(slog.String("service", serviceName))
}
