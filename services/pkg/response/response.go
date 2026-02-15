package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse defines the standard error structure.
type ErrorResponse struct {
	Detail string `json:"detail"`
}

// Success sends a JSON success response.
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// Created sends a JSON created response.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, data)
}

// Error sends a JSON error response following the spec {"detail": "..."}.
func Error(c *gin.Context, status int, message string) {
	c.JSON(status, ErrorResponse{Detail: message})
}

// Paginated sends a JSON paginated response.
func Paginated(c *gin.Context, data interface{}, page, limit, total int64) {
	totalPages := (total + int64(limit) - 1) / int64(limit)
	c.JSON(http.StatusOK, gin.H{
		"data": data,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}
