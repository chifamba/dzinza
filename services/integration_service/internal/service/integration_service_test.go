package service_test

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
)

func TestFamilySearchProvider(t *testing.T) {
	svc := service.NewIntegrationService()
	result, err := svc.SyncExternalData(context.Background(), "FamilySearch", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
	}
	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
	}
}

func TestAncestryProvider(t *testing.T) {
	svc := service.NewIntegrationService()
	result, err := svc.SyncExternalData(context.Background(), "Ancestry", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
	}
	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
	}
}

func Test23AndMeProvider(t *testing.T) {
	svc := service.NewIntegrationService()
	result, err := svc.SyncExternalData(context.Background(), "23andMe", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
	}
	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
	}
}

func TestAncestryDNAProvider(t *testing.T) {
	svc := service.NewIntegrationService()
	result, err := svc.SyncExternalData(context.Background(), "AncestryDNA", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
	}
	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
	}
}

func TestFTDNAProvider(t *testing.T) {
	svc := service.NewIntegrationService()
	result, err := svc.SyncExternalData(context.Background(), "FTDNA", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched, got %d", result.RecordsFetched)
	}
	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped, got %d", result.RecordsMapped)
	}
}
