// ─── LOAD SAVED ADDRESSES AT CHECKOUT ────────────────────
async function loadSavedAddresses() {
    const user = getUser();
    const section = document.getElementById('saved-addresses-section');
    const list = document.getElementById('saved-addresses-list');

    try {
        const response = await fetchWithAuth(`${API_URL}/addresses/${user.id}`);
        const addresses = await response.json();

        if (!addresses || addresses.length === 0) {
            // No saved addresses — hide the section, show form directly
            section.style.display = 'none';
            return;
        }

        list.innerHTML = '';
        addresses.forEach(addr => {
            const div = document.createElement('div');
            div.className = `saved-address-card`;
            div.id = `checkout-addr-${addr.id}`;
            div.innerHTML = `
                <div class="saved-address-radio">
                    <input type="radio" name="saved-address" 
                        value="${addr.id}" 
                        id="radio-${addr.id}"
                        onchange="selectSavedAddress(${JSON.stringify(addr).replace(/"/g, '&quot;')})">
                </div>
                <label for="radio-${addr.id}" style="cursor:pointer;flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                        <strong>${addr.label || 'Home'}</strong>
                        ${addr.is_default ? '<span class="default-badge">Default</span>' : ''}
                    </div>
                    <p style="font-size:13px;color:var(--gray);margin:0;">
                        ${addr.full_name} | ${addr.phone}<br>
                        ${addr.address}, ${addr.city}, ${addr.zip_code}, ${addr.country}
                    </p>
                </label>
            `;
            list.appendChild(div);
        });

        // Don't auto-select any address
        // User must manually select one

    } catch (error) {
        console.error('Error loading addresses:', error);
        section.style.display = 'none';
    }
}

// ─── SELECT SAVED ADDRESS ─────────────────────────────────
function selectSavedAddress(addr) {
    // Highlight selected card
    document.querySelectorAll('.saved-address-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`checkout-addr-${addr.id}`);
    if (card) card.classList.add('selected');

    // Fill form fields
    document.getElementById('full-name').value = addr.full_name || '';
    document.getElementById('phone').value = addr.phone || '';
    document.getElementById('address').value = addr.address || '';
    document.getElementById('city').value = addr.city || '';
    document.getElementById('zip').value = addr.zip_code || '';

    // Match country
    const countrySelect = document.getElementById('country');
    const countryVal = addr.country.toLowerCase();
    for (let option of countrySelect.options) {
        if (option.value === countryVal || 
            option.text.toLowerCase() === countryVal) {
            option.selected = true;
            break;
        }
    }

    // Fill email from logged in user
    const user = getUser();
    document.getElementById('checkout-email').value = user.email || '';

    // Show the form so user can see/edit
    document.getElementById('manual-address-form').style.display = 'block';
}

// ─── TOGGLE NEW ADDRESS FORM ──────────────────────────────
function toggleNewAddressForm() {
    const form = document.getElementById('manual-address-form');
    const isHidden = form.style.display === 'none';

    if (isHidden) {
        // Clear form and show
        document.getElementById('full-name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('address').value = '';
        document.getElementById('city').value = '';
        document.getElementById('zip').value = '';
        document.getElementById('country').value = '';
        document.getElementById('checkout-email').value = '';

        // Deselect all radio buttons
        document.querySelectorAll('.saved-address-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('input[name="saved-address"]').forEach(r => r.checked = false);

        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// ─── LOAD CHECKOUT ITEMS ──────────────────────────────────
function loadCheckoutItems() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('checkout-items');

    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    container.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
            <img src="${item.image_url || '../assets/images/placeholder.jpg'}"
                 alt="${item.name}"
                 onerror="this.src='../assets/images/placeholder.jpg'">
            <div class="checkout-item-info">
                <h4>${item.name}</h4>
                <p>Qty: ${item.quantity}</p>
            </div>
            <span class="checkout-item-price">
                $${(item.price * item.quantity).toFixed(2)}
            </span>
        `;
        container.appendChild(div);
    });

    calculateCheckoutTotal(cart);
}

// ─── CALCULATE TOTAL ──────────────────────────────────────
function calculateCheckoutTotal(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 50 ? 0 : 9.99;
    const tax = subtotal * 0.10;
    const total = subtotal + shipping + tax;

    document.getElementById('checkout-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkout-shipping').textContent =
        shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;
}

// ─── FORMAT CARD NUMBER ───────────────────────────────────
function initCardFormatting() {
    const cardNumber = document.getElementById('card-number');
    const expiry = document.getElementById('expiry');

    if (cardNumber) {
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})/g, '$1 ').trim();
            e.target.value = value;
        });
    }

    if (expiry) {
        expiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            e.target.value = value;
        });
    }
}

// ─── VALIDATE FORM ────────────────────────────────────────
function validateForm() {
    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('checkout-email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const zip = document.getElementById('zip').value.trim();
    const country = document.getElementById('country').value;

    console.log('Form values:', { fullName, email, phone, address, city, zip, country });

    // Check if a saved address is selected
    const selectedRadio = document.querySelector('input[name="saved-address"]:checked');
    const formVisible = document.getElementById('manual-address-form').style.display !== 'none';

    // If saved address is selected and form fields are filled (auto-filled)
        if (selectedRadio && fullName && phone && address && city && zip && country) {
        // Still need email
        if (!email || !email.includes('@')) {
            showNotification('Please enter a valid email!', 'error');
            return false;
        }
        return true;
    }

    // Manual form validation
    if (!fullName || !email || !phone || !address || !city || !zip || !country) {
        showNotification('Please fill in all shipping fields!', 'error');
        return false;
    }

    if (!email.includes('@')) {
        showNotification('Please enter a valid email!', 'error');
        return false;
    }

    return true;
}

// ─── PLACE ORDER ──────────────────────────────────────────
async function placeOrder() {
    if (!validateForm()) return;

    const btn = document.getElementById('place-order-btn');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        const loggedIn = isLoggedIn();
        const user = loggedIn ? getUser() : null;

        // 1. Grab the actual items array from localStorage
        const cart = JSON.parse(localStorage.getItem('cart')) || [];

        // 2. Map the frontend cart structure to what your backend model expects
        const items = cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        }));

        // 3. Collect the shipping form data fields
        const fullName = document.getElementById('full-name').value.trim();
        const nameParts = fullName.split(' ');
        const shippingData = {
            first_name: nameParts[0] || '',
            last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
            email: document.getElementById('checkout-email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            zip_code: document.getElementById('zip').value.trim(),
            country: document.getElementById('country').value
        };

        // 4. Combine everything into one single request payload
        const payload = {
            user_id: loggedIn ? user.id : null,
            items: items,
            ...shippingData
        };

        // 5. Use plain fetch for guests (no token), fetchWithAuth for logged-in users
        const response = loggedIn
            ? await fetchWithAuth(`${API_URL}/checkout`, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            : await fetch(`${API_URL}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Checkout failed');
        }

        const data = await response.json();

        localStorage.removeItem('cart');
        updateCartCount();

        showNotification('Order placed successfully!', 'success');

        setTimeout(() => {
            window.location.href = `order-success.html?order_id=${data.order_id}`;
        }, 1500);

    } catch (error) {
        showNotification('Error placing order. Please try again!', 'error');
        btn.textContent = 'Place Order';
        btn.disabled = false;
        console.error('Checkout error:', error);
    }
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutItems();

    if (isLoggedIn()) {
        loadSavedAddresses();
    } else {
        document.getElementById('saved-addresses-section').style.display = 'none';
    }

    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
});