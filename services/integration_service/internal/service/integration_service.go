package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"
)

// IntegrationService defines the interface for external data integration.
type IntegrationService interface {
	SyncExternalData(ctx context.Context, providerName string, config map[string]string) (*SyncResult, error)
	ListProviders(ctx context.Context) []ProviderInfo
	HandleWebhook(ctx context.Context, providerName string, payload []byte) error
}

// ExternalProvider defines the interface that each external data provider must implement.
type ExternalProvider interface {
	Name() string
	FetchData(ctx context.Context, config map[string]string) (*ProviderData, error)
	MapToInternal(data *ProviderData) ([]InternalRecord, error)
}

// ProviderInfo holds metadata about an available provider.
type ProviderInfo struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Category    string   `json:"category"` // DNA, GENEALOGY, RECORDS
	Status      string   `json:"status"`   // AVAILABLE, STUB
	RequiredConfig []string `json:"required_config"`
}

// SyncResult holds the outcome of a data sync operation.
type SyncResult struct {
	Provider      string        `json:"provider"`
	RecordsFetched int          `json:"records_fetched"`
	RecordsMapped  int          `json:"records_mapped"`
	Errors        []string      `json:"errors,omitempty"`
	Duration      time.Duration `json:"duration"`
	SyncedAt      time.Time     `json:"synced_at"`
}

// ProviderData represents raw data from an external provider.
type ProviderData struct {
	Records []map[string]interface{} `json:"records"`
}

// InternalRecord represents a normalized record ready for import.
type InternalRecord struct {
	Type      string                 `json:"type"` // PERSON, RELATIONSHIP
	GivenName string                 `json:"given_name,omitempty"`
	Surname   string                 `json:"surname,omitempty"`
	BirthDate string                 `json:"birth_date,omitempty"`
	Extra     map[string]interface{} `json:"extra,omitempty"`
}

type integrationService struct {
	providers map[string]ExternalProvider
}

// NewIntegrationService creates an integration service with all registered providers.
func NewIntegrationService() IntegrationService {
	svc := &integrationService{
		providers: make(map[string]ExternalProvider),
	}

	// Register providers
	svc.registerProvider(&familySearchProvider{})
	svc.registerProvider(&ancestryProvider{})
	svc.registerProvider(&dna23AndMeProvider{})
	svc.registerProvider(&dnaAncestryProvider{})
	svc.registerProvider(&ftDNAProvider{})

	return svc
}

func (s *integrationService) registerProvider(p ExternalProvider) {
	s.providers[strings.ToLower(p.Name())] = p
}

// SyncExternalData fetches data from a named provider and maps it to internal format.
func (s *integrationService) SyncExternalData(ctx context.Context, providerName string, config map[string]string) (*SyncResult, error) {
	start := time.Now()

	provider, ok := s.providers[strings.ToLower(providerName)]
	if !ok {
		return nil, fmt.Errorf("unknown provider: %s", providerName)
	}

	slog.Info("starting external data sync",
		slog.String("provider", providerName))

	data, err := provider.FetchData(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch data from %s: %w", providerName, err)
	}

	records, err := provider.MapToInternal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to map data from %s: %w", providerName, err)
	}

	result := &SyncResult{
		Provider:       providerName,
		RecordsFetched: len(data.Records),
		RecordsMapped:  len(records),
		Duration:       time.Since(start),
		SyncedAt:       time.Now(),
	}

	slog.Info("external data sync completed",
		slog.String("provider", providerName),
		slog.Int("fetched", result.RecordsFetched),
		slog.Int("mapped", result.RecordsMapped))

	return result, nil
}

// ListProviders returns metadata about all registered providers.
func (s *integrationService) ListProviders(ctx context.Context) []ProviderInfo {
	var providers []ProviderInfo
	for _, p := range s.providers {
		info := ProviderInfo{
			Name:   p.Name(),
			Status: "STUB",
		}

		switch p.Name() {
		case "FamilySearch":
			info.Description = "FamilySearch.org genealogy data integration"
			info.Category = "GENEALOGY"
			info.RequiredConfig = []string{"api_key", "user_id"}
		case "Ancestry":
			info.Description = "Ancestry.com data import"
			info.Category = "GENEALOGY"
			info.RequiredConfig = []string{"api_key", "tree_id"}
		case "23andMe":
			info.Status = "AVAILABLE"
			info.Description = "23andMe DNA match import"
			info.Category = "DNA"
			info.RequiredConfig = []string{"access_token"}
		case "AncestryDNA":
			info.Status = "AVAILABLE"
			info.Description = "AncestryDNA match import"
			info.Category = "DNA"
			info.RequiredConfig = []string{"api_key"}
		case "FTDNA":
			info.Status = "AVAILABLE"
			info.Description = "FamilyTreeDNA data import"
			info.Category = "DNA"
			info.RequiredConfig = []string{"kit_number", "password"}
		}

		providers = append(providers, info)
	}
	return providers
}

