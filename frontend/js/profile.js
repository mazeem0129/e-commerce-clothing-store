// ─── LOAD USER INFO ───────────────────────────────────────
function loadUserInfo() {
    const user = getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('settings-name').value = user.name;
    document.getElementById('settings-email').value = user.email;
}

// ─── LOAD ORDERS ──────────────────────────────────────────
async function loadOrders() {
    const user = getUser();
    const container = document.getElementById('orders-container');

    try {
        const response = await fetchWithAuth(`${API_URL}/orders/${user.id}`);
        const orders = await response.json();

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-box-open"></i>
                    <h3>No orders yet</h3>
                    <p>You haven't placed any orders yet</p>
                    <a href="products.html" class="btn btn-primary" 
                       style="margin-top:15px;">Start Shopping</a>
                </div>`;
            return;
        }

        container.innerHTML = '';
        orders.forEach(order => {
            const card = createOrderCard(order);
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Could not load orders</h3>
                <p>Please try again later</p>
            </div>`;
        console.error('Error loading orders:', error);
    }
}

// ─── CREATE ORDER CARD ────────────────────────────────────
function createOrderCard(order) {
    const div = document.createElement('div');
    div.className = 'order-card';

    const date = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    div.innerHTML = `
        <div class="order-card-header">
            <h4>Order #${order.id.toString().padStart(6, '0')}</h4>
            <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-card-details">
            <p>Date: <span>${date}</span></p>
            <p>Total: <span>$${order.total_amount.toFixed(2)}</span></p>
            <p>Status: <span>${order.status}</span></p>
        </div>
        <div class="order-card-actions" style="margin-top:15px;">
            ${order.status === 'pending' || order.status === 'processing' ? `
            <button class="btn btn-primary" 
                style="padding:8px 20px;font-size:13px;"
                onclick="cancelOrder(${order.id})">
                <i class="fas fa-undo"></i> Cancel Order
            </button>` : ''}

            ${order.status === 'shipped' || order.status === 'delivered' ? `
            <button class="btn btn-primary" 
                style="padding:8px 20px;font-size:13px;"
                onclick="requestReturn(${order.id})">
                <i class="fas fa-undo"></i> Request Return
            </button>` : ''}
        </div>
    `;
    return div;
}

// ─── SAVE SETTINGS ────────────────────────────────────────
async function saveSettings() {
    const name = document.getElementById('settings-name').value.trim();
    const password = document.getElementById('settings-password').value.trim();
    const confirmPassword = document.getElementById('settings-confirm-password').value.trim();

    if (!name) {
        showNotification('Name cannot be empty!', 'error');
        return;
    }

    if (password && password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password && password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }

    const user = getUser();
    const payload = { name };
    if (password) {
        payload.password = password;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Failed to update settings');
        }

        const data = await response.json();

        localStorage.setItem('user', JSON.stringify(data.user));
        document.getElementById('profile-name').textContent = data.user.name;
        document.getElementById('settings-password').value = '';
        document.getElementById('settings-confirm-password').value = '';

        showNotification('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings. Please try again!', 'error');
    }
}

// ─── REQUEST RETURN ───────────────────────────────────────
async function requestReturn(orderId) {
    const reason = prompt('Please enter the reason for return:');
    if (!reason || reason.trim() === '') {
        showNotification('Please provide a reason for return!', 'error');
        return;
    }

    const user = getUser();

    try {
        const response = await fetchWithAuth(`${API_URL}/returns`, {
            method: 'POST',
            body: JSON.stringify({
                order_id: orderId,
                user_id: user.id,
                reason: reason.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification(data || 'Error submitting return!', 'error');
            return;
        }

        showNotification('Return request submitted successfully!', 'success');

    } catch (error) {
        showNotification('Server error. Please try again!', 'error');
        console.error('Return error:', error);
    }
}

async function cancelOrder(orderId) {
    // 1. Double check with the user before destroying data
    if (!confirm("Are you sure you want to cancel this order?")) {
        return; 
    }

    try {
        // 2. Fire the network request to your backend endpoint
        const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT', // or 'PATCH' depending on your API design
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        });

        // 3. Handle the server's response
        if (response.ok) {
            // Display the beautiful green toast notification
            showNotification("Order cancelled successfully!", "success"); 
            
            // Wait 1.5 seconds so the user can actually read the notification 
            // before the page updates or reloads!
            setTimeout(() => {
                if (typeof loadDashboardStats === 'function') {
                    loadDashboardStats(); 
                } else {
                    location.reload(); 
                }
            }, 1500);
        } else {
            // ─── UPDATE THIS BLOCK FOR THE RED ERROR MESSAGE ───
            // Try to extract the error message from the backend JSON, fallback to generic text
            try {
                const errorData = await response.json();
                showNotification(errorData.message || "Failed to cancel order.", "error");
            } catch (e) {
                showNotification("An error occurred while processing your request.", "error");
            }
        }

    } catch (error) {
        console.error("Error updating order status:", error);
        alert("An error occurred while trying to cancel the order.");
    }
}

// ─── INIT TABS ────────────────────────────────────────────
function initTabs() {
    const navLinks = document.querySelectorAll('.profile-nav-link[data-tab]');
    const tabs = document.querySelectorAll('.profile-tab');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.dataset.tab;

            navLinks.forEach(l => l.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');

            if (tabName === 'orders') loadOrders();
            if (tabName === 'addresses') loadAddresses();
        });
    });
}

