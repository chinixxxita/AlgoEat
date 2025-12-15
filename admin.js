/* ===== ADMIN LOGIN SYSTEM ===== */

const adminUser = "admin";
const adminPass = "12345";   // You can change this

// LOGIN PAGE
if (window.location.pathname.includes("admin-login.html")) {
    const login = () => {
        let u = document.getElementById("admin-username").value;
        let p = document.getElementById("admin-password").value;

        if (u === adminUser && p === adminPass) {
            localStorage.setItem("adminLogged", "true");
            window.location.href = "admin.html";
        } else {
            document.getElementById("error-popup").style.display = "flex";
        }
    };

    document.getElementById("login-btn").addEventListener("click", login);

    document.getElementById("admin-username").addEventListener("keydown", (e) => {
        if (e.key === "Enter") login();
    });

    document.getElementById("admin-password").addEventListener("keydown", (e) => {
        if (e.key === "Enter") login();
    });

    document.getElementById("close-error").addEventListener("click", () => {
        document.getElementById("error-popup").style.display = "none";
    });
}

// AUTH GUARD
if (window.location.pathname.includes("admin.html")) {
    if (localStorage.getItem("adminLogged") !== "true") {
        window.location.href = "admin-login.html";
    }
}

/* ===== LOGOUT ===== */
function logout() {
    localStorage.removeItem("adminLogged");
    window.location.href = "admin-login.html";
}

/* ===== SECTION SWITCHING ===== */
function showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    if (id === "dashboard") loadDashboard();
    if (id === "products") loadProducts();
    if (id === "orders") loadOrders();
}

/* ===== ORDER TAB SWITCHING ===== */
function showOrderTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".order-tab").forEach(tab => tab.classList.remove("active"));

    document.querySelector(`[onclick="showOrderTab('${tab}')"]`).classList.add("active");
    document.getElementById(`${tab}-orders`).classList.add("active");

    loadOrders(tab);
}

/* ===== DASHBOARD COUNTS ===== */
async function loadDashboard() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/stats');
        const stats = await response.json();

        document.getElementById("total-products").innerText = stats.products;
        document.getElementById("total-orders").innerText = stats.orders;
        document.getElementById("total-users").innerText = stats.users;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        alert('Failed to load dashboard stats. Please try again.');
    }
}

/* ===== PRODUCT MANAGEMENT ===== */
async function addProduct() {
    let name = document.getElementById("prod-name").value;
    let price = parseFloat(document.getElementById("prod-price").value);
    let img = document.getElementById("prod-image").value;

    if (!name || !price) return alert("Fill all fields");

    try {
        const response = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, image_url: img })
        });

        if (response.ok) {
            document.getElementById("prod-name").value = "";
            document.getElementById("prod-price").value = "";
            document.getElementById("prod-image").value = "";
            loadProducts();
            alert('Product added successfully!');
        } else {
            alert('Failed to add product.');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product. Please try again.');
    }
}

async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const products = await response.json();

        let list = document.getElementById("product-list");
        list.innerHTML = "";

        products.forEach(prod => {
            list.innerHTML += `
                <div class="item">
                    <h3>${prod.name}</h3>
                    <p>₱${prod.price}</p>
                    <button onclick="deleteProduct(${prod.id})">Delete</button>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Failed to load products. Please try again.');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/products/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadProducts();
            alert('Product deleted successfully!');
        } else {
            alert('Failed to delete product.');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
    }
}

/* ===== ORDERS ===== */
async function loadOrders(status = 'served') {
    try {
        const response = await fetch('http://localhost:3000/api/orders');
        const orders = await response.json();

        let filteredOrders;
        if (status === 'served') {
            filteredOrders = orders.filter(o => o.status === 'Completed');
        } else {
            filteredOrders = []; // No other statuses to handle
        }

        const listId = `${status}-order-list`;
        const list = document.getElementById(listId);
        if (!list) return;

        list.innerHTML = "";

        filteredOrders.forEach(o => {
            const actionButtons = getActionButtons(o.status, o.id);
            const itemsHtml = o.items.map(item => `<li>${item.quantity}x ${item.name} - ₱${item.price * item.quantity}</li>`).join('');
            list.innerHTML += `
                <div class="item">
                    <h3>Order #${o.id}</h3>
                    <p>Name: ${o.customer_name}</p>
                    <p>Total: ₱${o.total}</p>
                    <p>Status: ${o.status}</p>
                    <details>
                        <summary>View Items</summary>
                        <ul>${itemsHtml}</ul>
                    </details>
                    <div class="order-actions">${actionButtons}</div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Failed to load orders. Please try again.');
    }
}

function getActionButtons(status, id) {
    if (status === 'Pending') {
        return `<button onclick="updateOrderStatus(${id}, 'Processing')">Start Processing</button>`;
    } else if (status === 'Processing') {
        return `<button onclick="updateOrderStatus(${id}, 'Completed')">Mark as Served</button>`;
    } else if (status === 'Completed') {
        return `<button onclick="deleteOrder(${id})">Delete Order</button>`;
    } else {
        return '';
    }
}

async function updateOrderStatus(id, newStatus) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            // Reload the current active tab
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const tabType = activeTab.textContent.toLowerCase().replace(' orders', '');
                loadOrders(tabType);
            }
        } else {
            alert('Failed to update order status.');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status. Please try again.');
    }
}

async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this served order? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/orders/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Reload the served orders tab
            loadOrders('served');
            alert('Order deleted successfully.');
        } else {
            const error = await response.json();
            alert(`Failed to delete order: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order. Please try again.');
    }
}
