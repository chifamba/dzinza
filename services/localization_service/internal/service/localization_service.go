package service

import (
	"context"
	"log/slog"
	"strings"
	"unicode"

	"github.com/chifamba/dzinza/services/localization_service/internal/models"
	"github.com/chifamba/dzinza/services/localization_service/internal/repository"
)

// LocalizationService defines the interface for localization operations.
type LocalizationService interface {
	GetTranslation(ctx context.Context, key, locale string) (*models.Translation, error)
	GetTranslations(ctx context.Context, locale string) ([]models.Translation, error)
	ParseCulturalName(ctx context.Context, fullName, culture string) (*models.ParsedCulturalName, error)
}

type localizationService struct {
	repo repository.Repository
}

// NewLocalizationService creates a new localization service.
func NewLocalizationService(repo repository.Repository) LocalizationService {
	return &localizationService{repo: repo}
}

func (s *localizationService) GetTranslation(ctx context.Context, key, locale string) (*models.Translation, error) {
	return s.repo.GetTranslation(ctx, key, locale)
}

func (s *localizationService) GetTranslations(ctx context.Context, locale string) ([]models.Translation, error) {
	return s.repo.ListTranslations(ctx, locale)
}

// ParseCulturalName parses a full name according to cultural naming conventions.
//
// Supported cultures:
//   - "shona": Shona naming (given + totem/mutupo + surname)
//   - "ndebele": Ndebele naming (given + clan name + surname)
//   - "western": Standard Western naming (given + middle + surname)
//   - "default": Falls back to simple whitespace split
func (s *localizationService) ParseCulturalName(ctx context.Context, fullName, culture string) (*models.ParsedCulturalName, error) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return &models.ParsedCulturalName{}, nil
	}

	culture = strings.ToLower(culture)

	switch culture {
	case "shona":
		return s.parseShonaName(fullName), nil
	case "ndebele":
		return s.parseNdebeleName(fullName), nil
	case "western":
		return s.parseWesternName(fullName), nil
	default:
		slog.Info("unknown culture, using default parsing", slog.String("culture", culture))
		return s.parseDefaultName(fullName), nil
	}
}

// parseShonaName parses a Shona name.
// Shona naming convention:
//   - Given name (zita)
//   - Optional: Totem/Mutupo (e.g., Shumba, Moyo, Gumbo, Hungwe)
//   - Surname
//
// Prefixes like "va" (honorific) are handled.
// Common totems are recognized and placed in the Totem field.
func (s *localizationService) parseShonaName(fullName string) *models.ParsedCulturalName {
	parts := splitName(fullName)
	result := &models.ParsedCulturalName{
		Culture:  "shona",
		FullName: fullName,
	}

	if len(parts) == 0 {
		return result
	}

	// Handle "va" honorific prefix
	startIdx := 0
	if len(parts) > 1 && strings.EqualFold(parts[0], "va") {
		result.Honorific = "Va"
		startIdx = 1
	}

	remaining := parts[startIdx:]

	switch len(remaining) {
	case 1:
		result.GivenName = remaining[0]
	case 2:
		result.GivenName = remaining[0]
		result.Surname = remaining[1]
	default:
		// 3+ parts: check if middle part is a known totem
		result.GivenName = remaining[0]
		result.Surname = remaining[len(remaining)-1]

		// Check middle parts for known totems
		for _, middle := range remaining[1 : len(remaining)-1] {
			if isShonaTotem(middle) {
				result.Totem = middle
			} else if result.MiddleName == "" {
				result.MiddleName = middle
			} else {
				result.MiddleName += " " + middle
			}
		}
	}

	return result
}

// parseNdebeleName parses an Ndebele name.
// Ndebele naming convention:
//   - Given name (igama)
//   - Optional: Clan name (isibongo)
//   - Surname
//
// Common Ndebele clan names: Ndlovu, Mthethwa, Khumalo, Dube, Ncube, Sibanda, Moyo
func (s *localizationService) parseNdebeleName(fullName string) *models.ParsedCulturalName {
	parts := splitName(fullName)
	result := &models.ParsedCulturalName{
		Culture:  "ndebele",
		FullName: fullName,
	}

	if len(parts) == 0 {
		return result
	}

	switch len(parts) {
	case 1:
		result.GivenName = parts[0]
	case 2:
		result.GivenName = parts[0]
		result.Surname = parts[1]
	default:
		result.GivenName = parts[0]
		result.Surname = parts[len(parts)-1]

		// Check middle parts for clan names
		for _, middle := range parts[1 : len(parts)-1] {
			if isNdebeleClanName(middle) {
				result.ClanName = middle
			} else if result.MiddleName == "" {
				result.MiddleName = middle
			} else {
				result.MiddleName += " " + middle
			}
		}
	}

	return result
}

// parseWesternName parses a standard Western name.
func (s *localizationService) parseWesternName(fullName string) *models.ParsedCulturalName {
	parts := splitName(fullName)
	result := &models.ParsedCulturalName{
		Culture:  "western",
		FullName: fullName,
	}

	if len(parts) == 0 {
		return result
	}

	switch len(parts) {
	case 1:
		result.GivenName = parts[0]
	case 2:
		result.GivenName = parts[0]
		result.Surname = parts[1]
	default:
		result.GivenName = parts[0]
		result.Surname = parts[len(parts)-1]
		result.MiddleName = strings.Join(parts[1:len(parts)-1], " ")
	}

	return result
}

// parseDefaultName is a simple fallback parser.
func (s *localizationService) parseDefaultName(fullName string) *models.ParsedCulturalName {
	return s.parseWesternName(fullName)
}

// splitName splits a name string into parts, handling extra whitespace.
func splitName(name string) []string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}

	var parts []string
	for _, p := range strings.Fields(name) {
		cleaned := strings.TrimFunc(p, func(r rune) bool {
			return unicode.IsPunct(r)
		})
		if cleaned != "" {
			parts = append(parts, cleaned)
		}
	}
	return parts
}

// Common Shona totems (mutupo)
var shonaTotemSet = map[string]bool{
	"shumba":   true, // lion
	"moyo":     true, // heart
	"gumbo":    true, // leg
	"hungwe":   true, // fish eagle
	"shava":    true, // eland
	"mhofu":    true, // eland
	"nzou":     true, // elephant
	"dziva":    true, // pool
	"ngara":    true, // porcupine
	"tembo":    true, // zebra
	"mbizi":    true, // zebra
	"nyathi":   true, // buffalo
	"chirandu": true,
	"dube":     true,
	"mhara":    true, // impala
	"soko":     true, // monkey
}

func isShonaTotem(name string) bool {
	return shonaTotemSet[strings.ToLower(name)]
}

// Common Ndebele clan names (isibongo)
var ndebeleClanSet = map[string]bool{
	"ndlovu":   true,
	"mthethwa": true,
	"khumalo":  true,
	"dube":     true,
	"ncube":    true,
	"sibanda":  true,
	"moyo":     true,
	"mpofu":    true,
	"nyathi":   true,
	"nkomo":    true,
	"dlodlo":   true,
	"tshuma":   true,
	"ngwenya":  true,
	"mhlanga":  true,
}

func isNdebeleClanName(name string) bool {
	return ndebeleClanSet[strings.ToLower(name)]
}
