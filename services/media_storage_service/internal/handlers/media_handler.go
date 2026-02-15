package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MediaHandler struct {
	svc service.Service
}

func NewMediaHandler(svc service.Service) *MediaHandler {
	return &MediaHandler{svc: svc}
}

func (h *MediaHandler) UploadMedia(c *gin.Context) {
	userIDStr, exists := c.Get(auth.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, _ := uuid.Parse(userIDStr.(string))

	personIDStr := c.PostForm("person_id")
	if personIDStr == "" {
		response.Error(c, http.StatusBadRequest, "person_id is required")
		return
	}
	personID, err := uuid.Parse(personIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person_id")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	f, err := file.Open()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to open file")
		return
	}
	defer f.Close()

	media, err := h.svc.UploadMedia(c.Request.Context(), userID, personID, file.Filename, file.Header.Get("Content-Type"), file.Size, f)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	url, _ := h.svc.GetMediaURL(c.Request.Context(), media.ID)

	c.JSON(http.StatusCreated, models.UploadMediaResponse{
		ID:       media.ID.String(),
		Filename: media.Filename,
		URL:      url,
	})
}

func (h *MediaHandler) GetMedia(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	url, err := h.svc.GetMediaURL(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (h *MediaHandler) DeleteMedia(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	if err := h.svc.DeleteMedia(c.Request.Context(), id); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *MediaHandler) ListPersonMedia(c *gin.Context) {
	personID, err := uuid.Parse(c.Param("person_id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid person ID")
		return
	}

	media, err := h.svc.ListPersonMedia(c.Request.Context(), personID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, media)
}
