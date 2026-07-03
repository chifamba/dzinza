package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) == 0 {
		t.Fatalf("expected providers, got 0")
	}

	providerMap := make(map[string]ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	tests := []struct {
		name     string
		category string
		status   string
	}{
		{"23andMe", "DNA", "AVAILABLE"},
		{"AncestryDNA", "DNA", "AVAILABLE"},
		{"FTDNA", "DNA", "AVAILABLE"},
		{"FamilySearch", "GENEALOGY", "STUB"},
		{"Ancestry", "GENEALOGY", "STUB"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p, ok := providerMap[tt.name]
			if !ok {
				t.Fatalf("provider %s not found in list", tt.name)
			}
			if p.Category != tt.category {
				t.Errorf("expected category %s, got %s", tt.category, p.Category)
			}
			if p.Status != tt.status {
				t.Errorf("expected status %s, got %s", tt.status, p.Status)
			}
		})
	}
}

func TestIntegrationService_SyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()

	tests := []struct {
		providerName string
		expectedName string
		expectedCM   float64
		expectedConf float64
	}{
		{"23andMe", "DNA Match", 150.0, 0.85},
		{"AncestryDNA", "AncestryDNA Match", 200.0, 0.90},
		{"FTDNA", "FTDNA Match", 180.0, 0.88},
	}

	for _, tt := range tests {
		t.Run(tt.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), tt.providerName, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.RecordsFetched != 1 {
				t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
			}
			if result.RecordsMapped != 1 {
				t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
			}

			var actualProvider ExternalProvider
			switch tt.providerName {
			case "23andMe": actualProvider = &dna23AndMeProvider{}
			case "AncestryDNA": actualProvider = &dnaAncestryProvider{}
			case "FTDNA": actualProvider = &ftDNAProvider{}
			}

			data, _ := actualProvider.FetchData(context.Background(), nil)
			records, _ := actualProvider.MapToInternal(data)

			if len(records) != 1 {
				t.Fatalf("expected 1 record, got %d", len(records))
			}

			rec := records[0]
			if rec.Type != "PERSON" {
				t.Errorf("expected Type PERSON, got %s", rec.Type)
			}

			if rec.Extra == nil {
				t.Fatalf("expected Extra map, got nil")
			}

			if rec.Extra["dna_match_name"] != tt.expectedName {
				t.Errorf("expected name %s, got %v", tt.expectedName, rec.Extra["dna_match_name"])
			}

			// Handle type assertion for numbers (could be float64 or int depending on how JSON/mock works, here we put literal numbers)
			var cm float64
			switch v := rec.Extra["shared_cm"].(type) {
			case int:
				cm = float64(v)
			case float64:
				cm = v
			default:
				t.Errorf("unexpected type for shared_cm: %T", rec.Extra["shared_cm"])
			}

			if cm != tt.expectedCM {
				t.Errorf("expected shared_cm %v, got %v", tt.expectedCM, cm)
			}
		})
	}
}
