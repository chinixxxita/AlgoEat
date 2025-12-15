 // Initialize cart
if (!localStorage.getItem('cart')) localStorage.setItem('cart', JSON.stringify([]));

// Auth state
let currentUser = null;
let authToken = null;

function initAuth() {
    authToken = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
    }
}

function isLoggedIn() {
    return currentUser && authToken;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    currentUser = null;
    authToken = null;
    localStorage.removeItem('serverCart');
    localStorage.removeItem('serverOrderHistory');
    updateAuthUI();
    alert('Logged out successfully.');
}

async function syncCartWithServer() {
    if (!isLoggedIn()) return;
    // Placeholder for future server sync
}

async function loadOrderHistoryFromServer() {
    if (!isLoggedIn()) return;
    try {
        const res = await fetch('http://localhost:3000/api/user/orders', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const orders = await res.json();
            localStorage.setItem('serverOrderHistory', JSON.stringify(orders));
        }
    } catch (err) {
        console.error('Failed to load order history:', err);
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');

    if (isLoggedIn()) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfo) userInfo.textContent = `Welcome, ${currentUser.name}`;
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.textContent = '';
    }
}

let tempProduct = null;

function assetPrefix(){
    try{ return location.pathname.includes('/frontend/') ? '..' : '' }catch{ return '' }
}

function normalizeImage(url){
    if(!url) return url
    const s = String(url).trim()
    if(s.startsWith('http')) return s
    if(s.startsWith('../assets/')) return s
    if(s.startsWith('/assets/')) return assetPrefix() + s
    if(s.startsWith('assets/')) return assetPrefix() + '/' + s
    if(s.startsWith('/')) return s
    return s
}

function fixAssetPaths(){
    const prefix = assetPrefix()
    document.querySelectorAll('img').forEach(img=>{
        const src = (img.getAttribute('src')||'').trim()
        if(src.startsWith('assets/')) img.setAttribute('src', prefix + '/' + src)
        if(src.startsWith('/assets/')) img.setAttribute('src', prefix + src)
    })
}

function showOrderTypePopup(name, price, imageUrl) {
    addToCart(name, price, imageUrl);
}


function setOrderType(type) {
    localStorage.setItem('orderType', type)
    if (tempProduct) {
        addToCart(tempProduct.name, tempProduct.price, tempProduct.image)
        tempProduct = null
    }
    const popup = document.getElementById('order-type-popup')
    if (popup) popup.style.display = 'none'
}

// Add item to cart
function addToCart(productName, price, imageUrl) {
    const cart = JSON.parse(localStorage.getItem('cart'));
    const existingItem = cart.find(item => item.name === productName);

    if (existingItem) existingItem.quantity += 1;
    else cart.push({ name: productName, price: price, quantity:1, image: normalizeImage(imageUrl) });

    localStorage.setItem('cart', JSON.stringify(cart));
    showCartNotification(productName);
    updateCartCount();
}

// Remove item
function removeItem(index){
    const cart = JSON.parse(localStorage.getItem('cart'));
    cart.splice(index,1);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems();
}

// Update quantity
function updateQuantity(index,newQuantity){
    newQuantity = parseInt(newQuantity);
    if(newQuantity<1) newQuantity=1;
    const cart = JSON.parse(localStorage.getItem('cart'));
    cart[index].quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems();
}

// Clear cart
function clearCart(){
    localStorage.setItem('cart', JSON.stringify([]));
    if(document.getElementById('cart-items')) displayCartItems();
    updateCartCount();
}