// HandleWebhook processes incoming webhook calls from external providers.
func (s *integrationService) HandleWebhook(ctx context.Context, providerName string, payload []byte) error {
	slog.Info("received webhook from provider",
		slog.String("provider", providerName),
		slog.Int("payload_size", len(payload)))

	// Process webhook payload — in a production system, this would trigger
	// a background sync based on the webhook event type
	return nil
}

// --- Provider Implementations (Typed Stubs) ---

// familySearchProvider is a stub for FamilySearch.org integration.
type familySearchProvider struct{}

func (p *familySearchProvider) Name() string { return "FamilySearch" }

func (p *familySearchProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("FamilySearch: fetching data (stub mode)")
	return &ProviderData{
		Records: []map[string]interface{}{
			{"type": "person", "given_name": "Sample", "surname": "Person", "birth_date": "1900"},
		},
	}, nil
}

func (p *familySearchProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		record := InternalRecord{Type: "PERSON"}
		if v, ok := raw["given_name"]; ok && v != nil {
			record.GivenName = fmt.Sprint(v)
		}
		if v, ok := raw["surname"]; ok && v != nil {
			record.Surname = fmt.Sprint(v)
		}
		if v, ok := raw["birth_date"]; ok && v != nil {
			record.BirthDate = fmt.Sprint(v)
		}
		records = append(records, record)
	}
	return records, nil
}

// ancestryProvider is a stub for Ancestry.com integration.
type ancestryProvider struct{}

func (p *ancestryProvider) Name() string { return "Ancestry" }

func (p *ancestryProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("Ancestry: fetching data (stub mode)")
	return &ProviderData{Records: []map[string]interface{}{}}, nil
}

func (p *ancestryProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	return nil, nil
}

// dna23AndMeProvider is a stub for 23andMe DNA provider.
type dna23AndMeProvider struct{}

func (p *dna23AndMeProvider) Name() string { return "23andMe" }

func (p *dna23AndMeProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("23andMe: fetching DNA data (stub mode)")
	return &ProviderData{
		Records: []map[string]interface{}{
			{"type": "dna_match", "name": "DNA Match", "shared_cm": 150, "confidence": 0.85},
		},
	}, nil
}

func (p *dna23AndMeProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		extra := make(map[string]interface{})
		if v, ok := raw["name"]; ok && v != nil {
			extra["dna_match_name"] = v
		}
		if v, ok := raw["shared_cm"]; ok && v != nil {
			extra["shared_cm"] = v
		}
		if v, ok := raw["confidence"]; ok && v != nil {
			extra["confidence"] = v
		}
		records = append(records, InternalRecord{
			Type:  "PERSON",
			Extra: extra,
		})
	}
	return records, nil
}

// dnaAncestryProvider is a stub for AncestryDNA provider.
type dnaAncestryProvider struct{}

func (p *dnaAncestryProvider) Name() string { return "AncestryDNA" }

func (p *dnaAncestryProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("AncestryDNA: fetching DNA data (mock mode)")
	return &ProviderData{
		Records: []map[string]interface{}{
			{"type": "dna_match", "name": "Ancestry Match 1", "shared_cm": 210, "confidence": 0.90},
			{"type": "dna_match", "name": "Ancestry Match 2", "shared_cm": 85, "confidence": 0.75},
		},
	}, nil
}

func (p *dnaAncestryProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		extra := make(map[string]interface{})
		if v, ok := raw["name"]; ok && v != nil {
			extra["dna_match_name"] = v
		}
		if v, ok := raw["shared_cm"]; ok && v != nil {
			extra["shared_cm"] = v
		}
		if v, ok := raw["confidence"]; ok && v != nil {
			extra["confidence"] = v
		}
		records = append(records, InternalRecord{
			Type:  "PERSON",
			Extra: extra,
		})
	}
	return records, nil
}

// ftDNAProvider is a stub for FamilyTreeDNA provider.
type ftDNAProvider struct{}

func (p *ftDNAProvider) Name() string { return "FTDNA" }

func (p *ftDNAProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("FTDNA: fetching DNA data (mock mode)")
	return &ProviderData{
		Records: []map[string]interface{}{
			{"type": "dna_match", "name": "FTDNA Match 1", "shared_cm": 300, "confidence": 0.95},
		},
	}, nil
}

func (p *ftDNAProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		extra := make(map[string]interface{})
		if v, ok := raw["name"]; ok && v != nil {
			extra["dna_match_name"] = v
		}
		if v, ok := raw["shared_cm"]; ok && v != nil {
			extra["shared_cm"] = v
		}
		if v, ok := raw["confidence"]; ok && v != nil {
			extra["confidence"] = v
		}
		records = append(records, InternalRecord{
			Type:  "PERSON",
			Extra: extra,
		})
	}
	return records, nil
}
