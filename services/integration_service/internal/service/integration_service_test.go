package service

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.GreaterOrEqual(t, len(providers), 5)

	providerMap := make(map[string]ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	for _, name := range []string{"23andMe", "AncestryDNA", "FTDNA"} {
		p, ok := providerMap[name]
		assert.True(t, ok, "Provider %s should exist", name)
		assert.Equal(t, "AVAILABLE", p.Status, "Provider %s should be AVAILABLE", name)
	}
}

func TestSyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
		expectExtra  map[string]interface{}
	}{
		{
			providerName: "23andMe",
			expectExtra: map[string]interface{}{
				"dna_match_name": "DNA Match",
				"shared_cm":      150,
				"confidence":     float64(0.85),
			},
		},
		{
			providerName: "AncestryDNA",
			expectExtra: map[string]interface{}{
				"dna_match_name": "Ancestry Match",
				"shared_cm":      float64(200),
				"confidence":     float64(0.90),
			},
		},
		{
			providerName: "FTDNA",
			expectExtra: map[string]interface{}{
				"dna_match_name": "FTDNA Match",
				"shared_cm":      float64(100),
				"confidence":     float64(0.75),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), tc.providerName, map[string]string{})
			assert.NoError(t, err)
			assert.Equal(t, 1, res.RecordsFetched)
			assert.Equal(t, 1, res.RecordsMapped)

			provider := svc.(*integrationService).providers[strings.ToLower(tc.providerName)]
			data, _ := provider.FetchData(context.Background(), nil)
			records, _ := provider.MapToInternal(data)
			assert.Equal(t, tc.expectExtra, records[0].Extra)
		})
	}
}
