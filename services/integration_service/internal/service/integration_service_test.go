package service

import (
	"context"
	"strings"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	// We expect 5 providers
	if len(providers) != 5 {
		t.Errorf("expected 5 providers, got %d", len(providers))
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
		default:
			if p.Status != "STUB" {
				t.Errorf("expected provider %s to be STUB, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := NewIntegrationService()

	tests := []struct {
		providerName  string
		expectedRecs  int
		expectedMatch string
	}{
		{"23andMe", 1, "DNA Match"},
		{"AncestryDNA", 1, "DNA Match Ancestry"},
		{"FTDNA", 1, "DNA Match FTDNA"},
	}

	for _, tc := range tests {
		t.Run(tc.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), strings.ToLower(tc.providerName), nil)
			if err != nil {
				t.Fatalf("unexpected error syncing %s: %v", tc.providerName, err)
			}

			if res.RecordsFetched != tc.expectedRecs {
				t.Errorf("expected %d fetched records, got %d", tc.expectedRecs, res.RecordsFetched)
			}
			if res.RecordsMapped != tc.expectedRecs {
				t.Errorf("expected %d mapped records, got %d", tc.expectedRecs, res.RecordsMapped)
			}

			// Validate the mapped records specifically
			p := svc.(*integrationService).providers[strings.ToLower(tc.providerName)]
			data, _ := p.FetchData(context.Background(), nil)
			records, _ := p.MapToInternal(data)

			if len(records) != tc.expectedRecs {
				t.Fatalf("expected %d mapped record from provider, got %d", tc.expectedRecs, len(records))
			}

			rec := records[0]
			if rec.Type != "PERSON" {
				t.Errorf("expected mapped record type PERSON, got %s", rec.Type)
			}

			if rec.Extra["dna_match_name"] != tc.expectedMatch {
				t.Errorf("expected match name %s, got %v", tc.expectedMatch, rec.Extra["dna_match_name"])
			}
		})
	}
}
