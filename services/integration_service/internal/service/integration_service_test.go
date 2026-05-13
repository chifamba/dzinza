package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Fatalf("expected 5 providers, got %d", len(providers))
	}

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected %s to have status AVAILABLE, got %s", p.Name, p.Status)
			}
		default:
			if p.Status != "STUB" {
				t.Errorf("expected %s to have status STUB, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestAncestryDNAProvider(t *testing.T) {
	provider := &dnaAncestryProvider{}
	data, err := provider.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error fetching data: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	internalRecords, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(internalRecords) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(internalRecords))
	}

	if internalRecords[0].Type != "PERSON" {
		t.Errorf("expected record type PERSON, got %s", internalRecords[0].Type)
	}
}

func TestFTDNAProvider(t *testing.T) {
	provider := &ftDNAProvider{}
	data, err := provider.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error fetching data: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	internalRecords, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(internalRecords) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(internalRecords))
	}

	if internalRecords[0].Type != "PERSON" {
		t.Errorf("expected record type PERSON, got %s", internalRecords[0].Type)
	}
}

func Test23AndMeProvider(t *testing.T) {
	provider := &dna23AndMeProvider{}
	data, err := provider.FetchData(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error fetching data: %v", err)
	}

	if len(data.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(data.Records))
	}

	internalRecords, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error mapping data: %v", err)
	}

	if len(internalRecords) != 1 {
		t.Fatalf("expected 1 internal record, got %d", len(internalRecords))
	}

	if internalRecords[0].Type != "PERSON" {
		t.Errorf("expected record type PERSON, got %s", internalRecords[0].Type)
	}
}
