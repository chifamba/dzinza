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

	// Create map for easy lookup
	providerMap := make(map[string]ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	// Verify total number
	assert.Len(t, providers, 5)

	// Verify DNA providers status
	dnaProviders := []string{"23andMe", "AncestryDNA", "FTDNA"}
	for _, name := range dnaProviders {
		p, exists := providerMap[name]
		require.True(t, exists, "Provider %s should exist", name)
		assert.Equal(t, "AVAILABLE", p.Status, "Provider %s should be AVAILABLE", name)
		assert.Equal(t, "DNA", p.Category, "Provider %s should be in DNA category", name)
	}

	// Verify other providers status
	otherProviders := []string{"FamilySearch", "Ancestry"}
	for _, name := range otherProviders {
		p, exists := providerMap[name]
		require.True(t, exists, "Provider %s should exist", name)
		assert.Equal(t, "STUB", p.Status, "Provider %s should be STUB", name)
		assert.Equal(t, "GENEALOGY", p.Category, "Provider %s should be in GENEALOGY category", name)
	}
}

func TestDNAProviders_FetchAndMap(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name     string
		provider ExternalProvider
		expected int
	}{
		{
			name:     "23andMe",
			provider: &dna23AndMeProvider{},
			expected: 1,
		},
		{
			name:     "AncestryDNA",
			provider: &dnaAncestryProvider{},
			expected: 2,
		},
		{
			name:     "FTDNA",
			provider: &ftDNAProvider{},
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test FetchData
			data, err := tt.provider.FetchData(ctx, nil)
			require.NoError(t, err)
			require.NotNil(t, data)
			assert.Len(t, data.Records, tt.expected)

			// Validate record structure
			for _, rec := range data.Records {
				assert.Equal(t, "dna_match", rec["type"])
				assert.NotEmpty(t, rec["name"])
				assert.NotZero(t, rec["shared_cm"])
				assert.NotZero(t, rec["confidence"])
			}

			// Test MapToInternal
			internalRecords, err := tt.provider.MapToInternal(data)
			require.NoError(t, err)
			require.NotNil(t, internalRecords)
			assert.Len(t, internalRecords, tt.expected)

			// Validate mapping
			for i, irec := range internalRecords {
				assert.Equal(t, "PERSON", irec.Type)

				// Verify Extra properties exist
				extra := irec.Extra
				require.NotNil(t, extra)

				origRec := data.Records[i]
				assert.Equal(t, origRec["name"], extra["dna_match_name"])
				assert.Equal(t, origRec["shared_cm"], extra["shared_cm"])
				assert.Equal(t, origRec["confidence"], extra["confidence"])
			}
		})
	}
}
