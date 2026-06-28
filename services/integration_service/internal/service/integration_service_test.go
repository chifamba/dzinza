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
		t.Fatalf("expected 5 providers, got %d", len(providers))
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
		case "FamilySearch", "Ancestry":
			if p.Status != "STUB" {
				t.Errorf("expected provider %s to be STUB, got %s", p.Name, p.Status)
			}
		default:
			t.Errorf("unexpected provider: %s", p.Name)
		}
	}
}

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		name         string
		providerName string
		expectedName string
		expectedCM   int
	}{
		{
			name:         "23andMe sync",
			providerName: "23andMe",
			expectedName: "DNA Match",
			expectedCM:   150,
		},
		{
			name:         "AncestryDNA sync",
			providerName: "ancestrydna", // lowercase to test map key matching
			expectedName: "Ancestry Match",
			expectedCM:   200,
		},
		{
			name:         "FTDNA sync",
			providerName: "FTDNA",
			expectedName: "FTDNA Match",
			expectedCM:   100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tt.providerName, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.Provider != tt.providerName {
				t.Errorf("expected provider %s, got %s", tt.providerName, result.Provider)
			}
			if result.RecordsFetched != 1 {
				t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
			}
			if result.RecordsMapped != 1 {
				t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
			}

			// Since we want to check the actual mapped data, we need to access the provider directly to simulate
			provider, ok := svc.(*integrationService).providers[strings.ToLower(tt.providerName)]
			if !ok {
				t.Fatalf("provider %s not found", tt.providerName)
			}

			data, _ := provider.FetchData(ctx, nil)
			records, err := provider.MapToInternal(data)
			if err != nil {
				t.Fatalf("unexpected mapping error: %v", err)
			}

			if len(records) != 1 {
				t.Fatalf("expected 1 internal record, got %d", len(records))
			}

			rec := records[0]
			if rec.Type != "PERSON" {
				t.Errorf("expected Type PERSON, got %s", rec.Type)
			}

			if rec.Extra["dna_match_name"] != tt.expectedName {
				t.Errorf("expected match name %s, got %v", tt.expectedName, rec.Extra["dna_match_name"])
			}

			if rec.Extra["shared_cm"] != tt.expectedCM {
				t.Errorf("expected shared CM %d, got %v", tt.expectedCM, rec.Extra["shared_cm"])
			}

			// We can also check that confidence is greater than 0
			conf, ok := rec.Extra["confidence"].(float64)
			if !ok || conf <= 0 {
				t.Errorf("expected positive confidence, got %v", rec.Extra["confidence"])
			}
		})
	}
}
