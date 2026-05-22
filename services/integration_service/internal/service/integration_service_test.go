package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.Len(t, providers, 5)

	providerMap := make(map[string]ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	// Verify DNA providers status
	assert.Equal(t, "AVAILABLE", providerMap["23andMe"].Status)
	assert.Equal(t, "AVAILABLE", providerMap["AncestryDNA"].Status)
	assert.Equal(t, "AVAILABLE", providerMap["FTDNA"].Status)

	// Verify others
	assert.Equal(t, "STUB", providerMap["FamilySearch"].Status)
	assert.Equal(t, "STUB", providerMap["Ancestry"].Status)
}

func TestIntegrationService_SyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		providerName string
		expectCount  int
		verifyFields func(t *testing.T, records int)
	}{
		{
			providerName: "23andme",
			expectCount:  1,
			verifyFields: func(t *testing.T, count int) {
				assert.Equal(t, 1, count)
			},
		},
		{
			providerName: "ancestrydna",
			expectCount:  1,
			verifyFields: func(t *testing.T, count int) {
				assert.Equal(t, 1, count)
			},
		},
		{
			providerName: "ftdna",
			expectCount:  1,
			verifyFields: func(t *testing.T, count int) {
				assert.Equal(t, 1, count)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tt.providerName, map[string]string{})
			require.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectCount, result.RecordsFetched)
			assert.Equal(t, tt.expectCount, result.RecordsMapped)
			assert.Equal(t, tt.providerName, result.Provider)
		})
	}
}

func TestIntegrationService_SyncExternalData_UnknownProvider(t *testing.T) {
	svc := NewIntegrationService()
	_, err := svc.SyncExternalData(context.Background(), "unknown_provider", map[string]string{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown provider")
}
