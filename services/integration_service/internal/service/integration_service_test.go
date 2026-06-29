package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	dnaProvidersChecked := 0
	for _, p := range providers {
		if p.Category == "DNA" {
			assert.Equal(t, "AVAILABLE", p.Status, "DNA provider %s should be AVAILABLE", p.Name)
			dnaProvidersChecked++
		} else {
			assert.Equal(t, "STUB", p.Status, "Non-DNA provider %s should be STUB", p.Name)
		}
	}

	// We expect 3 DNA providers: 23andMe, AncestryDNA, FTDNA
	assert.Equal(t, 3, dnaProvidersChecked, "Expected 3 DNA providers")
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
		expected     int // Expected mapped records
	}{
		{"23andMe", 1},
		{"AncestryDNA", 2},
		{"FTDNA", 1},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), tc.providerName, nil)
			assert.NoError(t, err)
			assert.NotNil(t, res)
			assert.Equal(t, tc.expected, res.RecordsMapped)
		})
	}
}

func TestIntegrationService_SyncExternalData_Unknown(t *testing.T) {
	svc := NewIntegrationService()
	res, err := svc.SyncExternalData(context.Background(), "UnknownProvider", nil)
	assert.Error(t, err)
	assert.Nil(t, res)
	assert.Contains(t, err.Error(), "unknown provider")
}
