package service

import (
	"context"
	"strings"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	// Ensure all 5 providers are returned
	if len(providers) != 5 {
		t.Fatalf("expected 5 providers, got %d", len(providers))
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected provider %s status to be AVAILABLE, got %s", p.Name, p.Status)
			}
		case "Ancestry", "FamilySearch":
			if p.Status != "STUB" {
				t.Errorf("expected provider %s status to be STUB, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestDNAProviders_MapToInternal(t *testing.T) {
	svc := NewIntegrationService().(*integrationService)

	tests := []struct {
		name         string
		providerName string
	}{
		{name: "23andMe Provider", providerName: "23andMe"},
		{name: "AncestryDNA Provider", providerName: "AncestryDNA"},
		{name: "FTDNA Provider", providerName: "FTDNA"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, ok := svc.providers[strings.ToLower(tt.providerName)]
			if !ok {
				t.Fatalf("provider %s not found", tt.providerName)
			}

			// Fetch mock data
			data, err := provider.FetchData(context.Background(), nil)
			if err != nil {
				t.Fatalf("unexpected error from FetchData: %v", err)
			}
			if len(data.Records) == 0 {
				t.Fatalf("expected at least 1 record from FetchData, got 0")
			}

			// Map data to internal format
			records, err := provider.MapToInternal(data)
			if err != nil {
				t.Fatalf("unexpected error from MapToInternal: %v", err)
			}
			if len(records) != len(data.Records) {
				t.Fatalf("expected %d mapped records, got %d", len(data.Records), len(records))
			}

			record := records[0]

			if record.Type != "PERSON" {
				t.Errorf("expected Type to be PERSON, got %s", record.Type)
			}

			if record.Extra == nil {
				t.Fatalf("expected Extra map to not be nil")
			}

			if matchName, ok := record.Extra["dna_match_name"]; !ok || matchName != "DNA Match" {
				t.Errorf("expected dna_match_name to be 'DNA Match', got %v (exists: %v)", matchName, ok)
			}

			if sharedCm, ok := record.Extra["shared_cm"]; !ok || sharedCm != 150 {
				t.Errorf("expected shared_cm to be 150, got %v (exists: %v)", sharedCm, ok)
			}

			if confidence, ok := record.Extra["confidence"]; !ok || confidence != 0.85 {
				t.Errorf("expected confidence to be 0.85, got %v (exists: %v)", confidence, ok)
			}
		})
	}
}
