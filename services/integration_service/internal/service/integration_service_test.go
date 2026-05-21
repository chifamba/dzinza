package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewIntegrationService(t *testing.T) {
	svc := NewIntegrationService()
	require.NotNil(t, svc)

	// Since we know providers map is private, we can verify providers via ListProviders
	providers := svc.ListProviders(context.Background())
	assert.Len(t, providers, 5) // FamilySearch, Ancestry, 23andMe, AncestryDNA, FTDNA
}

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	// Convert list to map for easier assertions
	providerMap := make(map[string]ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	dnaProviders := []string{"23andMe", "AncestryDNA", "FTDNA"}
	for _, name := range dnaProviders {
		p, ok := providerMap[name]
		require.True(t, ok, "Expected provider %s to exist", name)
		assert.Equal(t, "AVAILABLE", p.Status, "Expected %s to have AVAILABLE status", name)
		assert.Equal(t, "DNA", p.Category, "Expected %s to be in DNA category", name)
	}

	genealogyProviders := []string{"FamilySearch", "Ancestry"}
	for _, name := range genealogyProviders {
		p, ok := providerMap[name]
		require.True(t, ok, "Expected provider %s to exist", name)
		assert.Equal(t, "STUB", p.Status, "Expected %s to have STUB status", name)
		assert.Equal(t, "GENEALOGY", p.Category, "Expected %s to be in GENEALOGY category", name)
	}
}

func TestSyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		providerName  string
		expectedRecs  int
		expectError   bool
	}{
		{providerName: "23andMe", expectedRecs: 1, expectError: false},
		{providerName: "AncestryDNA", expectedRecs: 1, expectError: false},
		{providerName: "FTDNA", expectedRecs: 1, expectError: false},
		{providerName: "FamilySearch", expectedRecs: 1, expectError: false},
		{providerName: "Ancestry", expectedRecs: 0, expectError: false},
		{providerName: "Unknown", expectedRecs: 0, expectError: true},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tt.providerName, map[string]string{})
			if tt.expectError {
				require.Error(t, err)
				assert.Nil(t, result)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Equal(t, tt.providerName, result.Provider)
				assert.Equal(t, tt.expectedRecs, result.RecordsFetched)
				assert.Equal(t, tt.expectedRecs, result.RecordsMapped)
			}
		})
	}
}
