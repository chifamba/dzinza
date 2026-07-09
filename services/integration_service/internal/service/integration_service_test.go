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

	// We expect 5 providers based on NewIntegrationService
	assert.Len(t, providers, 5)

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		require.True(t, ok, "Unexpected provider name: %s", p.Name)
		assert.Equal(t, expectedStatus, p.Status, "Status mismatch for %s", p.Name)
	}
}

func TestIntegrationService_MapToInternal_DNAProviders(t *testing.T) {
	svc := NewIntegrationService().(*integrationService)

	tests := []struct {
		name          string
		providerName  string
		mockData      *ProviderData
		expectedExtra map[string]interface{}
	}{
		{
			name:         "23andMe mapping",
			providerName: "23andMe",
			mockData: &ProviderData{
				Records: []map[string]interface{}{
					{"type": "dna_match", "name": "DNA Match", "shared_cm": 150, "confidence": 0.85},
				},
			},
			expectedExtra: map[string]interface{}{
				"dna_match_name": "DNA Match",
				"shared_cm":      150,
				"confidence":     0.85,
			},
		},
		{
			name:         "AncestryDNA mapping",
			providerName: "AncestryDNA",
			mockData: &ProviderData{
				Records: []map[string]interface{}{
					{"type": "dna_match", "name": "Ancestry DNA Match", "shared_cm": 200, "confidence": 0.90},
				},
			},
			expectedExtra: map[string]interface{}{
				"dna_match_name": "Ancestry DNA Match",
				"shared_cm":      200,
				"confidence":     0.90,
			},
		},
		{
			name:         "FTDNA mapping",
			providerName: "FTDNA",
			mockData: &ProviderData{
				Records: []map[string]interface{}{
					{"type": "dna_match", "name": "FTDNA Match", "shared_cm": 100, "confidence": 0.75},
				},
			},
			expectedExtra: map[string]interface{}{
				"dna_match_name": "FTDNA Match",
				"shared_cm":      100,
				"confidence":     0.75,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, ok := svc.providers[strings.ToLower(tt.providerName)]
			require.True(t, ok, "Provider not found: %s", tt.providerName)

			records, err := provider.MapToInternal(tt.mockData)
			require.NoError(t, err)
			require.Len(t, records, 1)

			record := records[0]
			assert.Equal(t, "PERSON", record.Type)

			// Compare Extra properties
			assert.Equal(t, tt.expectedExtra["dna_match_name"], record.Extra["dna_match_name"])

			// Go types numericals from untyped maps carefully in tests, just use direct assertion
			// since we provided the data struct
			assert.Equal(t, tt.expectedExtra["shared_cm"], record.Extra["shared_cm"])
			assert.Equal(t, tt.expectedExtra["confidence"], record.Extra["confidence"])
		})
	}
}
