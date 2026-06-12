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

	assert.NotEmpty(t, providers)

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			assert.Equal(t, "AVAILABLE", p.Status, "Expected %s to have status AVAILABLE", p.Name)
			assert.Equal(t, "DNA", p.Category, "Expected %s to be in DNA category", p.Name)
		default:
			assert.Equal(t, "STUB", p.Status, "Expected %s to have status STUB", p.Name)
		}
	}
}

func TestDNAProviders_FetchAndMap(t *testing.T) {
	svc := NewIntegrationService()

	providersToTest := []string{"23andme", "ancestrydna", "ftdna"}

	for _, providerName := range providersToTest {
		t.Run(providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), providerName, nil)
			require.NoError(t, err)
			require.NotNil(t, result)

			assert.Equal(t, 1, result.RecordsFetched, "Expected 1 record fetched for %s", providerName)
			assert.Equal(t, 1, result.RecordsMapped, "Expected 1 record mapped for %s", providerName)

			// Get the provider directly to test MapToInternal output in detail
			provider, ok := svc.(*integrationService).providers[providerName]
			require.True(t, ok)

			data, err := provider.FetchData(context.Background(), nil)
			require.NoError(t, err)
			require.NotNil(t, data)
			require.Len(t, data.Records, 1)

			assert.Equal(t, "dna_match", data.Records[0]["type"])
			assert.Equal(t, "DNA Match", data.Records[0]["name"])
			assert.Equal(t, 150, data.Records[0]["shared_cm"])
			assert.Equal(t, 0.85, data.Records[0]["confidence"])

			internalRecords, err := provider.MapToInternal(data)
			require.NoError(t, err)
			require.Len(t, internalRecords, 1)

			record := internalRecords[0]
			assert.Equal(t, "PERSON", record.Type)
			require.NotNil(t, record.Extra)

			assert.Equal(t, "DNA Match", record.Extra["dna_match_name"])
			assert.Equal(t, 150, record.Extra["shared_cm"])
			assert.Equal(t, 0.85, record.Extra["confidence"])
		})
	}
}
