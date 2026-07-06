package service

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	dnaProvidersFound := 0
	for _, p := range providers {
		if p.Category == "DNA" {
			dnaProvidersFound++
			assert.Equal(t, "AVAILABLE", p.Status, "DNA provider %s should be AVAILABLE", p.Name)
		}
	}
	assert.Equal(t, 3, dnaProvidersFound, "Should find 3 DNA providers")
}

func TestDNAProviders_MapToInternal(t *testing.T) {
	svc := NewIntegrationService()
	typedSvc := svc.(*integrationService) // Access unexported providers map

	tests := []struct {
		providerName string
		expectedName string
		expectedCM   int
	}{
		{"23andMe", "DNA Match", 150},
		{"AncestryDNA", "Ancestry DNA Match", 250},
		{"FTDNA", "FTDNA Match", 120},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			provider, ok := typedSvc.providers[strings.ToLower(tt.providerName)]
			require.True(t, ok, "Provider %s not found", tt.providerName)

			data, err := provider.FetchData(context.Background(), nil)
			require.NoError(t, err)
			require.NotNil(t, data)
			require.Len(t, data.Records, 1)

			records, err := provider.MapToInternal(data)
			require.NoError(t, err)
			require.Len(t, records, 1)

			record := records[0]
			assert.Equal(t, "PERSON", record.Type)
			assert.NotNil(t, record.Extra)

			// Safely assert the properties inside 'Extra' map
			assert.Equal(t, tt.expectedName, record.Extra["dna_match_name"])

			// Extract integer with types assertion safety or allow conversion
			assert.EqualValues(t, tt.expectedCM, record.Extra["shared_cm"])

			assert.NotNil(t, record.Extra["confidence"])
		})
	}
}
