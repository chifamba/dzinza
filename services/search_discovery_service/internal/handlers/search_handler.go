package handlers

import (
	"net/http"
	"strconv"

	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/service"
	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	searchSvc service.SearchService
}

func NewSearchHandler(searchSvc service.SearchService) *SearchHandler {
	return &SearchHandler{
		searchSvc: searchSvc,
	}
}

func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "Query parameter 'q' is required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	results, err := h.searchSvc.Search(c.Request.Context(), query, nil, page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Search failed")
		return
	}

	response.Success(c, results)
}

func (h *SearchHandler) Initialize(c *gin.Context) {
	if err := h.searchSvc.InitializeIndex(c.Request.Context()); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize index")
		return
	}

	response.Success(c, gin.H{"message": "Index initialized"})
}
