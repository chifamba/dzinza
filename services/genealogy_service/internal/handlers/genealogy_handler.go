package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type GenealogyHandler struct {
	svc        service.Service
	dnaService service.DNAService
}

func NewGenealogyHandler(svc service.Service, dnaSvc service.DNAService) *GenealogyHandler {
	return &GenealogyHandler{
		svc:        svc,
		dnaService: dnaSvc,
	}
}

func (h *GenealogyHandler) CreateTree(c *gin.Context) {
	ownerIDStr, exists := c.Get(auth.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	ownerID, _ := uuid.Parse(ownerIDStr.(string))

	var req models.CreateTreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	tree, err := h.svc.CreateTree(c.Request.Context(), ownerID, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, tree)
}

func (h *GenealogyHandler) GetTree(c *gin.Context) {
	id := c.Param("id")
	tree, err := h.svc.GetTree(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *GenealogyHandler) ListUserTrees(c *gin.Context) {
	ownerIDStr, exists := c.Get(auth.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	ownerID, _ := uuid.Parse(ownerIDStr.(string))

	trees, err := h.svc.ListUserTrees(c.Request.Context(), ownerID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, trees)
}

func (h *GenealogyHandler) AddPerson(c *gin.Context) {
	var req models.CreatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	person, err := h.svc.AddPerson(c.Request.Context(), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, person)
}

func (h *GenealogyHandler) GetPerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	person, err := h.svc.GetPerson(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	c.JSON(http.StatusOK, person)
}

func (h *GenealogyHandler) UpdatePerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	var req models.CreatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	person, err := h.svc.UpdatePerson(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, person)
}

func (h *GenealogyHandler) DeletePerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	if err := h.svc.DeletePerson(c.Request.Context(), id); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *GenealogyHandler) CreateRelationship(c *gin.Context) {
	var req models.CreateRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.CreateRelationship(c.Request.Context(), req); err != nil {
		if err == service.ErrCircularReference {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "relationship created"})
}

func (h *GenealogyHandler) ImportGEDCOM(c *gin.Context) {
	treeID := c.Param("id")
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	f, err := file.Open()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer f.Close()

	data := make([]byte, file.Size)
	f.Read(data)

	summary, err := h.svc.ImportGEDCOM(c.Request.Context(), treeID, data)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (h *GenealogyHandler) ListTreePersons(c *gin.Context) {
	id := c.Param("id")
	persons, err := h.svc.ListTreePersons(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, persons)
}

func (h *GenealogyHandler) ListRelationshipsByTree(c *gin.Context) {
	id := c.Param("id")
	rels, err := h.svc.ListRelationshipsByTree(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, rels)
}

func (h *GenealogyHandler) ExportGEDCOM(c *gin.Context) {
	treeID := c.Param("id")
	data, err := h.svc.ExportGEDCOM(c.Request.Context(), treeID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename=tree.ged")
	c.Header("Content-Type", "application/octet-stream")
	c.Data(http.StatusOK, "application/octet-stream", data)
}

// DNA Endpoints

// LinkDNATest godoc
// @Summary Link a DNA test to a person
// @Description Adds a new DNA test record to a person
// @Tags dna
// @Accept json
// @Produce json
// @Param id path string true "Person ID"
// @Param test body models.DNATest true "DNA Test Info"
// @Success 201 {object} models.DNATest
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/dna/persons/{id}/tests [post]
func (h *GenealogyHandler) LinkDNATest(c *gin.Context) {
	personIDStr := c.Param("id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid person ID")
		return
	}

	var test models.DNATest
	if err := c.ShouldBindJSON(&test); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request body")
		return
	}

	err = h.dnaService.LinkDNATest(c.Request.Context(), personID, &test)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to link DNA test")
		return
	}

	response.Created(c, test)
}

// GetDNATests godoc
// @Summary Get DNA tests for a person
// @Description Retrieves all DNA tests linked to a person
// @Tags dna
// @Produce json
// @Param id path string true "Person ID"
// @Success 200 {object} []models.DNATest
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/dna/persons/{id}/tests [get]
func (h *GenealogyHandler) GetDNATests(c *gin.Context) {
	personIDStr := c.Param("id")
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid person ID")
		return
	}

	tests, err := h.dnaService.GetDNATests(c.Request.Context(), personID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to retrieve DNA tests")
		return
	}

	response.Success(c, tests)
}

// SyncDNATest godoc
// @Summary Sync DNA test with provider
// @Description Fetches latest data from the DNA provider API (stub)
// @Tags dna
// @Produce json
// @Param id path string true "Test ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/dna/tests/{id}/sync [post]
func (h *GenealogyHandler) SyncDNATest(c *gin.Context) {
	testIDStr := c.Param("id")
	testID, err := uuid.Parse(testIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid test ID")
		return
	}

	err = h.dnaService.SyncWithProvider(c.Request.Context(), testID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to sync with provider: "+err.Error())
		return
	}

	response.Success(c, gin.H{"message": "DNA test synchronized successfully"})
}
