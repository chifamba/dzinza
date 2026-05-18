package service

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	dnaProviderStatusCheck := map[string]bool{
		"23andMe":     false,
		"AncestryDNA": false,
		"FTDNA":       false,
	}

	for _, p := range providers {
		if _, ok := dnaProviderStatusCheck[p.Name]; ok {
			assert.Equal(t, "AVAILABLE", p.Status, "Provider %s should have status AVAILABLE", p.Name)
			dnaProviderStatusCheck[p.Name] = true
		}
	}

	for name, found := range dnaProviderStatusCheck {
		assert.True(t, found, "DNA provider %s not found in ListProviders output", name)
	}
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
		expectedName string
	}{
		{"23andMe", "DNA Match"},
		{"AncestryDNA", "Ancestry Match"},
		{"FTDNA", "FTDNA Match"},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			ctx := context.Background()
			config := map[string]string{"dummy_token": "123"}

			result, err := svc.SyncExternalData(ctx, tc.providerName, config)
			require.NoError(t, err)

			assert.Equal(t, tc.providerName, result.Provider)
			assert.Equal(t, 1, result.RecordsFetched)
			assert.Equal(t, 1, result.RecordsMapped)
			assert.True(t, result.Duration >= 0)

			// Get provider directly to check MapToInternal
			svcImpl, ok := svc.(*integrationService)
			require.True(t, ok)
			provider := svcImpl.providers[strings.ToLower(tc.providerName)]

			data, err := provider.FetchData(ctx, config)
			require.NoError(t, err)

			records, err := provider.MapToInternal(data)
			require.NoError(t, err)
			require.Len(t, records, 1)

			rec := records[0]
			assert.Equal(t, "PERSON", rec.Type)

			extraName, ok := rec.Extra["dna_match_name"].(string)
			assert.True(t, ok)
			assert.Equal(t, tc.expectedName, extraName)
		})
	}
}
