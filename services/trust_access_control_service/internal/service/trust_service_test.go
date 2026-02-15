package service

import (
	"testing"
	"time"

	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/models"
)

func TestComputeScore_NewUser(t *testing.T) {
	svc := &trustService{}
	stats := &models.UserActivityStats{
		AcceptedContributions: 0,
		RejectedContributions: 0,
		AccountAgeDays:        0,
		RecentActivityCount:   0,
		VerificationsDone:     0,
	}

	score := svc.computeScore(stats)

	// New user: 0 contributions (0) + neutral rejection (10) + 0 longevity + 0 activity + 0 verifications = 10
	if score != 10.0 {
		t.Errorf("expected 10.0 for new user, got %f", score)
	}
}

func TestComputeScore_HighlyActiveUser(t *testing.T) {
	svc := &trustService{}
	stats := &models.UserActivityStats{
		AcceptedContributions: 20,  // max contribution score
		RejectedContributions: 0,   // perfect rejection rate
		AccountAgeDays:        730,  // 2 years
		RecentActivityCount:   15,   // max activity
		VerificationsDone:     10,   // max verification
	}

	score := svc.computeScore(stats)

	// 40 + 20 + 15 + 15 + 10 = 100
	if score != 100.0 {
		t.Errorf("expected 100.0 for highly active user, got %f", score)
	}
}

func TestComputeScore_MixedUser(t *testing.T) {
	svc := &trustService{}
	stats := &models.UserActivityStats{
		AcceptedContributions: 5,   // 5 * 4 = 20 contribution points
		RejectedContributions: 5,   // 50% rejection → (1 - 0.5) * 20 = 10
		AccountAgeDays:        180,  // ~0.49 year → ~7.4 longevity points
		RecentActivityCount:   3,    // 3 * 1.5 = 4.5 activity points
		VerificationsDone:     2,    // 2 * 2 = 4 verification points
	}

	score := svc.computeScore(stats)

	// 20 + 10 + 7.40 + 4.5 + 4 = 45.9
	expected := 45.9
	if score < expected-0.5 || score > expected+0.5 {
		t.Errorf("expected ~%.1f for mixed user, got %f", expected, score)
	}
}

func TestComputeScore_MaxCap(t *testing.T) {
	svc := &trustService{}
	stats := &models.UserActivityStats{
		AcceptedContributions: 100,
		RejectedContributions: 0,
		AccountAgeDays:        3650,
		RecentActivityCount:   100,
		VerificationsDone:     100,
	}

	score := svc.computeScore(stats)

	if score != 100.0 {
		t.Errorf("expected score capped at 100.0, got %f", score)
	}
}

func TestApplyTrustDecay_ActiveUser(t *testing.T) {
	svc := &trustService{}
	lastActivity := time.Now().Add(-30 * 24 * time.Hour) // 30 days ago

	result := svc.applyTrustDecay(80.0, lastActivity)

	if result != 80.0 {
		t.Errorf("expected no decay for user active 30 days ago, got %f", result)
	}
}

func TestApplyTrustDecay_InactiveUser90Days(t *testing.T) {
	svc := &trustService{}
	lastActivity := time.Now().Add(-91 * 24 * time.Hour) // 91 days ago — just past threshold

	result := svc.applyTrustDecay(80.0, lastActivity)

	// 1 day past 90 = 0 full months → no decay yet
	if result != 80.0 {
		t.Errorf("expected no decay for 91 days (0 full months past), got %f", result)
	}
}

func TestApplyTrustDecay_InactiveUser6Months(t *testing.T) {
	svc := &trustService{}
	lastActivity := time.Now().Add(-270 * 24 * time.Hour) // ~9 months ago

	result := svc.applyTrustDecay(80.0, lastActivity)

	// 270 - 90 = 180 excess days → 6 months → -6 points → 74
	expected := 74.0
	if result != expected {
		t.Errorf("expected %.1f after 6 months decay, got %f", expected, result)
	}
}

func TestApplyTrustDecay_ZeroFloor(t *testing.T) {
	svc := &trustService{}
	lastActivity := time.Now().Add(-3650 * 24 * time.Hour) // 10 years ago

	result := svc.applyTrustDecay(5.0, lastActivity)

	if result != 0.0 {
		t.Errorf("expected score floored at 0.0, got %f", result)
	}
}

func TestApplyTrustDecay_ZeroLastActivity(t *testing.T) {
	svc := &trustService{}

	result := svc.applyTrustDecay(50.0, time.Time{})

	if result != 50.0 {
		t.Errorf("expected no decay for zero time, got %f", result)
	}
}

func TestComputeRejectionRate(t *testing.T) {
	svc := &trustService{}

	tests := []struct {
		name     string
		stats    *models.UserActivityStats
		expected float64
	}{
		{
			name: "no contributions",
			stats: &models.UserActivityStats{
				AcceptedContributions: 0,
				RejectedContributions: 0,
			},
			expected: 0,
		},
		{
			name: "all accepted",
			stats: &models.UserActivityStats{
				AcceptedContributions: 10,
				RejectedContributions: 0,
			},
			expected: 0,
		},
		{
			name: "50% rejected",
			stats: &models.UserActivityStats{
				AcceptedContributions: 5,
				RejectedContributions: 5,
			},
			expected: 0.5,
		},
		{
			name: "all rejected",
			stats: &models.UserActivityStats{
				AcceptedContributions: 0,
				RejectedContributions: 10,
			},
			expected: 1.0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rate := svc.computeRejectionRate(tc.stats)
			if rate != tc.expected {
				t.Errorf("expected %f, got %f", tc.expected, rate)
			}
		})
	}
}
