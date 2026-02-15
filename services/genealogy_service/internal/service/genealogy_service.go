package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/repository"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/elliotchance/gedcom"
	"github.com/google/uuid"
)

var (
	ErrCircularReference = errors.New("circular reference detected")
	ErrTreeNotFound      = errors.New("tree not found")
	ErrPersonNotFound    = errors.New("person not found")
)

type genealogyService struct {
	repo     repository.Repository
	eventBus events.Bus
}

func NewGenealogyService(repo repository.Repository, eventBus events.Bus) Service {
	return &genealogyService{
		repo:     repo,
		eventBus: eventBus,
	}
}

func (s *genealogyService) CreateTree(ctx context.Context, ownerID uuid.UUID, req models.CreateTreeRequest) (*models.FamilyTree, error) {
	tree := &models.FamilyTree{
		ID:           uuid.New().String(),
		OwnerID:      ownerID,
		Name:         req.Name,
		Description:  req.Description,
		PrivacyLevel: req.PrivacyLevel,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateTree(ctx, tree); err != nil {
		return nil, err
	}
	return tree, nil
}

func (s *genealogyService) GetTree(ctx context.Context, id string) (*models.FamilyTree, error) {
	tree, err := s.repo.GetTreeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if tree == nil {
		return nil, ErrTreeNotFound
	}
	return tree, nil
}

func (s *genealogyService) ListUserTrees(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error) {
	return s.repo.ListTreesByOwner(ctx, ownerID)
}

func (s *genealogyService) AddPerson(ctx context.Context, req models.CreatePersonRequest) (*models.Person, error) {
	person := &models.Person{
		ID:                uuid.New(),
		PrimaryName:       req.PrimaryName,
		Gender:            req.Gender,
		BirthDateString:   req.BirthDateString,
		BirthPlace:        req.BirthPlace,
		IsLiving:          req.IsLiving,
		Biography:         req.Biography,
		Clan:              req.Clan,
		Tribe:             req.Tribe,
		TraditionalTitles: req.TraditionalTitles,
		TreeID:            req.TreeID,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.repo.CreatePerson(ctx, person); err != nil {
		return nil, err
	}

	if err := s.eventBus.Publish(ctx, events.PersonCreated, events.PersonCreatedPayload{
		PersonID:  person.ID.String(),
		TreeID:    person.TreeID,
		Name:      fmt.Sprintf("%s %s", person.PrimaryName.GivenName, person.PrimaryName.Surname),
		Timestamp: time.Now().Unix(),
	}); err != nil {
		slog.Error("failed to publish person created event", slog.Any("error", err))
	}

	return person, nil
}

func (s *genealogyService) GetPerson(ctx context.Context, id uuid.UUID) (*models.Person, error) {
	person, err := s.repo.GetPersonByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if person == nil {
		return nil, ErrPersonNotFound
	}
	return person, nil
}

func (s *genealogyService) UpdatePerson(ctx context.Context, id uuid.UUID, req models.CreatePersonRequest) (*models.Person, error) {
	person, err := s.repo.GetPersonByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if person == nil {
		return nil, ErrPersonNotFound
	}

	person.PrimaryName = req.PrimaryName
	person.Gender = req.Gender
	person.BirthDateString = req.BirthDateString
	person.BirthPlace = req.BirthPlace
	person.IsLiving = req.IsLiving
	person.Biography = req.Biography
	person.Clan = req.Clan
	person.Tribe = req.Tribe
	person.TraditionalTitles = req.TraditionalTitles
	person.UpdatedAt = time.Now()

	if err := s.repo.UpdatePerson(ctx, person); err != nil {
		return nil, err
	}

	// Publish event
	_ = s.eventBus.Publish(ctx, events.PersonUpdated, events.PersonUpdatedPayload{
		PersonID:  person.ID.String(),
		Timestamp: time.Now().Unix(),
	})

	return person, nil
}

func (s *genealogyService) DeletePerson(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeletePerson(ctx, id)
}

func (s *genealogyService) ListTreePersons(ctx context.Context, treeID string) ([]models.Person, error) {
	return s.repo.ListPersonsByTree(ctx, treeID)
}

func (s *genealogyService) CreateRelationship(ctx context.Context, req models.CreateRelationshipRequest) error {
	p1, _ := uuid.Parse(req.Person1ID)
	p2, _ := uuid.Parse(req.Person2ID)

	// Check for circular reference
	circular, err := s.repo.CheckCircularReference(ctx, p1, p2, req.Type)
	if err != nil {
		return err
	}
	if circular {
		return ErrCircularReference
	}

	if err := s.repo.CreateRelationship(ctx, p1, p2, req.Type, req.Metadata); err != nil {
		return err
	}

	// Publish event
	_ = s.eventBus.Publish(ctx, events.RelationshipCreated, events.RelationshipCreatedPayload{
		RelationshipID: uuid.New().String(), // We don't have a specific ID for Neo4j edges easily, generating one for the event
		Type:           req.Type,
		Person1ID:      req.Person1ID,
		Person2ID:      req.Person2ID,
	})

	return nil
}

func (s *genealogyService) DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error {
	return s.repo.DeleteRelationship(ctx, p1, p2, relType)
}

func (s *genealogyService) ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error) {
	return s.repo.ListRelationshipsByTree(ctx, treeID)
}

func (s *genealogyService) ImportGEDCOM(ctx context.Context, treeID string, data []byte) (*models.ImportSummary, error) {
	g, err := gedcom.NewDecoder(bytes.NewReader(data)).Decode()
	if err != nil {
		return nil, fmt.Errorf("failed to decode gedcom: %w", err)
	}

	summary := &models.ImportSummary{
		Warnings: []string{},
	}

	// Map GEDCOM XREF to Person UUID
	xrefMap := make(map[string]uuid.UUID)

	// 1. Create Persons
	for _, indi := range g.Individuals() {
		gender := "UNKNOWN"
		if indi.Sex() != nil {
			if indi.Sex().IsMale() {
				gender = "MALE"
			} else if indi.Sex().IsFemale() {
				gender = "FEMALE"
			}
		}

		givenName := ""
		surname := ""
		if indi.Name() != nil {
			givenName = indi.Name().GivenName()
			surname = indi.Name().Surname()
		}

		bDateNode, bPlaceNode := indi.Birth()
		bDate := ""
		bPlace := ""
		if bDateNode != nil {
			bDate = bDateNode.Value()
		}
		if bPlaceNode != nil {
			bPlace = bPlaceNode.Value()
		}

		dDateNode, _ := indi.Death()

		person := &models.Person{
			ID: uuid.New(),
			PrimaryName: models.Name{
				GivenName: givenName,
				Surname:   surname,
			},
			Gender:          gender,
			BirthDateString: bDate,
			BirthPlace:      bPlace,
			IsLiving:        dDateNode == nil,
			TreeID:          treeID,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		if err := s.repo.CreatePerson(ctx, person); err != nil {
			summary.Warnings = append(summary.Warnings, fmt.Sprintf("failed to create person %s: %s", indi.Pointer(), err))
			continue
		}
		xrefMap[indi.Pointer()] = person.ID
		summary.PersonsCreated++
	}

	// 2. Create Relationships
	for _, fam := range g.Families() {
		husband := fam.Husband()
		wife := fam.Wife()

		// Spouse relationship
		if husband != nil && wife != nil {
			hID, ok1 := xrefMap[husband.Pointer()]
			wID, ok2 := xrefMap[wife.Pointer()]
			if ok1 && ok2 {
				if err := s.repo.CreateRelationship(ctx, hID, wID, models.RelSpouseOf, nil); err == nil {
					summary.RelationshipsCreated++
				}
			}
		}

		// Parent-Child relationships
		var parents []uuid.UUID
		if husband != nil {
			if id, ok := xrefMap[husband.Pointer()]; ok {
				parents = append(parents, id)
			}
		}
		if wife != nil {
			if id, ok := xrefMap[wife.Pointer()]; ok {
				parents = append(parents, id)
			}
		}

		for _, child := range fam.Children() {
			cID, okC := xrefMap[child.Pointer()]
			if !okC {
				continue
			}
			for _, pID := range parents {
				if err := s.repo.CreateRelationship(ctx, pID, cID, models.RelParentOf, nil); err == nil {
					summary.RelationshipsCreated++
				}
			}
		}
	}

	return summary, nil
}

func (s *genealogyService) ExportGEDCOM(ctx context.Context, treeID string) ([]byte, error) {
	persons, err := s.repo.ListPersonsByTree(ctx, treeID)
	if err != nil {
		return nil, err
	}

	rels, err := s.repo.ListRelationshipsByTree(ctx, treeID)
	if err != nil {
		return nil, err
	}

	doc := gedcom.NewDocument()
	indiNodes := make(map[uuid.UUID]*gedcom.IndividualNode)
	personMap := make(map[uuid.UUID]models.Person)

	for i, p := range persons {
		ptr := fmt.Sprintf("I%d", i+1)
		personMap[p.ID] = p
		indi := doc.AddIndividual(ptr)
		indiNodes[p.ID] = indi
		indi.AddName(fmt.Sprintf("%s /%s/", p.PrimaryName.GivenName, p.PrimaryName.Surname))
		
		sex := "U"
		if p.Gender == "MALE" {
			sex = "M"
		} else if p.Gender == "FEMALE" {
			sex = "F"
		}
		indi.SetSex(sex)

		if p.BirthDateString != "" {
			indi.AddBirthDate(p.BirthDateString)
		}
	}

	// Group children by their parents to create FAM records
	type famGroup struct {
		husband  uuid.UUID
		wife     uuid.UUID
		children []uuid.UUID
	}
	
	// Map of parent pair to family group
	// We use a string key "uuid1:uuid2" where uuid1 < uuid2
	familyMap := make(map[string]*famGroup)

	// 1. Process spouses
	for _, r := range rels {
		if r.Type == models.RelSpouseOf {
			p1, p2 := r.Person1ID, r.Person2ID
			key := getFamilyKey(p1, p2)
			if _, ok := familyMap[key]; !ok {
				fg := &famGroup{}
				// Assign husband/wife based on gender
				if personMap[p1].Gender == "FEMALE" {
					fg.wife = p1
					fg.husband = p2
				} else {
					fg.husband = p1
					fg.wife = p2
				}
				familyMap[key] = fg
			}
		}
	}

	// 2. Process children
	for _, r := range rels {
		if r.Type == models.RelParentOf {
			parentID := r.Person1ID
			childID := r.Person2ID

			// Find if this parent has a spouse to form a family
			foundFamily := false
			for _, r2 := range rels {
				if r2.Type == models.RelSpouseOf && (r2.Person1ID == parentID || r2.Person2ID == parentID) {
					spouseID := r2.Person2ID
					if r2.Person2ID == parentID {
						spouseID = r2.Person1ID
					}

					key := getFamilyKey(parentID, spouseID)
					if fg, ok := familyMap[key]; ok {
						// Add child to this family if not already there
						childExists := false
						for _, cid := range fg.children {
							if cid == childID {
								childExists = true
								break
							}
						}
						if !childExists {
							fg.children = append(fg.children, childID)
						}
						foundFamily = true
					}
				}
			}

			// If no spouse family found, add to single-parent family
			if !foundFamily {
				key := parentID.String() + ":"
				if fg, ok := familyMap[key]; ok {
					childExists := false
					for _, cid := range fg.children {
						if cid == childID {
							childExists = true
							break
						}
					}
					if !childExists {
						fg.children = append(fg.children, childID)
					}
				} else {
					fg := &famGroup{children: []uuid.UUID{childID}}
					if personMap[parentID].Gender == "FEMALE" {
						fg.wife = parentID
					} else {
						fg.husband = parentID
					}
					familyMap[key] = fg
				}
			}
		}
	}

	// Add families to document
	famCount := 1
	for _, fg := range familyMap {
		famPtr := fmt.Sprintf("F%d", famCount)
		famCount++
		fam := doc.AddFamily(famPtr)
		
		if fg.husband != uuid.Nil {
			fam.SetHusband(indiNodes[fg.husband])
		}
		if fg.wife != uuid.Nil {
			fam.SetWife(indiNodes[fg.wife])
		}
		for _, cID := range fg.children {
			fam.AddChild(indiNodes[cID])
		}
	}

	return []byte(doc.String()), nil
}

func getFamilyKey(p1, p2 uuid.UUID) string {
	if p1.String() < p2.String() {
		return p1.String() + ":" + p2.String()
	}
	return p2.String() + ":" + p1.String()
}