// Display cart items
function displayCartItems(){
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsDiv = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    if(!cartItemsDiv) return;

    if(cart.length===0){
        cartItemsDiv.innerHTML='<div class="empty-cart">Your cart is empty</div>';
        if(totalPriceElement) totalPriceElement.textContent='Total: ₱0';
        return;
    }

    let total = 0;
    cartItemsDiv.innerHTML = '';

    cart.forEach((item,index)=>{
        const itemTotal = item.price*item.quantity;
        total += itemTotal;
        const itemDiv = document.createElement('div');
        itemDiv.className='cart-item';
        itemDiv.innerHTML=`
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>₱${item.price.toFixed(2)}</p>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button onclick="updateQuantity(${index}, ${item.quantity-1})">-</button>
                    <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)">
                    <button onclick="updateQuantity(${index}, ${item.quantity+1})">+</button>
                </div>
                <button class="remove-item" onclick="removeItem(${index})">×</button>
            </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });

    if(totalPriceElement) totalPriceElement.textContent = `Total: ₱${total.toFixed(2)}`;
}

// Update cart counter
function updateCartCount(){
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum,item)=>sum+item.quantity,0);
    const cartCounters = document.querySelectorAll('.cart-counter');
    cartCounters.forEach(counter=>{
        counter.textContent = totalItems;
        counter.style.display = totalItems>0?'flex':'none';
    });
}

// Show cart notification
function showCartNotification(productName){
    const notification = document.getElementById('cart-notification');
    if(!notification) return;
    notification.textContent = `${productName} added to cart!`;
    notification.style.display='block';
    setTimeout(()=>{ notification.style.display='none'; }, 3000);
}

// Place order and show receipt
async function placeOrder() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const payment = document.getElementById('payment').value;
    const orderType = document.getElementById('order-type-display').value;

    if (!name || !email || !address || !phone || !payment || !orderType) {
        alert("Please fill all fields.");
        return;
    }

    const orderNumber = 'ORD-' + Math.floor(Math.random() * 1000000);
    const orderDate = new Date().toISOString();

    // Calculate total
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
    });

    // Create order object for server
    const orderPayload = {
        customer: {
            name: name,
            email: email,
            address: address,
            phone: phone,
            payment: payment,
            orderType: orderType
        },
        items: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        total: total,
        date: orderDate,
        status: 'Completed'
    };

    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });

        if (!response.ok) {
            throw new Error('Failed to place order');
        }

        const result = await response.json();
        const orderId = result.id;

        // Create order object for localStorage (for confirmation page)
        const order = {
            orderNumber: orderNumber,
            date: orderDate,
            items: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
            total: total,
            customer: {
                name: name,
                email: email,
                address: address,
                phone: phone,
                payment: payment,
                orderType: orderType
            },
            status: 'Completed',
            id: orderId
        };

        // Store order in localStorage
        localStorage.setItem('currentOrder', JSON.stringify(order));

        // Clear cart
        localStorage.setItem('cart', JSON.stringify([]));
        updateCartCount();
        displayCartItems();

        // Redirect to confirmation page
        window.location.href = 'confirmation.html';
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Display order details on confirmation page
function displayOrderDetails(){
    const order = JSON.parse(localStorage.getItem('currentOrder'));
    if(!order){ window.location.href='products.html'; return; }
    const orderItemsDiv = document.getElementById('order-items');
    order.items.forEach(item=>{
        const itemDiv = document.createElement('div');
        itemDiv.className='order-item';
        itemDiv.innerHTML=`
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">${item.quantity}</span>
            <span class="item-price">₱${(item.price*item.quantity).toFixed(2)}</span>
        `;
        orderItemsDiv.appendChild(itemDiv);
    });
    document.getElementById('order-total').textContent=`Total: ₱${order.total.toFixed(2)}`;
    const shippingInfoDiv = document.getElementById('shipping-info');
    shippingInfoDiv.innerHTML=`
        <p><strong>Name:</strong> ${order.customer.name}</p>
        <p><strong>Email:</strong> ${order.customer.email}</p>
        <p><strong>Address:</strong> ${order.customer.address}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
        <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.customer.payment)}</p>
        <p><strong>Order Type:</strong> ${order.customer.orderType}</p>
        <p><strong>Status:</strong> ${order.status}</p>
    `;
}

function formatPaymentMethod(payment){
    switch(payment){
        case 'cod': return 'Cash on Delivery';
        case 'credit': return 'Credit Card';
        case 'gcash': return 'GCash';
        default: return payment;
    }
}

// Search setup
function setupSearch(){
    const searchInput=document.getElementById('product-search');
    if(searchInput){
        searchInput.addEventListener('input',function(){
            const term=this.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(product=>{
                const name=product.querySelector('h3').textContent.toLowerCase();
                product.style.display=name.includes(term)?'block':'none';
            });
        });
    }
}

// Newsletter
function setupNewsletter(){
    const newsletterForm=document.getElementById('newsletter-form');
    if(newsletterForm){
        newsletterForm.addEventListener('submit',function(e){
            e.preventDefault();
            const email=this.querySelector('input').value;
            const subs=JSON.parse(localStorage.getItem('newsletterSubscriptions'))||[];
            subs.push(email);
            localStorage.setItem('newsletterSubscriptions', JSON.stringify(subs));
            alert("Thank you for subscribing!");
            this.reset();
        });
    }
}

// Back to top button
function setupBackToTop(){
    const btn=document.getElementById('back-to-top');
    if(!btn) return;
    window.onscroll=function(){
        if(document.body.scrollTop>20 || document.documentElement.scrollTop>20) btn.style.display='block';
        else btn.style.display='none';
    }
    btn.addEventListener('click',()=>{ window.scrollTo({top:0,behavior:'smooth'}); });
}

// Setup order type buttons
function setupOrderTypeButtons(){
    const dineBtn = document.getElementById('dine-in-btn');
    const takeBtn = document.getElementById('take-out-btn');
    const orderTypeInput = document.getElementById('order-type-display');
    if(!dineBtn || !takeBtn || !orderTypeInput) return;

    function select(type){
        localStorage.setItem('orderType', type);
        orderTypeInput.value = type; // <-- update hidden input
        dineBtn.classList.remove('selected');
        takeBtn.classList.remove('selected');
        if(type==='Dine-In') dineBtn.classList.add('selected');
        else takeBtn.classList.add('selected');
    }

    dineBtn.addEventListener('click', ()=> select('Dine-In'));
    takeBtn.addEventListener('click', ()=> select('Take-Out'));

    // Restore previously selected type
    const saved = localStorage.getItem('orderType');
    if(saved) select(saved);
}




async function loadDbProducts(){
    const container = document.getElementById('db-products')
    if(!container) return
    try{
        const res = await fetch('/api/products')
        if(!res.ok) return
        const items = await res.json()
        if(!Array.isArray(items) || items.length===0){ container.innerHTML = '<p>No products available</p>'; return }
        const groups = items.reduce((acc,p)=>{ const c=(p.category||'Other'); (acc[c]??=[]).push(p); return acc },{})
        container.innerHTML = ''
        Object.keys(groups).forEach(cat=>{
            const title = document.createElement('h2')
            title.className = 'category-title'
            title.textContent = cat
            container.appendChild(title)
            const grid = document.createElement('div')
            grid.className = 'featured-products'
            groups[cat].forEach(p=>{
                const card = document.createElement('div')
                card.className = 'feature-card'
                const img = normalizeImage(p.image_url || '/assets/Classic  CB.jpg')
                card.innerHTML = `
                    <img src="${img}" alt="${p.name}">
                    <div class="feature-content">
                        <h3>${p.name}</h3>
                        <p class="price">₱${Number(p.price).toFixed(2)}</p>
                        <button class="btn" onclick="showOrderTypePopup('${p.name}', ${Number(p.price)}, '${img}')">
                            Add to Cart
                        </button>
                    </div>
                `
                grid.appendChild(card)
            })
            container.appendChild(grid)
        })
    }catch(_){
        container.innerHTML = '<p>Failed to load products</p>'
    }
}

// Initialize
document.addEventListener('DOMContentLoaded',function(){
    initAuth();
    updateAuthUI();
    updateCartCount();
    setupSearch();
    setupNewsletter();
    setupBackToTop();
    setupOrderTypeButtons();

    fixAssetPaths();

    if(document.getElementById('cart-items')) displayCartItems();
    if(document.getElementById('order-items')) displayOrderDetails();
    if(document.getElementById('product-list')) loadAdminProducts();
});



// Make functions global
window.addToCart=addToCart;
window.removeItem=removeItem;
window.updateQuantity=updateQuantity;
window.clearCart=clearCart;
window.placeOrder=placeOrder;
window.setOrderType=setOrderType;
window.showOrderTypePopup=showOrderTypePopup;
