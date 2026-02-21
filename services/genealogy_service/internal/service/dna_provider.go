package service

import (
	"context"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
)

// DNAProvider defines the interface for external DNA testing providers.
type DNAProvider interface {
	// FetchResults retrieves DNA test results from the provider using a Kit ID.
	FetchResults(ctx context.Context, kitID string) (*models.DNATest, error)
}
