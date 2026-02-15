package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MarketplaceHandler struct {
	svc service.MarketplaceService
}

func NewMarketplaceHandler(svc service.MarketplaceService) *MarketplaceHandler {
	return &MarketplaceHandler{svc: svc}
}

func (h *MarketplaceHandler) CreateListing(c *gin.Context) {
	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description string  `json:"description" binding:"required"`
		Type        string  `json:"type" binding:"required"`
		Price       float64 `json:"price"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	claims, exists := c.Get("user")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}
	userClaims := claims.(*auth.Claims)
	ownerID, _ := uuid.Parse(userClaims.UserID)

	listing, err := h.svc.CreateListing(c.Request.Context(), ownerID, req.Title, req.Description, req.Type, req.Price)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create listing")
		return
	}

	response.Created(c, listing)
}

func (h *MarketplaceHandler) ListListings(c *gin.Context) {
	listings, err := h.svc.ListListings(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to list listings")
		return
	}
	response.Success(c, listings)
}

func (h *MarketplaceHandler) GetListing(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid listing ID")
		return
	}

	listing, err := h.svc.GetListing(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Listing not found")
		return
	}

	response.Success(c, listing)
}
