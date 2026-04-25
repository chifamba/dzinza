package service_test

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_SyncExternalData_DNAProviders(t *testing.T) {
	svc := service.NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"dummy": "config"}

	tests := []struct {
		name     string
		provider string
	}{
		{
			name:     "23andMe Provider",
			provider: "23andMe",
		},
		{
			name:     "AncestryDNA Provider",
			provider: "AncestryDNA",
		},
		{
			name:     "FTDNA Provider",
			provider: "FTDNA",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Test the service sync result
			result, err := svc.SyncExternalData(ctx, tc.provider, config)
			require.NoError(t, err)

			assert.Equal(t, tc.provider, result.Provider)
			assert.Equal(t, 1, result.RecordsFetched)
			assert.Equal(t, 1, result.RecordsMapped)
			assert.Empty(t, result.Errors)
			assert.False(t, result.SyncedAt.IsZero())
			assert.True(t, result.Duration >= 0)
		})
	}
}
