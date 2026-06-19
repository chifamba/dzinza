package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	expectedStatuses := map[string]string{
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
	}

	for _, p := range providers {
		expected, ok := expectedStatuses[p.Name]
		if !ok {
			t.Errorf("Unexpected provider in ListProviders: %s", p.Name)
			continue
		}

		if p.Status != expected {
			t.Errorf("Provider %s status is %s, expected %s", p.Name, p.Status, expected)
		}
	}
}

func TestDnaAncestryProvider_FetchAndMap(t *testing.T) {
	provider := &dnaAncestryProvider{}
	ctx := context.Background()

	data, err := provider.FetchData(ctx, nil)
	if err != nil {
		t.Fatalf("FetchData returned error: %v", err)
	}

	if len(data.Records) == 0 {
		t.Fatalf("FetchData returned empty records")
	}

	records, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("MapToInternal returned error: %v", err)
	}

	if len(records) != len(data.Records) {
		t.Errorf("Expected %d mapped records, got %d", len(data.Records), len(records))
	}

	firstRecord := records[0]
	if firstRecord.Type != "PERSON" {
		t.Errorf("Expected mapped record type 'PERSON', got '%s'", firstRecord.Type)
	}

	matchName, ok := firstRecord.Extra["dna_match_name"]
	if !ok || matchName != "AncestryDNA Match" {
		t.Errorf("Expected dna_match_name 'AncestryDNA Match', got %v", matchName)
	}
}

func TestFtDNAProvider_FetchAndMap(t *testing.T) {
	provider := &ftDNAProvider{}
	ctx := context.Background()

	data, err := provider.FetchData(ctx, nil)
	if err != nil {
		t.Fatalf("FetchData returned error: %v", err)
	}

	if len(data.Records) == 0 {
		t.Fatalf("FetchData returned empty records")
	}

	records, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("MapToInternal returned error: %v", err)
	}

	if len(records) != len(data.Records) {
		t.Errorf("Expected %d mapped records, got %d", len(data.Records), len(records))
	}

	firstRecord := records[0]
	if firstRecord.Type != "PERSON" {
		t.Errorf("Expected mapped record type 'PERSON', got '%s'", firstRecord.Type)
	}

	matchName, ok := firstRecord.Extra["dna_match_name"]
	if !ok || matchName != "FTDNA Match" {
		t.Errorf("Expected dna_match_name 'FTDNA Match', got %v", matchName)
	}
}
