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

	require.NotEmpty(t, providers)

	dnaProvidersChecked := 0
	for _, p := range providers {
		if p.Category == "DNA" {
			assert.Equal(t, "AVAILABLE", p.Status, "DNA provider %s should be AVAILABLE", p.Name)
			dnaProvidersChecked++
		}
	}

	assert.Equal(t, 3, dnaProvidersChecked, "Should have exactly 3 DNA providers")
}

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		name          string
		providerName  string
		expectedName  string
		expectedCM    float64
		expectSuccess bool
	}{
		{
			name:          "Sync 23andMe",
			providerName:  "23andMe",
			expectedName:  "DNA Match",
			expectedCM:    150.0,
			expectSuccess: true,
		},
		{
			name:          "Sync AncestryDNA",
			providerName:  "AncestryDNA",
			expectedName:  "Ancestry Match 1",
			expectedCM:    200.0,
			expectSuccess: true,
		},
		{
			name:          "Sync FTDNA",
			providerName:  "FTDNA",
			expectedName:  "FTDNA Match 1",
			expectedCM:    300.0,
			expectSuccess: true,
		},
		{
			name:          "Unknown Provider",
			providerName:  "UnknownDNA",
			expectSuccess: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := svc.SyncExternalData(ctx, tt.providerName, nil)
			if !tt.expectSuccess {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, res)
			assert.Equal(t, 1, res.RecordsFetched)
			assert.Equal(t, 1, res.RecordsMapped)

			// verify mapping through the provider directly (since SyncResult doesn't return the mapped records)
			// to ensure our map parsing is working.
			provider, ok := svc.(*integrationService).providers[tt.providerName]
			if provider == nil && tt.providerName == "23andMe" {
			    provider = svc.(*integrationService).providers["23andme"] // handle case sensitivity
			}
            if provider == nil && tt.providerName == "AncestryDNA" {
			    provider = svc.(*integrationService).providers["ancestrydna"]
			}
            if provider == nil && tt.providerName == "FTDNA" {
			    provider = svc.(*integrationService).providers["ftdna"]
			}

            if !ok && provider == nil {
                t.Fatalf("could not find provider %s", tt.providerName)
            }

			data, err := provider.FetchData(ctx, nil)
			require.NoError(t, err)
			mapped, err := provider.MapToInternal(data)
			require.NoError(t, err)
			require.Len(t, mapped, 1)

			assert.Equal(t, "PERSON", mapped[0].Type)
			assert.Equal(t, tt.expectedName, mapped[0].Extra["dna_match_name"])
			assert.Equal(t, tt.expectedCM, mapped[0].Extra["shared_cm"])
		})
	}
}
