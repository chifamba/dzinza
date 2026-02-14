package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheckHandler returns a gin handler that responds with status ok.
func HealthCheckHandler(serviceName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": serviceName,
		})
	}
}
