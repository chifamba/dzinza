package service

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

func TestModerateContent_Clean(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "Hi world, this is a clean text.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.IsFlagged {
		t.Errorf("expected clean content to not be flagged")
	}
	if resp.Score > 0 {
		t.Errorf("expected score 0, got %f", resp.Score)
	}
}

func TestModerateContent_Profanity(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "This is a damn test.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.Categories) == 0 {
		t.Errorf("expected categories to be detected")
	}
}

func TestModerateContent_HateSpeech(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "I hate racist bigots.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !resp.IsFlagged {
		t.Errorf("expected hate speech to be flagged, score: %f", resp.Score)
	}
}
