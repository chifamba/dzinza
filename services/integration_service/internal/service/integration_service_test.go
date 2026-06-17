package service

import (
	"context"
	"strings"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()

	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Errorf("Expected 5 providers, got %d", len(providers))
	}

	expectedStatuses := map[string]string{
		"familysearch": "STUB",
		"ancestry":     "STUB",
		"23andme":      "AVAILABLE",
		"ancestrydna":  "AVAILABLE",
		"ftdna":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[strings.ToLower(p.Name)]
		if !ok {
			t.Errorf("Unexpected provider name: %s", p.Name)
			continue
		}
		if p.Status != expectedStatus {
			t.Errorf("Provider %s status: expected %s, got %s", p.Name, expectedStatus, p.Status)
		}
	}
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
	}{
		{"23andMe"},
		{"AncestryDNA"},
		{"FTDNA"},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), tc.providerName, nil)

			if err != nil {
				t.Fatalf("SyncExternalData failed for %s: %v", tc.providerName, err)
			}

			if result.Provider != tc.providerName {
				t.Errorf("Expected provider %s, got %s", tc.providerName, result.Provider)
			}

			if result.RecordsFetched != 1 {
				t.Errorf("Expected 1 record fetched for %s, got %d", tc.providerName, result.RecordsFetched)
			}

			if result.RecordsMapped != 1 {
				t.Errorf("Expected 1 record mapped for %s, got %d", tc.providerName, result.RecordsMapped)
			}
		})
	}
}

func TestIntegrationService_SyncExternalData_FamilySearch(t *testing.T) {
	svc := NewIntegrationService()

	result, err := svc.SyncExternalData(context.Background(), "FamilySearch", nil)

	if err != nil {
		t.Fatalf("SyncExternalData failed for FamilySearch: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("Expected 1 record fetched for FamilySearch, got %d", result.RecordsFetched)
	}
}
