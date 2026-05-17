package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	providers := svc.ListProviders(ctx)

	assert.NotEmpty(t, providers)

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		require.True(t, ok, "Unknown provider: %s", p.Name)
		assert.Equal(t, expectedStatus, p.Status, "Provider %s status mismatch", p.Name)
	}
}

func TestIntegrationService_SyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"dummy": "config"}

	dnaProviders := []string{"23andme", "ancestrydna", "ftdna"}

	for _, providerName := range dnaProviders {
		t.Run(providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, providerName, config)
			require.NoError(t, err)
			require.NotNil(t, result)

			assert.Equal(t, providerName, result.Provider)
			assert.Greater(t, result.RecordsFetched, 0)
			assert.Equal(t, result.RecordsFetched, result.RecordsMapped)
		})
	}
}

func TestIntegrationService_SyncExternalData_UnknownProvider(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{}

	result, err := svc.SyncExternalData(ctx, "UnknownProvider", config)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown provider")
	assert.Nil(t, result)
}
