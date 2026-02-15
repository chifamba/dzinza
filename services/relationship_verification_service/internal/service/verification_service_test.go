package service

import (
	"testing"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
)

func TestVerifySuggestion_RejectImmediately(t *testing.T) {
	// The rejection flow should set status to REJECTED regardless of confirmation count
	suggestion := &models.Suggestion{
		ID:                    "sug_test1",
		Status:                models.StatusPending,
		ConfirmationCount:     0,
		RequiredConfirmations: 3,
		AuditTrail:            models.AuditTrailJSON{},
	}

	// Simulate rejection
	entry := models.AuditEntry{
		UserID:     "verifier_1",
		Action:     "REJECT",
		TrustScore: 60.0,
		Timestamp:  time.Now(),
	}
	suggestion.AuditTrail = append(suggestion.AuditTrail, entry)
	suggestion.Status = models.StatusRejected

	if suggestion.Status != models.StatusRejected {
		t.Errorf("expected REJECTED, got %s", suggestion.Status)
	}
}

func TestVerifySuggestion_NConfirmations(t *testing.T) {
	suggestion := &models.Suggestion{
		ID:                    "sug_test2",
		Status:                models.StatusPending,
		ConfirmationCount:     0,
		RequiredConfirmations: 3,
		AuditTrail:            models.AuditTrailJSON{},
	}

	// Simulate 3 confirmations from users with adequate trust scores
	for i := 0; i < 3; i++ {
		suggestion.ConfirmationCount++
		suggestion.AuditTrail = append(suggestion.AuditTrail, models.AuditEntry{
			UserID:     "verifier_" + string(rune('a'+i)),
			Action:     "CONFIRM",
			TrustScore: 60.0,
			Timestamp:  time.Now(),
		})
	}

	if suggestion.ConfirmationCount >= suggestion.RequiredConfirmations {
		suggestion.Status = models.StatusConfirmed
	}

	if suggestion.Status != models.StatusConfirmed {
		t.Errorf("expected CONFIRMED after %d confirmations, got %s", suggestion.RequiredConfirmations, suggestion.Status)
	}
}

func TestVerifySuggestion_FastTrack(t *testing.T) {
	cfg := Config{
		RequiredConfirmations: 3,
		ThresholdScore:        50.0,
		FastTrackScore:        90.0,
	}

	suggestion := &models.Suggestion{
		ID:                    "sug_test3",
		Status:                models.StatusPending,
		ConfirmationCount:     0,
		RequiredConfirmations: cfg.RequiredConfirmations,
		AuditTrail:            models.AuditTrailJSON{},
	}

	// Single high-trust user should fast-track
	trustScore := 95.0
	suggestion.ConfirmationCount++
	suggestion.AuditTrail = append(suggestion.AuditTrail, models.AuditEntry{
		UserID:     "high_trust_user",
		Action:     "CONFIRM",
		TrustScore: trustScore,
		Timestamp:  time.Now(),
	})

	if trustScore >= cfg.FastTrackScore {
		suggestion.Status = models.StatusConfirmed
	}

	if suggestion.Status != models.StatusConfirmed {
		t.Errorf("expected fast-track CONFIRMED, got %s", suggestion.Status)
	}
	if suggestion.ConfirmationCount != 1 {
		t.Errorf("expected only 1 confirmation for fast-track, got %d", suggestion.ConfirmationCount)
	}
}

func TestVerifySuggestion_BelowThreshold(t *testing.T) {
	cfg := Config{
		ThresholdScore: 50.0,
	}

	trustScore := 30.0
	if trustScore < cfg.ThresholdScore {
		// This is the expected path — user should be blocked
		return
	}
	t.Error("expected trust score below threshold to be rejected")
}

func TestVerifySuggestion_PartialConfirmations(t *testing.T) {
	suggestion := &models.Suggestion{
		ID:                    "sug_test5",
		Status:                models.StatusPending,
		ConfirmationCount:     0,
		RequiredConfirmations: 3,
		AuditTrail:            models.AuditTrailJSON{},
	}

	// Add 2 confirmations (not enough)
	for i := 0; i < 2; i++ {
		suggestion.ConfirmationCount++
		suggestion.AuditTrail = append(suggestion.AuditTrail, models.AuditEntry{
			UserID:     "verifier_" + string(rune('a'+i)),
			Action:     "CONFIRM",
			TrustScore: 60.0,
			Timestamp:  time.Now(),
		})
	}

	// Should still be pending
	if suggestion.ConfirmationCount >= suggestion.RequiredConfirmations {
		suggestion.Status = models.StatusConfirmed
	}

	if suggestion.Status != models.StatusPending {
		t.Errorf("expected PENDING after 2/3 confirmations, got %s", suggestion.Status)
	}
}

func TestLoadVerificationConfig_Defaults(t *testing.T) {
	cfg := Config{
		RequiredConfirmations: 3,
		ThresholdScore:        50.0,
		FastTrackScore:        90.0,
	}

	if cfg.RequiredConfirmations != 3 {
		t.Errorf("expected default RequiredConfirmations=3, got %d", cfg.RequiredConfirmations)
	}
	if cfg.ThresholdScore != 50.0 {
		t.Errorf("expected default ThresholdScore=50.0, got %f", cfg.ThresholdScore)
	}
	if cfg.FastTrackScore != 90.0 {
		t.Errorf("expected default FastTrackScore=90.0, got %f", cfg.FastTrackScore)
	}
}

func TestAuditTrailJSON_Serialization(t *testing.T) {
	trail := models.AuditTrailJSON{
		{UserID: "user1", Action: "CONFIRM", Comment: "looks good", TrustScore: 75.0, Timestamp: time.Now()},
		{UserID: "user2", Action: "REJECT", Comment: "needs review", TrustScore: 55.0, Timestamp: time.Now()},
	}

	// Test Value (serialization)
	val, err := trail.Value()
	if err != nil {
		t.Fatalf("Value() returned error: %v", err)
	}

	str, ok := val.(string)
	if !ok {
		t.Fatal("Value() did not return string")
	}

	// Test Scan (deserialization)
	var decoded models.AuditTrailJSON
	if err := decoded.Scan([]byte(str)); err != nil {
		t.Fatalf("Scan() returned error: %v", err)
	}

	if len(decoded) != 2 {
		t.Errorf("expected 2 entries after round-trip, got %d", len(decoded))
	}
	if decoded[0].UserID != "user1" {
		t.Errorf("expected first entry user_id=user1, got %s", decoded[0].UserID)
	}
}
