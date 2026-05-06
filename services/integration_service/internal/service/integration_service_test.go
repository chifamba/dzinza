package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_SyncExternalData_23AndMe(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	res, err := svc.SyncExternalData(ctx, "23andme", nil)
	require.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "23andme", res.Provider)
	assert.Equal(t, 3, res.RecordsFetched)
	assert.Equal(t, 3, res.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_AncestryDNA(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	res, err := svc.SyncExternalData(ctx, "ancestrydna", nil)
	require.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "ancestrydna", res.Provider)
	assert.Equal(t, 2, res.RecordsFetched)
	assert.Equal(t, 2, res.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_FTDNA(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	res, err := svc.SyncExternalData(ctx, "ftdna", nil)
	require.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "ftdna", res.Provider)
	assert.Equal(t, 2, res.RecordsFetched)
	assert.Equal(t, 2, res.RecordsMapped)
}

func TestProvider_MapToInternal_23AndMe(t *testing.T) {
	provider := &dna23AndMeProvider{}

	// Test with explicit types correctly as simulated after JSON unmarshaling
	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"type": "dna_match",
				"name": "Relative A",
				"shared_cm": float64(3500), // JSON parser parses numbers as float64
				"confidence": float64(0.99),
				"relationship": "Parent",
			},
		},
	}

	records, err := provider.MapToInternal(data)
	require.NoError(t, err)
	require.Len(t, records, 1)

	assert.Equal(t, "PERSON", records[0].Type)
	assert.Equal(t, "Relative A", records[0].Extra["dna_match_name"])
	assert.Equal(t, float64(3500), records[0].Extra["shared_cm"])
	assert.Equal(t, float64(0.99), records[0].Extra["confidence"])
	assert.Equal(t, "Parent", records[0].Extra["relationship"])
}

func TestProvider_MapToInternal_AncestryDNA(t *testing.T) {
	provider := &dnaAncestryProvider{}

	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"type": "dna_match",
				"given_name": "John",
				"surname": "Doe",
				"shared_segments": float64(25),
				"shared_cm": float64(1200),
			},
		},
	}

	records, err := provider.MapToInternal(data)
	require.NoError(t, err)
	require.Len(t, records, 1)

	assert.Equal(t, "PERSON", records[0].Type)
	assert.Equal(t, "John", records[0].GivenName)
	assert.Equal(t, "Doe", records[0].Surname)
	assert.Equal(t, float64(25), records[0].Extra["shared_segments"])
	assert.Equal(t, float64(1200), records[0].Extra["shared_cm"])
}

func TestProvider_MapToInternal_FTDNA(t *testing.T) {
	provider := &ftDNAProvider{}

	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"type": "y_dna_match",
				"match_name": "Y-DNA Match 1",
				"genetic_distance": float64(1),
				"haplogroup": "R-M269",
			},
		},
	}

	records, err := provider.MapToInternal(data)
	require.NoError(t, err)
	require.Len(t, records, 1)

	assert.Equal(t, "PERSON", records[0].Type)
	assert.Equal(t, "y_dna_match", records[0].Extra["test_type"])
	assert.Equal(t, "Y-DNA Match 1", records[0].Extra["dna_match_name"])
	assert.Equal(t, float64(1), records[0].Extra["genetic_distance"])
	assert.Equal(t, "R-M269", records[0].Extra["haplogroup"])
}
