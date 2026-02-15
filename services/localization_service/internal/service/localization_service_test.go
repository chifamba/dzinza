package service

import (
	"context"
	"testing"
)

func TestParseShonaName_Simple(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Tendai Chifamba", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "Tendai" {
		t.Errorf("expected GivenName=Tendai, got %s", result.GivenName)
	}
	if result.Surname != "Chifamba" {
		t.Errorf("expected Surname=Chifamba, got %s", result.Surname)
	}
	if result.Culture != "shona" {
		t.Errorf("expected Culture=shona, got %s", result.Culture)
	}
}

func TestParseShonaName_WithTotem(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Tendai Shumba Chifamba", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "Tendai" {
		t.Errorf("expected GivenName=Tendai, got %s", result.GivenName)
	}
	if result.Totem != "Shumba" {
		t.Errorf("expected Totem=Shumba, got %s", result.Totem)
	}
	if result.Surname != "Chifamba" {
		t.Errorf("expected Surname=Chifamba, got %s", result.Surname)
	}
}

func TestParseShonaName_WithHonorific(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Va Tendai Chifamba", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.Honorific != "Va" {
		t.Errorf("expected Honorific=Va, got %s", result.Honorific)
	}
	if result.GivenName != "Tendai" {
		t.Errorf("expected GivenName=Tendai, got %s", result.GivenName)
	}
	if result.Surname != "Chifamba" {
		t.Errorf("expected Surname=Chifamba, got %s", result.Surname)
	}
}

func TestParseShonaName_WithHonorificAndTotem(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Va Tendai Moyo Chifamba", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.Honorific != "Va" {
		t.Errorf("expected Honorific=Va, got %s", result.Honorific)
	}
	if result.GivenName != "Tendai" {
		t.Errorf("expected GivenName=Tendai, got %s", result.GivenName)
	}
	if result.Totem != "Moyo" {
		t.Errorf("expected Totem=Moyo, got %s", result.Totem)
	}
	if result.Surname != "Chifamba" {
		t.Errorf("expected Surname=Chifamba, got %s", result.Surname)
	}
}

func TestParseNdebeleName_WithClanName(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Sipho Ndlovu Ncube", "ndebele")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "Sipho" {
		t.Errorf("expected GivenName=Sipho, got %s", result.GivenName)
	}
	if result.ClanName != "Ndlovu" {
		t.Errorf("expected ClanName=Ndlovu, got %s", result.ClanName)
	}
	if result.Surname != "Ncube" {
		t.Errorf("expected Surname=Ncube, got %s", result.Surname)
	}
}

func TestParseWesternName(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "John Michael Smith", "western")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "John" {
		t.Errorf("expected GivenName=John, got %s", result.GivenName)
	}
	if result.MiddleName != "Michael" {
		t.Errorf("expected MiddleName=Michael, got %s", result.MiddleName)
	}
	if result.Surname != "Smith" {
		t.Errorf("expected Surname=Smith, got %s", result.Surname)
	}
}

func TestParseCulturalName_Empty(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "" {
		t.Errorf("expected empty GivenName for empty input, got %s", result.GivenName)
	}
}

func TestParseCulturalName_SingleName(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Tendai", "shona")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "Tendai" {
		t.Errorf("expected GivenName=Tendai, got %s", result.GivenName)
	}
	if result.Surname != "" {
		t.Errorf("expected empty Surname for single name, got %s", result.Surname)
	}
}

func TestParseCulturalName_DefaultCulture(t *testing.T) {
	svc := &localizationService{}
	result, err := svc.ParseCulturalName(context.Background(), "Jane Doe", "unknown")
	if err != nil {
		t.Fatal(err)
	}

	if result.GivenName != "Jane" {
		t.Errorf("expected GivenName=Jane, got %s", result.GivenName)
	}
	if result.Surname != "Doe" {
		t.Errorf("expected Surname=Doe, got %s", result.Surname)
	}
}