// ─── LOAD ADDRESSES ───────────────────────────────────────
async function loadAddresses() {
    const user = getUser();
    const container = document.getElementById('address-container');

    try {
        const response = await fetchWithAuth(`${API_URL}/addresses/${user.id}`);
        const addresses = await response.json();

        if (!addresses || addresses.length === 0) {
            container.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-map-marker-alt"></i>
                    <h3>No addresses saved</h3>
                    <p>Add a delivery address to get started</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        addresses.forEach(addr => {
            container.innerHTML += `
                <div class="address-card ${addr.is_default ? 'default' : ''}" id="addr-${addr.id}">
                    <div class="address-card-header">
                        <span class="address-label">
                            <i class="fas fa-map-marker-alt"></i> ${addr.label || 'Home'}
                            ${addr.is_default ? '<span class="default-badge">Default</span>' : ''}
                        </span>
                        <div class="address-actions">
                            <button onclick="openEditAddress(${JSON.stringify(addr).replace(/"/g, '&quot;')})" 
                                class="btn-icon"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteAddress(${addr.id})" 
                                class="btn-icon delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="address-card-body">
                        <p><strong>${addr.full_name}</strong> | ${addr.phone}</p>
                        <p>${addr.address}</p>
                        <p>${addr.city}, ${addr.zip_code}</p>
                        <p>${addr.country}</p>
                    </div>
                    ${!addr.is_default ? `
                    <button onclick="setDefaultAddress(${addr.id}, ${addr.user_id})" 
                        class="btn btn-secondary" style="margin-top:10px;font-size:12px;padding:5px 15px;">
                        Set as Default
                    </button>` : ''}
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading addresses:', error);
    }
}

// ─── OPEN ADDRESS MODAL ───────────────────────────────────
function openAddAddress() {
    document.getElementById('address-modal-title').textContent = 'Add New Address';
    document.getElementById('address-id').value = '';
    document.getElementById('addr-label').value = 'Home';
    document.getElementById('addr-fullname').value = '';
    document.getElementById('addr-phone').value = '';
    document.getElementById('addr-street').value = '';
    document.getElementById('addr-city').value = '';
    document.getElementById('addr-zip').value = '';
    document.getElementById('addr-country').value = '';
    document.getElementById('addr-default').checked = false;
    document.getElementById('address-modal').classList.add('active');
}

function openEditAddress(addr) {
    document.getElementById('address-modal-title').textContent = 'Edit Address';
    document.getElementById('address-id').value = addr.id;
    document.getElementById('addr-label').value = addr.label;
    document.getElementById('addr-fullname').value = addr.full_name;
    document.getElementById('addr-phone').value = addr.phone;
    document.getElementById('addr-street').value = addr.address;
    document.getElementById('addr-city').value = addr.city;
    document.getElementById('addr-zip').value = addr.zip_code;
    document.getElementById('addr-country').value = addr.country;
    document.getElementById('addr-default').checked = addr.is_default;
    document.getElementById('address-modal').classList.add('active');
}

function closeAddressModal() {
    document.getElementById('address-modal').classList.remove('active');
}

// ─── SAVE ADDRESS ─────────────────────────────────────────
async function saveAddress() {
    const user = getUser();
    const id = document.getElementById('address-id').value;

    const addressData = {
        user_id: user.id,
        label: document.getElementById('addr-label').value.trim(),
        full_name: document.getElementById('addr-fullname').value.trim(),
        phone: document.getElementById('addr-phone').value.trim(),
        address: document.getElementById('addr-street').value.trim(),
        city: document.getElementById('addr-city').value.trim(),
        zip_code: document.getElementById('addr-zip').value.trim(),
        country: document.getElementById('addr-country').value.trim(),
        is_default: document.getElementById('addr-default').checked
    };

    if (!addressData.full_name || !addressData.address || !addressData.city) {
        showNotification('Please fill in required fields!', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(
            id ? `${API_URL}/addresses/${id}` : `${API_URL}/addresses`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(addressData)
        });

        if (response.ok) {
            showNotification(id ? 'Address updated!' : 'Address added!', 'success');
            closeAddressModal();
            loadAddresses();
        } else {
            showNotification('Error saving address!', 'error');
        }
    } catch (error) {
        showNotification('Server error!', 'error');
    }
}

// ─── DELETE ADDRESS ───────────────────────────────────────
async function deleteAddress(id) {
    if (!confirm('Delete this address?')) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/addresses/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Address deleted!', 'success');
            loadAddresses();
        }
    } catch (error) {
        showNotification('Server error!', 'error');
    }
}

// ─── SET DEFAULT ADDRESS ──────────────────────────────────
async function setDefaultAddress(id, userId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/addresses/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ user_id: userId, is_default: true })
        });

        if (response.ok) {
            showNotification('Default address updated!', 'success');
            loadAddresses();
        }
    } catch (error) {
        showNotification('Server error!', 'error');
    }
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    loadUserInfo();
    loadOrders();
    loadAddresses();
    initTabs();
});