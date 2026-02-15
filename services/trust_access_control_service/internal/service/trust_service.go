package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/models"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/repository"
)

// TrustService defines the interface for trust score operations.
type TrustService interface {
	CalculateAndStoreScore(ctx context.Context, userID string) error
	GetScore(ctx context.Context, userID string) (*models.TrustScore, error)
}

type trustService struct {
	repo       repository.TrustRepository
	eventBus   events.Bus
	httpClient *http.Client
}

// NewTrustService creates a TrustService with event bus and HTTP client for inter-service calls.
func NewTrustService(repo repository.TrustRepository, eventBus events.Bus) TrustService {
	return &trustService{
		repo:     repo,
		eventBus: eventBus,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// CalculateAndStoreScore fetches real activity data and computes the trust score.
func (s *trustService) CalculateAndStoreScore(ctx context.Context, userID string) error {
	// Fetch contributions stats from the repository (Neo4j)
	stats, err := s.repo.GetUserActivityStats(ctx, userID)
	if err != nil {
		slog.Warn("failed to fetch activity stats from repository, using fallback",
			slog.String("user_id", userID), slog.Any("error", err))
		stats = &models.UserActivityStats{}
	}

	// Enrich with data from auth_service (account age, last login)
	authStats, err := s.fetchAuthServiceStats(ctx, userID)
	if err != nil {
		slog.Warn("failed to fetch auth stats, proceeding with available data",
			slog.String("user_id", userID), slog.Any("error", err))
	} else {
		stats.AccountAgeDays = authStats.AccountAgeDays
		stats.LastActivityAt = authStats.LastActivityAt
	}

	// Fetch the old score for event publishing
	oldScore := 0.0
	existing, err := s.repo.GetTrustScore(ctx, userID)
	if err == nil && existing != nil {
		oldScore = existing.Score
	}

	// Compute score using the weighted formula from the spec
	score := s.computeScore(stats)

	// Apply trust decay for inactive users (>90 days)
	score = s.applyTrustDecay(score, stats.LastActivityAt)

	trustScore := &models.TrustScore{
		UserID:                userID,
		Score:                 score,
		AcceptedContributions: stats.AcceptedContributions,
		RejectionRate:         s.computeRejectionRate(stats),
		AccountLongevityDays:  stats.AccountAgeDays,
		LastActivityAt:        stats.LastActivityAt,
		UpdatedAt:             time.Now(),
	}

	if err := s.repo.UpdateTrustScore(ctx, trustScore); err != nil {
		return fmt.Errorf("failed to update trust score for user %s: %w", userID, err)
	}

	// Publish trust.updated event if score changed
	if math.Abs(score-oldScore) > 0.01 {
		pubErr := s.eventBus.Publish(ctx, events.TrustUpdated, events.TrustUpdatedPayload{
			UserID:   userID,
			OldScore: oldScore,
			NewScore: score,
		})
		if pubErr != nil {
			slog.Warn("failed to publish trust.updated event",
				slog.String("user_id", userID), slog.Any("error", pubErr))
		}
	}

	return nil
}

// computeScore applies the weighted formula from the requirements spec.
//
// Weights:
//   - Accepted Contributions: 40%
//   - Rejection Rate (inverse): 20%
//   - Account Longevity: 15%
//   - Activity Level: 15%
//   - Verification Participation: 10%
func (s *trustService) computeScore(stats *models.UserActivityStats) float64 {
	score := 0.0

	// 1. Accepted Contributions (max 40 points)
	// Scale: 10 accepted contributions = max score
	contributionScore := float64(stats.AcceptedContributions) * 4.0
	if contributionScore > 40 {
		contributionScore = 40
	}
	score += contributionScore

	// 2. Rejection Rate — inverse (max 20 points)
	total := stats.AcceptedContributions + stats.RejectedContributions
	if total > 0 {
		rejectionRate := float64(stats.RejectedContributions) / float64(total)
		score += (1.0 - rejectionRate) * 20.0
	} else {
		score += 10.0 // Neutral default for new users with no contributions
	}

	// 3. Account Longevity (max 15 points)
	// 1 year = max score
	longevityScore := float64(stats.AccountAgeDays) / 365.0 * 15.0
	if longevityScore > 15 {
		longevityScore = 15
	}
	score += longevityScore

	// 4. Activity Level (max 15 points)
	// 10 recent activities = max score
	activityScore := float64(stats.RecentActivityCount) * 1.5
	if activityScore > 15 {
		activityScore = 15
	}
	score += activityScore

	// 5. Verification Participation (max 10 points)
	// 5 verifications = max score
	verificationScore := float64(stats.VerificationsDone) * 2.0
	if verificationScore > 10 {
		verificationScore = 10
	}
	score += verificationScore

	// Normalize to 0–100
	finalScore := math.Round(score*100) / 100
	if finalScore > 100 {
		finalScore = 100
	}
	if finalScore < 0 {
		finalScore = 0
	}

	return finalScore
}

// applyTrustDecay reduces the score by 1 point per month of inactivity beyond 90 days.
func (s *trustService) applyTrustDecay(score float64, lastActivity time.Time) float64 {
	if lastActivity.IsZero() {
		return score
	}

	daysSinceActivity := time.Since(lastActivity).Hours() / 24
	if daysSinceActivity <= 90 {
		return score
	}

	// Lose 1 point per 30 days of inactivity beyond the 90-day threshold
	excessDays := daysSinceActivity - 90
	monthsInactive := math.Floor(excessDays / 30)
	decayedScore := score - monthsInactive

	if decayedScore < 0 {
		decayedScore = 0
	}

	return math.Round(decayedScore*100) / 100
}

// computeRejectionRate calculates the rejection rate from stats.
func (s *trustService) computeRejectionRate(stats *models.UserActivityStats) float64 {
	total := stats.AcceptedContributions + stats.RejectedContributions
	if total == 0 {
		return 0
	}
	return float64(stats.RejectedContributions) / float64(total)
}

// authServiceStatsResponse represents the response from auth_service.
type authServiceStatsResponse struct {
	UserID        string    `json:"user_id"`
	CreatedAt     time.Time `json:"created_at"`
	LastLoginAt   time.Time `json:"last_login_at"`
}

// fetchAuthServiceStats calls auth_service to get user account metadata.
func (s *trustService) fetchAuthServiceStats(ctx context.Context, userID string) (*models.UserActivityStats, error) {
	authURL := os.Getenv("AUTH_SERVICE_URL")
	if authURL == "" {
		authURL = "http://auth_service:8003"
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/users/%s/stats", authURL, userID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth stats request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call auth service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("auth service returned status %d: %s", resp.StatusCode, string(body))
	}

	var authResp authServiceStatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return nil, fmt.Errorf("failed to decode auth stats response: %w", err)
	}

	accountAge := int(time.Since(authResp.CreatedAt).Hours() / 24)

	return &models.UserActivityStats{
		AccountAgeDays: accountAge,
		LastActivityAt: authResp.LastLoginAt,
	}, nil
}

func (s *trustService) GetScore(ctx context.Context, userID string) (*models.TrustScore, error) {
	return s.repo.GetTrustScore(ctx, userID)
}
