package service

import (
	"context"
	"testing"
	"strings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	// We expect 5 providers
	assert.Len(t, providers, 5)

	for _, p := range providers {
		if p.Category == "DNA" {
			assert.Equal(t, "AVAILABLE", p.Status, "Expected DNA provider %s to be AVAILABLE", p.Name)
		} else {
			assert.Equal(t, "STUB", p.Status, "Expected non-DNA provider %s to be STUB", p.Name)
		}
	}
}

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
		expectError  bool
	}{
		{providerName: "23andMe", expectError: false},
		{providerName: "AncestryDNA", expectError: false},
		{providerName: "FTDNA", expectError: false},
		{providerName: "Unknown", expectError: true},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), tc.providerName, map[string]string{})

			if tc.expectError {
				require.Error(t, err)
				require.Nil(t, result)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)

				assert.Equal(t, tc.providerName, result.Provider)
				assert.Equal(t, 1, result.RecordsFetched)
				assert.Equal(t, 1, result.RecordsMapped)

				// Verify map to internal correctly
				provider, ok := svc.(*integrationService).providers[strings.ToLower(tc.providerName)]
				require.True(t, ok)

				data, err := provider.FetchData(context.Background(), nil)
				require.NoError(t, err)

				records, err := provider.MapToInternal(data)
				require.NoError(t, err)

				assert.Len(t, records, 1)
				assert.Equal(t, "PERSON", records[0].Type)

				extra := records[0].Extra
				require.NotNil(t, extra)

				// Check for presence of keys and assert types
				dnaMatchName, ok := extra["dna_match_name"]
				assert.True(t, ok)
				assert.Equal(t, "DNA Match", dnaMatchName)

				sharedCm, ok := extra["shared_cm"]
				assert.True(t, ok)
				assert.Equal(t, 150, sharedCm)

				confidence, ok := extra["confidence"]
				assert.True(t, ok)
				assert.Equal(t, 0.85, confidence)
			}
		})
	}
}
