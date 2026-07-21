package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"clothing-store/backend/config"

	"github.com/golang-jwt/jwt/v5"
)

// ─────────────────────────────────────────────────────────────
// TEST SETUP HELPERS
// ─────────────────────────────────────────────────────────────

// generateTestToken creates a real, signed JWT for use in tests,
// signed with the same secret AuthMiddleware will use to verify it.
func generateTestToken(t *testing.T, secret string, role string, expired bool) string {
	t.Helper()

	claims := jwt.MapClaims{
		"user_id": 1,
		"role":    role,
	}

	if expired {
		claims["exp"] = time.Now().Add(-1 * time.Hour).Unix() // already expired
	} else {
		claims["exp"] = time.Now().Add(1 * time.Hour).Unix()
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return signed
}

// dummyNextHandler is a stand-in "next" handler. It records whether it
// was actually reached, which is how we verify middleware let the
// request through (or correctly blocked it).
func dummyNextHandler(reached *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*reached = true
		w.WriteHeader(http.StatusOK)
	})
}

// TestMain ensures JWT_SECRET is set BEFORE any test runs, and avoids
// relying on a real .env file being present (config.GetConfig() calls
// log.Fatal if .env is missing, which would kill the whole test binary).
func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-key")
	// Write a throwaway .env so godotenv.Load() inside GetConfig() doesn't
	// call log.Fatal when no real .env exists in this package's directory.
	os.WriteFile(".env", []byte("JWT_SECRET=test-secret-key\n"), 0644)
	code := m.Run()
	os.Remove(".env")
	os.Exit(code)
}

func testSecret() string {
	return config.GetConfig().JWTSecret
}

// ─────────────────────────────────────────────────────────────
// AuthMiddleware TESTS
// ─────────────────────────────────────────────────────────────

func TestAuthMiddleware_MissingAuthorizationHeader(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached with no Authorization header")
	}
}

func TestAuthMiddleware_MalformedAuthorizationHeader(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	req.Header.Set("Authorization", "NotBearerFormat") // missing "Bearer <token>" shape
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached with a malformed header")
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	req.Header.Set("Authorization", "Bearer this.is.not.a.valid.jwt")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached with an invalid token")
	}
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	token := generateTestToken(t, testSecret(), "admin", true) // expired = true

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for expired token, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached with an expired token")
	}
}

func TestAuthMiddleware_ValidToken_PassesThrough(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	token := generateTestToken(t, testSecret(), "admin", false)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !reached {
		t.Error("next handler SHOULD have been reached with a valid token")
	}
}

func TestAuthMiddleware_OptionsRequestPassesThroughForCORS(t *testing.T) {
	reached := false
	handler := AuthMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodOptions, "/api/admin/products", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 for OPTIONS preflight, got %d", rec.Code)
	}
	// Note: per the current implementation, OPTIONS returns 200 directly
	// and does NOT call next — this test documents that actual behavior.
	if reached {
		t.Error("next handler should not be called on OPTIONS requests per current implementation")
	}
}

// ─────────────────────────────────────────────────────────────
// AdminMiddleware TESTS
// ─────────────────────────────────────────────────────────────

// injectClaims simulates what AuthMiddleware would have already put into
// the request context, since AdminMiddleware always runs AFTER AuthMiddleware
// and depends on it having set claims there.
func injectClaims(req *http.Request, claims jwt.MapClaims) *http.Request {
	ctx := context.WithValue(req.Context(), UserKey, claims)
	return req.WithContext(ctx)
}

func TestAdminMiddleware_NoClaimsInContext(t *testing.T) {
	reached := false
	handler := AdminMiddleware(dummyNextHandler(&reached))

	// Simulates AdminMiddleware being hit without AuthMiddleware having run first.
	req := httptest.NewRequest(http.MethodDelete, "/api/admin/products/7", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached with no claims in context")
	}
}

func TestAdminMiddleware_NonAdminRole_Forbidden(t *testing.T) {
	reached := false
	handler := AdminMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/products/7", nil)
	req = injectClaims(req, jwt.MapClaims{"user_id": 5, "role": "customer"})
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for non-admin role, got %d", rec.Code)
	}
	if reached {
		t.Error("next handler should NOT have been reached for a non-admin role")
	}
}

func TestAdminMiddleware_AdminRole_PassesThrough(t *testing.T) {
	reached := false
	handler := AdminMiddleware(dummyNextHandler(&reached))

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/products/7", nil)
	req = injectClaims(req, jwt.MapClaims{"user_id": 1, "role": "admin"})
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 for admin role, got %d", rec.Code)
	}
	if !reached {
		t.Error("next handler SHOULD have been reached for an admin role")
	}
}

// ─────────────────────────────────────────────────────────────
// COMBINED CHAIN TEST — mirrors what actually happens in main.go
// (admin.Use(AuthMiddleware) then admin.Use(AdminMiddleware))
// ─────────────────────────────────────────────────────────────

func TestMiddlewareChain_CustomerCannotDeleteProduct(t *testing.T) {
	reached := false
	// Chain them exactly as main.go does: Auth first, then Admin, then handler.
	handler := AuthMiddleware(AdminMiddleware(dummyNextHandler(&reached)))

	token := generateTestToken(t, testSecret(), "customer", false)

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/products/7", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", rec.Code)
	}
	if reached {
		t.Error("a logged-in customer should NOT be able to reach the delete handler")
	}
}

func TestMiddlewareChain_AdminCanDeleteProduct(t *testing.T) {
	reached := false
	handler := AuthMiddleware(AdminMiddleware(dummyNextHandler(&reached)))

	token := generateTestToken(t, testSecret(), "admin", false)

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/products/7", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if !reached {
		t.Error("an admin SHOULD be able to reach the delete handler")
	}
}
