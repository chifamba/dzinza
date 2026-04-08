package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
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
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Category       string   `json:"category"` // DNA, GENEALOGY, RECORDS
	Status         string   `json:"status"`   // AVAILABLE, STUB
	RequiredConfig []string `json:"required_config"`
}

// SyncResult holds the outcome of a data sync operation.
type SyncResult struct {
	Provider       string        `json:"provider"`
	RecordsFetched int           `json:"records_fetched"`
	RecordsMapped  int           `json:"records_mapped"`
	Errors         []string      `json:"errors,omitempty"`
	Duration       time.Duration `json:"duration"`
	SyncedAt       time.Time     `json:"synced_at"`
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
			info.Description = "23andMe DNA match import"
			info.Category = "DNA"
			info.RequiredConfig = []string{"access_token"}
		case "AncestryDNA":
			info.Description = "AncestryDNA match import"
			info.Category = "DNA"
			info.RequiredConfig = []string{"api_key"}
		case "FTDNA":
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

// --- Provider Implementations ---

func makeHTTPRequest(ctx context.Context, method, url string, headers map[string]string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	return client.Do(req)
}

// familySearchProvider integration.
type familySearchProvider struct{}

func (p *familySearchProvider) Name() string { return "FamilySearch" }

func (p *familySearchProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("FamilySearch: fetching data")
	apiKey, ok := config["api_key"]
	if !ok {
		return nil, fmt.Errorf("api_key is required")
	}
	userID, ok := config["user_id"]
	if !ok {
		return nil, fmt.Errorf("user_id is required")
	}

	url := fmt.Sprintf("https://api.familysearch.org/platform/users/%s/ancestry", userID)
	resp, err := makeHTTPRequest(ctx, http.MethodGet, url, map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Accept":        "application/json",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch data, status: %d", resp.StatusCode)
	}

	var result struct {
		Persons []struct {
			ID      string `json:"id"`
			Display struct {
				Name      string `json:"name"`
				BirthDate string `json:"birthDate"`
			} `json:"display"`
		} `json:"persons"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var records []map[string]interface{}
	for _, person := range result.Persons {
		names := strings.Split(person.Display.Name, " ")
		givenName := ""
		surname := ""
		if len(names) > 0 {
			givenName = names[0]
			if len(names) > 1 {
				surname = names[len(names)-1]
			}
		}
		records = append(records, map[string]interface{}{
			"type":       "person",
			"given_name": givenName,
			"surname":    surname,
			"birth_date": person.Display.BirthDate,
		})
	}

	return &ProviderData{Records: records}, nil
}

func (p *familySearchProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		givenName, _ := raw["given_name"].(string)
		surname, _ := raw["surname"].(string)
		birthDate, _ := raw["birth_date"].(string)

		records = append(records, InternalRecord{
			Type:      "PERSON",
			GivenName: givenName,
			Surname:   surname,
			BirthDate: birthDate,
		})
	}
	return records, nil
}

// ancestryProvider integration.
type ancestryProvider struct{}

func (p *ancestryProvider) Name() string { return "Ancestry" }

func (p *ancestryProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("Ancestry: fetching data")
	apiKey, ok := config["api_key"]
	if !ok {
		return nil, fmt.Errorf("api_key is required")
	}
	treeID, ok := config["tree_id"]
	if !ok {
		return nil, fmt.Errorf("tree_id is required")
	}

	url := fmt.Sprintf("https://api.ancestry.com/v1/trees/%s/persons", treeID)
	resp, err := makeHTTPRequest(ctx, http.MethodGet, url, map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Accept":        "application/json",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch data, status: %d", resp.StatusCode)
	}

	var result struct {
		Persons []struct {
			GivenName string `json:"givenName"`
			Surname   string `json:"surname"`
			BirthDate string `json:"birthDate"`
		} `json:"persons"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var records []map[string]interface{}
	for _, person := range result.Persons {
		records = append(records, map[string]interface{}{
			"type":       "person",
			"given_name": person.GivenName,
			"surname":    person.Surname,
			"birth_date": person.BirthDate,
		})
	}

	return &ProviderData{Records: records}, nil
}

func (p *ancestryProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		givenName, _ := raw["given_name"].(string)
		surname, _ := raw["surname"].(string)
		birthDate, _ := raw["birth_date"].(string)

		records = append(records, InternalRecord{
			Type:      "PERSON",
			GivenName: givenName,
			Surname:   surname,
			BirthDate: birthDate,
		})
	}
	return records, nil
}

// dna23AndMeProvider integration.
type dna23AndMeProvider struct{}

func (p *dna23AndMeProvider) Name() string { return "23andMe" }

