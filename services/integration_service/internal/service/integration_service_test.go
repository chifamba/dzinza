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
	assert.NotEmpty(t, providers)

	providerStatusMap := make(map[string]string)
	for _, p := range providers {
		providerStatusMap[p.Name] = p.Status
	}

	assert.Equal(t, "AVAILABLE", providerStatusMap["23andMe"])
	assert.Equal(t, "AVAILABLE", providerStatusMap["AncestryDNA"])
	assert.Equal(t, "AVAILABLE", providerStatusMap["FTDNA"])
	assert.Equal(t, "STUB", providerStatusMap["FamilySearch"])
	assert.Equal(t, "STUB", providerStatusMap["Ancestry"])
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		name         string
		providerName string
	}{
		{
			name:         "Sync 23andMe",
			providerName: "23andme",
		},
		{
			name:         "Sync AncestryDNA",
			providerName: "ancestrydna",
		},
		{
			name:         "Sync FTDNA",
			providerName: "ftdna",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tt.providerName, nil)
			require.NoError(t, err)

			assert.Equal(t, tt.providerName, result.Provider)
			assert.Equal(t, 1, result.RecordsFetched)
			assert.Equal(t, 1, result.RecordsMapped)
		})
	}
}

func TestIntegrationService_SyncExternalData_UnknownProvider(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	result, err := svc.SyncExternalData(ctx, "unknownprovider", nil)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unknown provider: unknownprovider")
}

func TestFamilySearchProvider_MapToInternal(t *testing.T) {
	provider := &familySearchProvider{}

	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"given_name": "John",
				// no surname provided
				"birth_date": "1900-01-01",
			},
		},
	}

	records, err := provider.MapToInternal(data)
	require.NoError(t, err)
	require.Len(t, records, 1)

	assert.Equal(t, "John", records[0].GivenName)
	assert.Equal(t, "", records[0].Surname)
	assert.Equal(t, "1900-01-01", records[0].BirthDate)
}
