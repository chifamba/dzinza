package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	expectedStatuses := map[string]string{
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
	}

	foundMap := make(map[string]bool)

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		if ok {
			foundMap[p.Name] = true
			if p.Status != expectedStatus {
				t.Errorf("Expected status for %s to be %s, but got %s", p.Name, expectedStatus, p.Status)
			}
		}
	}

	for name := range expectedStatuses {
		if !foundMap[name] {
			t.Errorf("Expected provider %s not found in ListProviders output", name)
		}
	}
}

func TestDNAProviders_FetchAndMap(t *testing.T) {
	tests := []struct {
		name         string
		provider     ExternalProvider
		expectedName string
		expectedCM   float64
		expectedConf float64
	}{
		{
			name:         "23andMe",
			provider:     &dna23AndMeProvider{},
			expectedName: "DNA Match",
			expectedCM:   150.0,
			expectedConf: 0.85,
		},
		{
			name:         "AncestryDNA",
			provider:     &dnaAncestryProvider{},
			expectedName: "Ancestry Match",
			expectedCM:   200.0,
			expectedConf: 0.90,
		},
		{
			name:         "FTDNA",
			provider:     &ftDNAProvider{},
			expectedName: "FTDNA Match",
			expectedCM:   100.0,
			expectedConf: 0.75,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := tt.provider.FetchData(context.Background(), nil)
			if err != nil {
				t.Fatalf("FetchData returned error: %v", err)
			}

			if len(data.Records) != 1 {
				t.Fatalf("Expected 1 record, got %d", len(data.Records))
			}

			internalRecords, err := tt.provider.MapToInternal(data)
			if err != nil {
				t.Fatalf("MapToInternal returned error: %v", err)
			}

			if len(internalRecords) != 1 {
				t.Fatalf("Expected 1 internal record, got %d", len(internalRecords))
			}

			rec := internalRecords[0]
			if rec.Type != "PERSON" {
				t.Errorf("Expected type PERSON, got %s", rec.Type)
			}

			if rec.Extra == nil {
				t.Fatalf("Expected non-nil Extra map")
			}

			matchName, ok := rec.Extra["dna_match_name"].(string)
			if !ok || matchName != tt.expectedName {
				t.Errorf("Expected dna_match_name %s, got %v", tt.expectedName, rec.Extra["dna_match_name"])
			}

			// In JSON parsing without strict schema, numbers might be parsed as float64 or int.
			// The mock data provides int/float directly.
			// Let's assert based on float64 or int conversion
			assertNum(t, rec.Extra["shared_cm"], tt.expectedCM)
			assertNum(t, rec.Extra["confidence"], tt.expectedConf)
		})
	}
}

func assertNum(t *testing.T, actual interface{}, expected float64) {
	switch v := actual.(type) {
	case float64:
		if v != expected {
			t.Errorf("Expected %f, got %f", expected, v)
		}
	case int:
		if float64(v) != expected {
			t.Errorf("Expected %f, got %d", expected, v)
		}
	default:
		t.Errorf("Unexpected type for number: %T", actual)
	}
}