func (p *dna23AndMeProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("23andMe: fetching DNA data")
	accessToken, ok := config["access_token"]
	if !ok {
		return nil, fmt.Errorf("access_token is required")
	}

	url := "https://api.23andme.com/3/profile/relatives/"
	resp, err := makeHTTPRequest(ctx, http.MethodGet, url, map[string]string{
		"Authorization": "Bearer " + accessToken,
		"Accept":        "application/json",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch data, status: %d", resp.StatusCode)
	}

	var result struct {
		Relatives []struct {
			Name           string  `json:"name"`
			SharedSegments int     `json:"shared_segments"`
			IbdProportion  float64 `json:"ibd_proportion"` // Percentage shared
		} `json:"relatives"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var records []map[string]interface{}
	for _, rel := range result.Relatives {
		records = append(records, map[string]interface{}{
			"type":       "dna_match",
			"name":       rel.Name,
			"shared_cm":  rel.IbdProportion * 7400, // rough conversion
			"confidence": rel.IbdProportion,
		})
	}

	return &ProviderData{Records: records}, nil
}

func (p *dna23AndMeProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		records = append(records, InternalRecord{
			Type: "PERSON",
			Extra: map[string]interface{}{
				"dna_match_name": raw["name"],
				"shared_cm":      raw["shared_cm"],
				"confidence":     raw["confidence"],
			},
		})
	}
	return records, nil
}

// dnaAncestryProvider integration.
type dnaAncestryProvider struct{}

func (p *dnaAncestryProvider) Name() string { return "AncestryDNA" }

func (p *dnaAncestryProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("AncestryDNA: fetching DNA data")
	apiKey, ok := config["api_key"]
	if !ok {
		return nil, fmt.Errorf("api_key is required")
	}

	url := "https://api.ancestry.com/v1/dna/matches"
	resp, err := makeHTTPRequest(ctx, http.MethodGet, url, map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Accept":        "application/json",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch data, status: %d", resp.StatusCode)
	}

	var result struct {
		Matches []struct {
			Name       string  `json:"name"`
			SharedCM   float64 `json:"shared_cm"`
			Confidence float64 `json:"confidence"`
		} `json:"matches"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var records []map[string]interface{}
	for _, match := range result.Matches {
		records = append(records, map[string]interface{}{
			"type":       "dna_match",
			"name":       match.Name,
			"shared_cm":  match.SharedCM,
			"confidence": match.Confidence,
		})
	}

	return &ProviderData{Records: records}, nil
}

func (p *dnaAncestryProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		records = append(records, InternalRecord{
			Type: "PERSON",
			Extra: map[string]interface{}{
				"dna_match_name": raw["name"],
				"shared_cm":      raw["shared_cm"],
				"confidence":     raw["confidence"],
			},
		})
	}
	return records, nil
}

// ftDNAProvider integration.
type ftDNAProvider struct{}

func (p *ftDNAProvider) Name() string { return "FTDNA" }

func (p *ftDNAProvider) FetchData(ctx context.Context, config map[string]string) (*ProviderData, error) {
	slog.Info("FTDNA: fetching DNA data")
	kitNumber, ok := config["kit_number"]
	if !ok {
		return nil, fmt.Errorf("kit_number is required")
	}
	password, ok := config["password"]
	if !ok {
		return nil, fmt.Errorf("password is required")
	}

	url := "https://api.familytreedna.com/v1/matches"
	resp, err := makeHTTPRequest(ctx, http.MethodGet, url, map[string]string{
		"X-Kit-Number": kitNumber,
		"X-Password":   password,
		"Accept":       "application/json",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch data, status: %d", resp.StatusCode)
	}

	var result struct {
		Matches []struct {
			Name       string  `json:"name"`
			SharedCM   float64 `json:"sharedCM"`
			Confidence float64 `json:"confidence"`
		} `json:"matches"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var records []map[string]interface{}
	for _, match := range result.Matches {
		records = append(records, map[string]interface{}{
			"type":       "dna_match",
			"name":       match.Name,
			"shared_cm":  match.SharedCM,
			"confidence": match.Confidence,
		})
	}

	return &ProviderData{Records: records}, nil
}

func (p *ftDNAProvider) MapToInternal(data *ProviderData) ([]InternalRecord, error) {
	var records []InternalRecord
	for _, raw := range data.Records {
		records = append(records, InternalRecord{
			Type: "PERSON",
			Extra: map[string]interface{}{
				"dna_match_name": raw["name"],
				"shared_cm":      raw["shared_cm"],
				"confidence":     raw["confidence"],
			},
		})
	}
	return records, nil
}
