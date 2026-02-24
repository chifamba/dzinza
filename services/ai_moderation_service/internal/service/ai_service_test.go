package service

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

func TestModerateContent_Profanity(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "This is a damn test.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, cat := range resp.Categories {
		if cat == "profanity" {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("expected profanity category, got %v", resp.Categories)
	}
}

func TestModerateContent_HateSpeech(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "I hate you racist.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, cat := range resp.Categories {
		if cat == "hate_speech" {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("expected hate_speech category, got %v", resp.Categories)
	}

	if !resp.IsFlagged {
		t.Errorf("expected content to be flagged")
	}
}

func TestModerateContent_Clean(t *testing.T) {
	svc := NewAIService()
	req := &models.ModerationRequest{
		Content: "This is a clean message.",
	}

	resp, err := svc.ModerateContent(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.Categories) > 0 {
		t.Errorf("expected no categories, got %v", resp.Categories)
	}

	if resp.IsFlagged {
		t.Errorf("expected content not to be flagged")
	}
}
