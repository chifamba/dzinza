package service

import (
	"context"
	"github.com/chifamba/dzinza/services/localization_service/internal/repository"
)

type LocalizationService interface {
	Translate(ctx context.Context, key, locale string) (string, error)
	GetTranslations(ctx context.Context, locale string) (map[string]string, error)
	ParseCulturalName(ctx context.Context, name, cultureCode string) (map[string]string, error)
}

type localizationService struct {
	repo repository.Repository
}

func NewLocalizationService(repo repository.Repository) LocalizationService {
	return &localizationService{repo: repo}
}

func (s *localizationService) Translate(ctx context.Context, key, locale string) (string, error) {
	t, err := s.repo.GetTranslation(ctx, key, locale)
	if err != nil {
		return key, nil // Fallback to key
	}
	return t.Value, nil
}

func (s *localizationService) GetTranslations(ctx context.Context, locale string) (map[string]string, error) {
	list, err := s.repo.ListTranslations(ctx, locale)
	if err != nil {
		return nil, err
	}
	res := make(map[string]string)
	for _, t := range list {
		res[t.Key] = t.Value
	}
	return res, nil
}

func (s *localizationService) ParseCulturalName(ctx context.Context, name, cultureCode string) (map[string]string, error) {
	// Stub for cultural name parsing logic
	// In a real implementation, this would use the patterns from the DB
	return map[string]string{
		"full_name": name,
		"culture":   cultureCode,
	}, nil
}
