package service

import (
	"context"
	"fmt"
	"regexp"

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
	pattern, err := s.repo.GetCulturalNamePattern(ctx, cultureCode)
	if err != nil {
		// Fallback if pattern not found
		return map[string]string{
			"full_name": name,
			"culture":   cultureCode,
			"parsed":    "false",
		}, nil
	}

	re, err := regexp.Compile(pattern.Pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid regex pattern for culture %s: %w", cultureCode, err)
	}

	matches := re.FindStringSubmatch(name)
	if matches == nil {
		return map[string]string{
			"full_name": name,
			"culture":   cultureCode,
			"parsed":    "false",
		}, nil
	}

	result := make(map[string]string)
	result["culture"] = cultureCode
	result["full_name"] = name
	result["parsed"] = "true"

	names := re.SubexpNames()
	for i, match := range matches {
		if i != 0 && names[i] != "" {
			result[names[i]] = match
		}
	}

	return result, nil
}
