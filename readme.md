# 🛍️ Clothing Store E-Commerce Platform
![StyleHub Homepage](screenshots/Home.PNG)

A responsive, full-stack e-commerce web application designed for a modern clothing retail store. This project features a clean user interface for shoppers to browse apparel and a dedicated backend infrastructure to handle server logic.

---

## 🚀 Features

* **Responsive Showcase:** A clean and modern user interface optimized for both desktop and mobile screens.
* **Product Catalog:** Interactive displays for viewing apparel, price tags, and clothing descriptions.
* **Structured Architecture:** Separated frontend and backend layers to maintain clean, scalable code.

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Go (Golang)
* **Version Control:** Git & GitHub

---

## 📁 Project Structure

```text
📁 clothing-store/
│
├── 📁 backend/                       # Go REST API Backend
│   ├── 📁 cmd/main.go                # Application entry point
│   ├── 📁 config/                    # Environment & system configurations
│   └── 📁 internal/                  # Core application logistics (Unexported)
│       ├── 📁 database/              # Database connection pools
│       ├── 📁 handlers/              # HTTP controllers (auth, cart, products, orders)
│       ├── 📁 middleware/            # Auth guards & JWT validation
│       └── 📁 models/                # GORM / SQL data schemas
│
├── 📁 database/migrations/           # SQL database schema generation scripts
│
├── 📁 frontend/                      # Client-Side User Interface
│   ├── 📁 assets/images/             # Static UI assets and product photography
│   ├── 📁 css/                       # Modular UI stylesheets (auth, product, checkout, etc.)
│   ├── 📁 js/                        # Frontend API consumption & state engines
│   ├── 📁 pages/                     # Application views (login, register, search, cart)
│   └── 🌐 index.html                 # Main landing homepage
│
├── ⚙️ .gitignore                     # Git tracking exclusions (excludes backend/.env)
└── 📝 README.md                      # Project documentation

## 🚀 Getting Started

### Prerequisites
- Go 1.21+ installed
- MySQL running locally

### 1. Clone & configure
git clone https://github.com/mazeem0129/e-commerce-clothing-store
cd e-commerce-clothing-store/backend

Create a `.env` file in `backend/` with:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=clothing_store
JWT_SECRET=your_secret_key
SERVER_PORT=8080

### 2. Set up the database
mysql -u root -p -e "CREATE DATABASE clothing_store"
mysql -u root -p clothing_store < ../database/migrations/001_create_tables.sql

### 3. Run the backend
go mod tidy
go run cmd/main.go

Server runs at `http://localhost:8080`. The frontend is served automatically as static files by the Go server itself — no separate frontend setup needed.