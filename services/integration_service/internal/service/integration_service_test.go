package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		assert.True(t, ok, "Unexpected provider name: %s", p.Name)
		assert.Equal(t, expectedStatus, p.Status, "Provider %s status should be %s", p.Name, expectedStatus)
	}
}

func TestSyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, p := range providers {
		t.Run(p, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), p, nil)
			require.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, p, result.Provider)
			assert.Equal(t, 1, result.RecordsFetched)
			assert.Equal(t, 1, result.RecordsMapped)
		})
	}
}

func TestMapToInternal_NilHandling(t *testing.T) {
	provider := &familySearchProvider{}
	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"type": "person",
				// Intentionally omit given_name, surname, birth_date
			},
		},
	}

	records, err := provider.MapToInternal(data)
	require.NoError(t, err)
	require.Len(t, records, 1)

	// Should be empty strings, not "<nil>"
	assert.Equal(t, "", records[0].GivenName)
	assert.Equal(t, "", records[0].Surname)
	assert.Equal(t, "", records[0].BirthDate)
}
