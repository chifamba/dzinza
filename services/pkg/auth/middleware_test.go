package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "testsecret"

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": "123",
		"roles":   []interface{}{"admin"}, // Use interface{} because JSON numbers are float64 by default, but here it's string. JWT lib handles it.
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte(secret))

	r := gin.New()
	r.Use(AuthMiddleware(secret))
	r.GET("/test", func(c *gin.Context) {
		userID, _ := c.Get(UserIDKey)
		if userID != "123" {
			c.String(http.StatusUnauthorized, "userid mismatch")
			return
		}
		c.String(http.StatusOK, "ok")
	})

	// Valid token
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %d. Body: %s", w.Code, w.Body.String())
	}

	// Invalid token
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status Unauthorized, got %d", w.Code)
	}
}
