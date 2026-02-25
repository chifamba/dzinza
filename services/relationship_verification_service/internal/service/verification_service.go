package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/repository"
)

// VerificationService defines the interface for the verification workflow.
type VerificationService interface {
	ProposeChange(ctx context.Context, proposerID, targetID, changeType, payload string) (*models.Suggestion, error)
	VerifySuggestion(ctx context.Context, verifierID, suggestionID, action, comment string) error
	ListPending(ctx context.Context) ([]models.Suggestion, error)
}

// Config holds configurable thresholds for the verification workflow.
type Config struct {
	RequiredConfirmations int     // Number of confirmations needed (default: 3)
	ThresholdScore        float64 // Minimum trust score for a confirmation to count (default: 50)
	FastTrackScore        float64 // Trust score for single-confirmation fast track (default: 90)
}

type verificationService struct {
	repo       repository.VerificationRepository
	eventBus   events.Bus
	httpClient *http.Client
	config     Config
}

// NewVerificationService creates a verification service with event bus and trust score integration.
func NewVerificationService(repo repository.VerificationRepository, eventBus events.Bus) VerificationService {
	return &verificationService{
		repo:     repo,
		eventBus: eventBus,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		config: loadVerificationConfig(),
	}
}

func loadVerificationConfig() Config {
	cfg := Config{
		RequiredConfirmations: 3,
		ThresholdScore:        50.0,
		FastTrackScore:        90.0,
	}

	if v := os.Getenv("VERIFICATION_REQUIRED_CONFIRMATIONS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.RequiredConfirmations = n
		}
	}
	if v := os.Getenv("VERIFICATION_THRESHOLD_SCORE"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.ThresholdScore = f
		}
	}
	if v := os.Getenv("VERIFICATION_FAST_TRACK_SCORE"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.FastTrackScore = f
		}
	}

	return cfg
}

// ProposeChange creates a new suggestion for community verification.
func (s *verificationService) ProposeChange(ctx context.Context, proposerID, targetID, changeType, payload string) (*models.Suggestion, error) {
	suggestion := &models.Suggestion{
		ID:                    fmt.Sprintf("sug_%d", time.Now().UnixNano()),
		Type:                  changeType,
		TargetID:              targetID,
		Payload:               payload,
		ProposerID:            proposerID,
		Status:                models.StatusPending,
		ConfirmationCount:     0,
		RequiredConfirmations: s.config.RequiredConfirmations,
		AuditTrail:            models.AuditTrailJSON{},
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	if err := s.repo.CreateSuggestion(ctx, suggestion); err != nil {
		return nil, fmt.Errorf("failed to create suggestion: %w", err)
	}

	return suggestion, nil
}

// VerifySuggestion processes a confirmation or rejection from a verifier.
//
// Workflow:
//   - Fetch verifier's trust score from trust_access_control_service
//   - If trust score < threshold, reject the verification attempt
//   - If action is REJECT, immediately reject the suggestion
//   - If action is CONFIRM:
//     - If trust score >= fast-track threshold, immediately confirm
//     - Otherwise, increment confirmation count
//     - If confirmation count reaches required threshold, confirm
func (s *verificationService) VerifySuggestion(ctx context.Context, verifierID, suggestionID, action, comment string) error {
	suggestion, err := s.repo.GetSuggestionByID(ctx, suggestionID)
	if err != nil {
		return fmt.Errorf("failed to get suggestion %s: %w", suggestionID, err)
	}

	if suggestion.Status != models.StatusPending {
		return fmt.Errorf("suggestion %s is already decided (status: %s)", suggestionID, suggestion.Status)
	}

	if suggestion.ProposerID == verifierID {
		return fmt.Errorf("proposer cannot verify their own suggestion")
	}

	// Check for duplicate verification
	for _, entry := range suggestion.AuditTrail {
		if entry.UserID == verifierID {
			return fmt.Errorf("user %s has already verified this suggestion", verifierID)
		}
	}

	// Fetch verifier's trust score
	trustScore, err := s.fetchTrustScore(ctx, verifierID)
	if err != nil {
		slog.Warn("could not fetch trust score, using default 0",
			slog.String("verifier_id", verifierID), slog.Any("error", err))
		trustScore = 0
	}

	// Verify minimum trust score threshold
	if trustScore < s.config.ThresholdScore {
		return fmt.Errorf("verifier trust score (%.1f) is below threshold (%.1f)", trustScore, s.config.ThresholdScore)
	}

	// Record audit entry
	entry := models.AuditEntry{
		UserID:     verifierID,
		Action:     action,
		Comment:    comment,
		TrustScore: trustScore,
		Timestamp:  time.Now(),
	}
	suggestion.AuditTrail = append(suggestion.AuditTrail, entry)

	switch action {
	case "REJECT":
		suggestion.Status = models.StatusRejected

	case "CONFIRM":
		suggestion.ConfirmationCount++

		// Fast-track: single high-trust confirmation
		if trustScore >= s.config.FastTrackScore {
			suggestion.Status = models.StatusConfirmed
		} else if suggestion.ConfirmationCount >= suggestion.RequiredConfirmations {
			// Standard: reached N confirmations threshold
			suggestion.Status = models.StatusConfirmed
		}

	default:
		return fmt.Errorf("invalid action: %s (expected CONFIRM or REJECT)", action)
	}

	suggestion.UpdatedAt = time.Now()

	if err := s.repo.UpdateSuggestion(ctx, suggestion); err != nil {
		return fmt.Errorf("failed to update suggestion: %w", err)
	}

	// Publish event if suggestion reached a final state
	if suggestion.Status == models.StatusConfirmed || suggestion.Status == models.StatusRejected {
		pubErr := s.eventBus.Publish(ctx, events.RelationshipVerified, events.RelationshipVerifiedPayload{
			RelationshipID: suggestion.TargetID,
			SuggestionID:   suggestionID,
			Payload:        suggestion.Payload,
			VerifiedBy:     verifierID,
			Status:         string(suggestion.Status),
		})
		if pubErr != nil {
			slog.Warn("failed to publish relationship.verified event",
				slog.String("suggestion_id", suggestionID),
				slog.Any("error", pubErr))
		}
	}

	return nil
}

// ListPending returns all pending suggestions.
func (s *verificationService) ListPending(ctx context.Context) ([]models.Suggestion, error) {
	return s.repo.ListPendingSuggestions(ctx)
}

// trustScoreResponse represents the response from trust_access_control_service.
type trustScoreResponse struct {
	Data *struct {
		Score float64 `json:"score"`
	} `json:"data"`
}

// fetchTrustScore calls trust_access_control_service to get a user's trust score.
func (s *verificationService) fetchTrustScore(ctx context.Context, userID string) (float64, error) {
	trustURL := os.Getenv("TRUST_SERVICE_URL")
	if trustURL == "" {
		trustURL = "http://trust_access_control_service:8013"
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/trust/scores/%s", trustURL, userID), nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create trust score request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to call trust service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("trust service returned status %d: %s", resp.StatusCode, string(body))
	}

	var trustResp trustScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&trustResp); err != nil {
		return 0, fmt.Errorf("failed to decode trust score response: %w", err)
	}

	if trustResp.Data == nil {
		return 0, fmt.Errorf("trust service returned nil data for user %s", userID)
	}

	return trustResp.Data.Score, nil
}
