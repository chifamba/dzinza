package middleware

import (
	"net/http"

	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/gin-gonic/gin"
)

// RBACMiddleware checks if the user has the required role.
func RBACMiddleware(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rolesVal, exists := c.Get(auth.RolesKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		var userRoles []string

		// Handle both []string and []interface{} because jwt lib might parse differently depending on config
		switch v := rolesVal.(type) {
		case []string:
			userRoles = v
		case []interface{}:
			for _, r := range v {
				if s, ok := r.(string); ok {
					userRoles = append(userRoles, s)
				}
			}
		default:
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid roles format"})
			return
		}

		hasRole := false
		for _, role := range userRoles {
			if role == requiredRole {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}
