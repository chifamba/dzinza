package service

import (
	"context"
	"strings"
	"testing"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

func TestModerateContent_Clean(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "This is a clean message about genealogy.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.IsFlagged {
		t.Error("expected clean content to not be flagged")
	}
	if resp.Score > 0.0 {
		t.Errorf("expected clean content score 0.0, got %f", resp.Score)
	}
}

func TestModerateContent_Profanity(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "What the hell is this crap?",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// hell (0.2) + crap (0.2) = 0.4
	// matchCount = 2
	// normalized = 0.4 / 3 = 0.133...
	// Not flagged because threshold is 0.4

	if len(resp.Categories) == 0 {
		t.Error("expected profanity category detection")
	}

	found := false
	for _, cat := range resp.Categories {
		if cat == "profanity" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected profanity category")
	}
}

func TestModerateContent_HateSpeech_Flagged(t *testing.T) {
	svc := NewAIService()
	// hate (0.6) + racist (0.8) = 1.4. Match count 2.
	// Normalized = 1.4 / 3 = 0.466
	// Threshold > 0.4, so it should be flagged.
	req := &models.ModerationRequest{
		Content: "I hate this racist behavior.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !resp.IsFlagged {
		t.Error("expected hate speech to be flagged")
	}

	if !strings.Contains(resp.Reason, "hate_speech") {
		t.Errorf("expected reason to contain hate_speech, got %s", resp.Reason)
	}
}

func TestModerateContent_Spam(t *testing.T) {
	svc := NewAIService()
	// "congratulations you won free money"
	// congratulations you won (0.8) + free money (0.7) = 1.5
	// Matches = 2. Denom = 3. 1.5/3 = 0.5. Flagged.
	req := &models.ModerationRequest{
		Content: "Congratulations you won free money!",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !resp.IsFlagged {
		t.Error("expected spam to be flagged")
	}

	found := false
	for _, cat := range resp.Categories {
		if cat == "spam" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected spam category")
	}
}
