package main

import (
	"fmt"
	"log"
	"net/http"

	"clothing-store/backend/config"
	"clothing-store/backend/internal/database"
	"clothing-store/backend/internal/handlers"
	"clothing-store/backend/internal/middleware"

	"github.com/gorilla/mux"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		// If it's a preflight OPTIONS request, answer immediately and stop processing
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := config.GetConfig()
	database.Connect()

	router := mux.NewRouter()

	// Apply CORS middleware globally to catch all incoming routing steps
	router.Use(corsMiddleware)

	api := router.PathPrefix("/api").Subrouter()

	// ─── Public Routes ───────────────────────────────────────
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Server is running and database is connected!")
	}).Methods("GET", "OPTIONS")

	api.HandleFunc("/register", handlers.Register).Methods("POST", "OPTIONS")
	api.HandleFunc("/login", handlers.Login).Methods("POST", "OPTIONS")
	api.HandleFunc("/products", handlers.GetProducts).Methods("GET", "OPTIONS")
	api.HandleFunc("/products/{id}", handlers.GetProduct).Methods("GET", "OPTIONS")
	api.HandleFunc("/checkout", handlers.Checkout).Methods("POST", "OPTIONS")

	// ─── Protected Routes ─────────────────────────────────────
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	protected.HandleFunc("/cart/{user_id}", handlers.GetCart).Methods("GET", "OPTIONS")
	protected.HandleFunc("/cart", handlers.AddToCart).Methods("POST", "OPTIONS")
	protected.HandleFunc("/cart/{id}", handlers.RemoveFromCart).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/cart/{id}", handlers.UpdateCartQuantity).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/orders/{user_id}", handlers.GetOrders).Methods("GET", "OPTIONS")
	protected.HandleFunc("/orders/{id}", handlers.GetOrder).Methods("GET", "OPTIONS")
	protected.HandleFunc("/orders/{id}/cancel", handlers.CancelOrder).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/returns", handlers.RequestReturn).Methods("POST", "OPTIONS")
	protected.HandleFunc("/returns/{user_id}", handlers.GetUserReturns).Methods("GET", "OPTIONS")
	protected.HandleFunc("/addresses/{user_id}", handlers.GetAddresses).Methods("GET", "OPTIONS")
	protected.HandleFunc("/addresses", handlers.AddAddress).Methods("POST", "OPTIONS")
	protected.HandleFunc("/addresses/{id}", handlers.UpdateAddress).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/addresses/{id}", handlers.DeleteAddress).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/users/{id}", handlers.UpdateProfile).Methods("PUT", "OPTIONS")

	// ─── Admin Routes ─────────────────────────────────────────
	admin := api.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.AuthMiddleware)
	admin.Use(middleware.AdminMiddleware)

	admin.HandleFunc("/products", handlers.CreateProduct).Methods("POST", "OPTIONS")
	admin.HandleFunc("/products/{id}", handlers.UpdateProduct).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/products/{id}", handlers.DeleteProduct).Methods("DELETE", "OPTIONS")
	admin.HandleFunc("/orders", handlers.GetAllOrders).Methods("GET", "OPTIONS")
	admin.HandleFunc("/orders/{id}", handlers.UpdateOrderStatus).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/users", handlers.GetAllUsers).Methods("GET", "OPTIONS")
	admin.HandleFunc("/returns", handlers.GetAllReturns).Methods("GET", "OPTIONS")
	admin.HandleFunc("/returns/{id}", handlers.UpdateReturnStatus).Methods("PUT", "OPTIONS")

	// ─── Serve Frontend (Static Files) ─────────────────────────
	frontendDir := "../frontend"
	fileServer := http.FileServer(http.Dir(frontendDir))
	router.PathPrefix("/").Handler(fileServer)

	port := cfg.ServerPort
	if port != "" && port[0] != ':' {
		port = ":" + port
	}

	fmt.Println("Server starting on port", cfg.ServerPort)
	log.Fatal(http.ListenAndServe(port, router))
}