package service

import (
	"context"
	"math"

	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/models"
	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/repository"
)

type TrustService interface {
	CalculateAndStoreScore(ctx context.Context, userID string) error
	GetScore(ctx context.Context, userID string) (*models.TrustScore, error)
}

type trustService struct {
	repo repository.TrustRepository
}

func NewTrustService(repo repository.TrustRepository) TrustService {
	return &trustService{
		repo: repo,
	}
}

func (s *trustService) CalculateAndStoreScore(ctx context.Context, userID string) error {
	// In a real implementation, we would fetch activity data from other services
	// For now, we'll use some mock data or just implement the formula logic

	// Formula weights:
	// Accepted Contributions: 40%
	// Rejection Rate: 20%
	// Account Longevity: 15%
	// Activity Level: 15%
	// Verification Participation: 10%

	// Fetch current stats (mocked)
	stats := struct {
		AcceptedContributions int
		RejectedContributions int
		AccountAgeDays        int
		RecentActivityCount   int
		VerificationsDone     int
	}{
		AcceptedContributions: 10,
		RejectedContributions: 2,
		AccountAgeDays:        30,
		RecentActivityCount:   5,
		VerificationsDone:     3,
	}

	score := 0.0

	// 1. Accepted Contributions (max 40 points)
	contributionScore := float64(stats.AcceptedContributions) * 4.0
	if contributionScore > 40 {
		contributionScore = 40
	}
	score += contributionScore

	// 2. Rejection Rate (max 20 points)
	totalContr := stats.AcceptedContributions + stats.RejectedContributions
	if totalContr > 0 {
		rejectionRate := float64(stats.RejectedContributions) / float64(totalContr)
		rejectionScore := (1.0 - rejectionRate) * 20.0
		score += rejectionScore
	} else {
		score += 20 // Default if no contributions yet? Or maybe 0? Let's say 10.
	}

	// 3. Account Longevity (max 15 points)
	longevityScore := float64(stats.AccountAgeDays) / 365.0 * 15.0
	if longevityScore > 15 {
		longevityScore = 15
	}
	score += longevityScore

	// 4. Activity Level (max 15 points)
	activityScore := float64(stats.RecentActivityCount) * 1.5
	if activityScore > 15 {
		activityScore = 15
	}
	score += activityScore

	// 5. Verification Participation (max 10 points)
	verificationScore := float64(stats.VerificationsDone) * 2.0
	if verificationScore > 10 {
		verificationScore = 10
	}
	score += verificationScore

	// Final normalization
	finalScore := math.Round(score*100) / 100
	if finalScore > 100 {
		finalScore = 100
	}

	trustScore := &models.TrustScore{
		UserID: userID,
		Score:  finalScore,
	}

	return s.repo.UpdateTrustScore(ctx, trustScore)
}

func (s *trustService) GetScore(ctx context.Context, userID string) (*models.TrustScore, error) {
	return s.repo.GetTrustScore(ctx, userID)
}
