package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) == 0 {
		t.Fatalf("expected providers to be registered")
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected %s status to be AVAILABLE, got %s", p.Name, p.Status)
			}
		case "FamilySearch", "Ancestry":
			if p.Status != "STUB" {
				t.Errorf("expected %s status to be STUB, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestDna23AndMeProvider(t *testing.T) {
	p := &dna23AndMeProvider{}
	data, err := p.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	records, err := p.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(records))
	}

	if records[0].Type != "PERSON" {
		t.Errorf("expected Type PERSON, got %s", records[0].Type)
	}

	if records[0].Extra["dna_match_name"] != "DNA Match" {
		t.Errorf("expected name 'DNA Match', got %v", records[0].Extra["dna_match_name"])
	}
}

func TestDnaAncestryProvider(t *testing.T) {
	p := &dnaAncestryProvider{}
	data, err := p.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	records, err := p.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(records))
	}

	if records[0].Type != "PERSON" {
		t.Errorf("expected Type PERSON, got %s", records[0].Type)
	}

	if records[0].Extra["dna_match_name"] != "Ancestry DNA Match" {
		t.Errorf("expected name 'Ancestry DNA Match', got %v", records[0].Extra["dna_match_name"])
	}
}

func TestFtDNAProvider(t *testing.T) {
	p := &ftDNAProvider{}
	data, err := p.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	records, err := p.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(records))
	}

	if records[0].Type != "PERSON" {
		t.Errorf("expected Type PERSON, got %s", records[0].Type)
	}

	if records[0].Extra["dna_match_name"] != "FTDNA Match" {
		t.Errorf("expected name 'FTDNA Match', got %v", records[0].Extra["dna_match_name"])
	}
}
