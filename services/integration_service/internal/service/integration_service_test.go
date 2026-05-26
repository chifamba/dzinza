package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Errorf("Expected 5 providers, got %d", len(providers))
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("Expected DNA provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
		case "FamilySearch", "Ancestry":
			if p.Status != "STUB" {
				t.Errorf("Expected genealogy provider %s to be STUB, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestSyncExternalData_DNAMockData(t *testing.T) {
	svc := NewIntegrationService()

	tests := []struct {
		providerName string
		expectedName string
	}{
		{"23andMe", "DNA Match 23"},
		{"AncestryDNA", "DNA Match ADNA"},
		{"FTDNA", "DNA Match FTDNA"},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), tt.providerName, nil)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			if res.RecordsFetched != 1 {
				t.Errorf("Expected 1 record fetched for %s, got %d", tt.providerName, res.RecordsFetched)
			}
			if res.RecordsMapped != 1 {
				t.Errorf("Expected 1 record mapped for %s, got %d", tt.providerName, res.RecordsMapped)
			}
		})
	}
}
