// ─── CHECK ADMIN ACCESS ───────────────────────────────────
function checkAdminAccess() {
  const user = getUser();
  if (!user || user.role !== "admin") {
    window.location.href = "../index.html";
    return;
  }
  document.getElementById("admin-user-name").textContent = user.name;
}

// ─── LOAD DASHBOARD STATS ─────────────────────────────────
async function loadDashboardStats() {
  try {
    // Load products count
    const productsRes = await fetchWithAuth(`${API_URL}/products`);
    const products = await productsRes.json();
    document.getElementById("total-products").textContent = products
      ? products.length
      : 0;

    // Load users (admin endpoint)
    const usersRes = await fetchWithAuth(`${API_URL}/admin/users`);
    if (usersRes.ok) {
      const users = await usersRes.json();
      document.getElementById("total-users").textContent = users
        ? users.length
        : 0;
    }

    // Load orders (admin endpoint)
    const ordersRes = await fetchWithAuth(`${API_URL}/admin/orders`);
    if (ordersRes.ok) {
      const orders = await ordersRes.json();
      document.getElementById("total-orders").textContent = orders
        ? orders.length
        : 0;

      // Calculate revenue
      if (orders && orders.length > 0) {
        const completedOrders = orders.filter(
          (order) => order.status === "delivered",
        );
        const revenue = completedOrders.reduce(
          (sum, order) => sum + order.total_amount,
          0,
        );
        // const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        document.getElementById("total-revenue").textContent =
          `$${revenue.toFixed(2)}`;

        // Load recent orders
        loadRecentOrders(orders.slice(0, 5));
      }
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// ─── LOAD RECENT ORDERS ───────────────────────────────────
function loadRecentOrders(orders) {
  const tbody = document.getElementById("recent-orders-body");

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No orders yet</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map((order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      return `
          <tr>
              <td>#${order.id.toString().padStart(6, "0")}</td>
              <td>${order.user_id !== null ? "User #" + order.user_id : "Guest"}</td>
              <td>$${order.total_amount.toFixed(2)}</td>
              <td><span class="order-status ${order.status}">${order.status}</span></td>
              <td>${date}</td>
          </tr>
      `;
    })
    .join("");
}

// ─── LOAD PRODUCTS TABLE ──────────────────────────────────
async function loadProductsTable() {
  const tbody = document.getElementById("products-table-body");

  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();

    if (!products || products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-loading">No products found</td></tr>`;
      return;
    }

    tbody.innerHTML = products
      .map(
        (product) => `
            <tr>
                <td>#${product.id}</td>
                <td>
                    <img src="${product.image_url || "../assets/images/placeholder.jpg"}"
                         alt="${product.name}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                </td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit"
                            onclick="openEditProductModal(${JSON.stringify(product).replace(/"/g, "&quot;")})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete"
                            onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading">Error loading products</td></tr>`;
  }
}

// ─── LOAD ORDERS TABLE ────────────────────────────────────
async function loadOrdersTable() {
  const tbody = document.getElementById("orders-table-body");

  try {
    const response = await fetchWithAuth(`${API_URL}/admin/orders`);
    const orders = await response.json();

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-loading">No orders found</td></tr>`;
      return;
    }

    tbody.innerHTML = orders
      .map((order) => {
        const date = new Date(order.created_at).toLocaleDateString();
        return `
            <tr>
                <td>#${order.id.toString().padStart(6, "0")}</td>
                <td>${order.user_id !== null ? "User #" + order.user_id : "Guest"}</td>
                <td>$${order.total_amount.toFixed(2)}</td>
                <td><span class="order-status ${order.status}">${order.status}</span></td>
                <td>${date}</td>
                <td>
                    <select class="sort-select" style="padding:5px;font-size:12px;"
                        onchange="updateOrderStatus(${order.id}, this.value)">
                        <option ${order.status === "pending" ? "selected" : ""}>pending</option>
                        <option ${order.status === "processing" ? "selected" : ""}>processing</option>
                        <option ${order.status === "shipped" ? "selected" : ""}>shipped</option>
                        <option ${order.status === "delivered" ? "selected" : ""}>delivered</option>
                        <option ${order.status === "cancelled" ? "selected" : ""}>cancelled</option>
                    </select>
                </td>
            </tr>
        `;
      })
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Error loading orders</td></tr>`;
  }
}

// ─── LOAD USERS TABLE ─────────────────────────────────────
async function loadUsersTable() {
  const tbody = document.getElementById("users-table-body");

  try {
    const response = await fetchWithAuth(`${API_URL}/admin/users`);
    const users = await response.json();

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No users found</td></tr>`;
      return;
    }

    tbody.innerHTML = users
      .map((user) => {
        const date = new Date(user.created_at).toLocaleDateString();
        return `
          <tr>
              <td>#${user.id}</td>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td><span class="order-status ${user.role}">${user.role}</span></td>
              <td>${date}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Error loading users</td></tr>`;
  }
}

// ─── PRODUCT MODAL ────────────────────────────────────────
function openAddProductModal() {
  document.getElementById("modal-title").textContent = "Add Product";
  document.getElementById("product-id").value = "";
  document.getElementById("product-name").value = "";
  document.getElementById("product-description").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-stock").value = "";
  document.getElementById("product-category").value = "men";
  document.getElementById("product-image").value = "";
  document.getElementById("product-modal").classList.add("active");
}

function openEditProductModal(product) {
  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("product-id").value = product.id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-description").value = product.description;
  document.getElementById("product-price").value = product.price;
  document.getElementById("product-stock").value = product.stock;
  document.getElementById("product-category").value = product.category;
  document.getElementById("product-image").value = product.image_url;
  document.getElementById("product-modal").classList.add("active");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("active");
}

// ─── SAVE PRODUCT ─────────────────────────────────────────
async function saveProduct() {
  const id = document.getElementById("product-id").value;
  const productData = {
    name: document.getElementById("product-name").value.trim(),
    description: document.getElementById("product-description").value.trim(),
    price: parseFloat(document.getElementById("product-price").value),
    stock: parseInt(document.getElementById("product-stock").value),
    category: document.getElementById("product-category").value,
    image_url: document.getElementById("product-image").value.trim(),
  };

  if (!productData.name || !productData.price) {
    showNotification("Please fill in required fields!", "error");
    return;
  }

  try {
    let response;
    if (id) {
      // Update existing product
      response = await fetchWithAuth(`${API_URL}/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData),
      });
    } else {
      // Create new product
      response = await fetchWithAuth(`${API_URL}/admin/products`, {
        method: "POST",
        body: JSON.stringify(productData),
      });
    }

    if (response.ok) {
      showNotification(id ? "Product updated!" : "Product added!", "success");
      closeProductModal();
      loadProductsTable();
    } else {
      showNotification("Error saving product!", "error");
    }
  } catch (error) {
    showNotification("Server error!", "error");
  }
}

// ─── DELETE PRODUCT ───────────────────────────────────────
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const response = await fetchWithAuth(`${API_URL}/admin/products/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showNotification("Product deleted!", "success");
      loadProductsTable();
    } else {
      showNotification("Error deleting product!", "error");
    }
  } catch (error) {
    showNotification("Server error!", "error");
  }
}

// ─── UPDATE ORDER STATUS ──────────────────────────────────
async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetchWithAuth(`${API_URL}/admin/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      showNotification("Order status updated!", "success");
    } else {
      showNotification("Error updating order!", "error");
    }
  } catch (error) {
    showNotification("Server error!", "error");
  }
}

// ─── INIT TABS ────────────────────────────────────────────
function initAdminTabs() {
  const navLinks = document.querySelectorAll(".admin-nav-link[data-tab]");
  const tabs = document.querySelectorAll(".admin-tab");
  const pageTitle = document.getElementById("admin-page-title");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = link.dataset.tab;

      navLinks.forEach((l) => l.classList.remove("active"));
      tabs.forEach((t) => t.classList.remove("active"));

      link.classList.add("active");
      document.getElementById(`tab-${tabName}`).classList.add("active");
      pageTitle.textContent = link.textContent.trim();

      // Load data for tab
      if (tabName === "products") loadProductsTable();
      if (tabName === "orders") loadOrdersTable();
      if (tabName === "users") loadUsersTable();
      if (tabName === "returns") loadReturnsTable();
    });
  });
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────────
function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("admin-sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

// ─── LOAD RETURNS TABLE ───────────────────────────────────
async function loadReturnsTable() {
  const tbody = document.getElementById("returns-table-body");

  try {
    const response = await fetchWithAuth(`${API_URL}/admin/returns`);
    const returns = await response.json();

    if (!returns || returns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-loading">No return requests found</td></tr>`;
      return;
    }

    tbody.innerHTML = returns
      .map((r) => {
        const date = new Date(r.created_at).toLocaleDateString();
        return `
          <tr> 
            <td>#${r.id}</td>
            <td>#${r.order_id.toString().padStart(6, "0")}</td>
            <td>User #${r.user_id}</td>
            <td>${r.reason}</td>
            <td><span class="order-status ${r.status}">${r.status}</span></td>
            <td>${date}</td>
            <td>
              <select class="sort-select" style="padding:5px;font-size:12px;"
                onchange="updateReturnStatus(${r.id}, this.value)">
                <option ${r.status === "pending" ? "selected" : ""}>pending</option>
                <option ${r.status === "approved" ? "selected" : ""}>approved</option>
                <option ${r.status === "rejected" ? "selected" : ""}>rejected</option>
              </select>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Error loading returns</td></tr>`;
  }
}

// ─── UPDATE RETURN STATUS ─────────────────────────────────
async function updateReturnStatus(id, status) {
  try {
    const response = await fetchWithAuth(`${API_URL}/admin/returns/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      showNotification("Return status updated!", "success");
    } else {
      showNotification("Error updating return!", "error");
    }
  } catch (error) {
    showNotification("Server error!", "error");
  }
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkAdminAccess();
  loadDashboardStats();
  initAdminTabs();
  initSidebarToggle();
});
