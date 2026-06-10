package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		if !ok {
			t.Errorf("Unexpected provider %s", p.Name)
			continue
		}
		if p.Status != expectedStatus {
			t.Errorf("Expected status %s for provider %s, got %s", expectedStatus, p.Name, p.Status)
		}
	}
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()

	tests := []struct {
		providerName string
		expected     int
	}{
		{"23andMe", 1},
		{"AncestryDNA", 2},
		{"FTDNA", 1},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), tt.providerName, nil)
			if err != nil {
				t.Fatalf("SyncExternalData failed for %s: %v", tt.providerName, err)
			}

			if res.RecordsFetched != tt.expected {
				t.Errorf("Expected %d records fetched for %s, got %d", tt.expected, tt.providerName, res.RecordsFetched)
			}
			if res.RecordsMapped != res.RecordsFetched {
				t.Errorf("Expected RecordsMapped to be %d, got %d", res.RecordsFetched, res.RecordsMapped)
			}
		})
	}
}
