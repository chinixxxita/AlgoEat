const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = 'your-secret-key-change-in-production'

const app = express()
app.use(express.json())
app.use(cors())
app.use(express.static(path.resolve(__dirname, '../frontend')))
app.use('/assets', express.static(path.resolve(__dirname, '../assets')))

const dbPath = path.join(__dirname, 'data.sqlite')
const db = new sqlite3.Database(dbPath)

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, image_url TEXT)')
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `)
  db.run('ALTER TABLE products ADD COLUMN category TEXT', err => {})
  db.run('CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, email TEXT, address TEXT, phone TEXT, payment TEXT, order_type TEXT, total REAL, status TEXT, date TEXT)')
  db.run('ALTER TABLE orders ADD COLUMN user_id INTEGER', err => {})
  db.run('CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, name TEXT, price REAL, quantity INTEGER, image_url TEXT)')

  db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
    if (err) return
    if (!row || row.count > 0) return
    const seed = [
      { name: 'Classic Cheeseburger', price: 120, image_url: '/assets/Classic  CB.jpg', category: 'Burgers' },
      { name: 'Bacon Cheeseburger', price: 150, image_url: '/assets/Bacon CB.jpg', category: 'Burgers' },
      { name: 'Double Cheeseburger', price: 140, image_url: '/assets/Double CB.jpg', category: 'Burgers' },
      { name: 'Spicy Chicken Burger', price: 130, image_url: '/assets/SPICY CB.avif', category: 'Burgers' },
      { name: 'Crispy Fried Chicken (2pcs)', price: 150, image_url: '/assets/CRISPY FC.jpg', category: 'Chicken' },
      { name: 'Chicken Nuggets (10pcs)', price: 160, image_url: '/assets/Cripsy CN.jpg', category: 'Chicken' },
      { name: 'Crispy Chicken Strips (4pcs)', price: 155, image_url: '/assets/CRISPY CS.jpg', category: 'Chicken' },
      { name: 'Crispy French Fries', price: 135, image_url: '/assets/CRISPY FF.webp', category: 'Sides' },
      { name: 'Crispy Onion Rings', price: 145, image_url: '/assets/CRISPY OR.jpg', category: 'Sides' },
      { name: 'Golden Hash Browns (2pcs)', price: 150, image_url: '/assets/GOLDEN HB.jpg', category: 'Sides' },
      { name: 'Classic Cola', price: 200, image_url: '/assets/COLA.jpg', category: 'Drinks' },
      { name: 'Fresh Orange Juice', price: 180, image_url: '/assets/OG.jpg', category: 'Drinks' },
      { name: 'Vanilla Milkshake', price: 190, image_url: '/assets/VANILLA MS.jpg', category: 'Drinks' },
      { name: 'Iced Coffee', price: 175, image_url: '/assets/ICE COFFEE.jpg', category: 'Drinks' },
      { name: 'Chocolate Sundae', price: 500, image_url: '/assets/chocolate sundae.jpg', category: 'Desserts' },
      { name: 'Classic Apple Pie', price: 450, image_url: '/assets/CLASSIC ap.jpg', category: 'Desserts' },
      { name: 'Strawberry Milkshake', price: 550, image_url: '/assets/STARberry.jpg', category: 'Desserts' }
    ]
    const stmt = db.prepare('INSERT INTO products (name, price, image_url, category) VALUES (?, ?, ?, ?)')
    seed.forEach(p => stmt.run(p.name, p.price, p.image_url, p.category))
    stmt.finalize()
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    res.json(rows)
  })
})

app.post('/api/products', (req, res) => {
  const { name, price, image_url, category } = req.body || {}
  if (!name || typeof price !== 'number') return res.status(400).json({ error: 'invalid_payload' })
  const stmt = db.prepare('INSERT INTO products (name, price, image_url, category) VALUES (?, ?, ?, ?)')
  stmt.run(name, price, image_url || null, category || null, function (err) {
    if (err) return res.status(500).json({ error: 'db_error' })
    res.status(201).json({ id: this.lastID })
  })
})

app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'invalid_id' })
  db.run('DELETE FROM products WHERE id = ?', id, function (err) {
    if (err) return res.status(500).json({ error: 'db_error' })
    res.json({ deleted: this.changes > 0 })
  })
})

app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', (err, orders) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    const ordersWithItems = []
    let processed = 0
    if (orders.length === 0) return res.json([])
    orders.forEach(order => {
      db.all('SELECT name, price, quantity, image_url FROM order_items WHERE order_id = ?', order.id, (err2, items) => {
        if (err2) return res.status(500).json({ error: 'db_error' })
        ordersWithItems.push({ ...order, items })
        processed++
        if (processed === orders.length) {
          res.json(ordersWithItems)
        }
      })
    })
  })
})

app.get('/api/orders/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'invalid_id' })
  db.get('SELECT * FROM orders WHERE id = ?', id, (err, order) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    if (!order) return res.status(404).json({ error: 'not_found' })
    db.all('SELECT name, price, quantity, image_url FROM order_items WHERE order_id = ?', id, (err2, items) => {
      if (err2) return res.status(500).json({ error: 'db_error' })
      res.json({ order, items })
    })
  })
})

app.put('/api/orders/:id/status', (req, res) => {
  const id = parseInt(req.params.id)
  const { status } = req.body || {}
  if (!id || !status) return res.status(400).json({ error: 'invalid_payload' })
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?')
  stmt.run(status, id, function (err) {
    if (err) return res.status(500).json({ error: 'db_error' })
    res.json({ updated: this.changes })
  })
})

app.delete('/api/orders/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'invalid_id' })
  db.get('SELECT status FROM orders WHERE id = ?', id, (err, order) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    if (!order) return res.status(404).json({ error: 'not_found' })
    if (order.status !== 'Completed') return res.status(400).json({ error: 'can_only_delete_served_orders' })
    db.run('DELETE FROM order_items WHERE order_id = ?', id, (err2) => {
      if (err2) return res.status(500).json({ error: 'db_error' })
      db.run('DELETE FROM orders WHERE id = ?', id, (err3) => {
        if (err3) return res.status(500).json({ error: 'db_error' })
        res.json({ deleted: true })
      })
    })
  })
})

app.post('/api/orders', (req, res) => {
  const payload = req.body || {}
  const c = payload.customer || {}
  const items = Array.isArray(payload.items) ? payload.items : []
  const total = typeof payload.total === 'number' ? payload.total : items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0)
  const date = payload.date || new Date().toISOString()
  const status = payload.status || 'Pending'
  const userId = req.user ? req.user.id : null
  if (!c.name || !c.email || !c.address || !c.phone || !c.payment || !c.orderType) return res.status(400).json({ error: 'invalid_customer' })
  if (!items.length) return res.status(400).json({ error: 'empty_items' })
  const stmt = db.prepare('INSERT INTO orders (customer_name, email, address, phone, payment, order_type, total, status, date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  stmt.run(c.name, c.email, c.address, c.phone, c.payment, c.orderType, total, status, date, userId, function (err) {
    if (err) return res.status(500).json({ error: 'db_error' })
    const orderId = this.lastID
    const itemStmt = db.prepare('INSERT INTO order_items (order_id, name, price, quantity, image_url) VALUES (?, ?, ?, ?, ?)')
    let failed = false
    items.forEach(i => {
      itemStmt.run(orderId, i.name, i.price, i.quantity, i.image || null, e => { if (e) failed = true })
    })
    itemStmt.finalize(e => {
      if (e || failed) return res.status(500).json({ error: 'db_error' })
      res.status(201).json({ id: orderId, status })
    })
  })
})

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'access_token_required' })

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'invalid_token' })
    req.user = user
    next()
  })
}

// Auth endpoints
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) return res.status(400).json({ error: 'missing_fields' })

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const stmt = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    stmt.run(email, hashedPassword, name, function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'email_exists' })
        return res.status(500).json({ error: 'db_error' })
      }
      const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET)
      res.status(201).json({ token, user: { id: this.lastID, email, name } })
    })
  } catch (err) {
    res.status(500).json({ error: 'server_error' })
  }
})

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  db.get('SELECT * FROM users WHERE email = ?', email, async (err, user) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    if (!user) return res.status(401).json({ error: 'invalid_credentials' })

    try {
      const validPassword = await bcrypt.compare(password, user.password_hash)
      if (!validPassword) return res.status(401).json({ error: 'invalid_credentials' })

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET)
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })
})

app.get('/api/user', authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

// Get user orders
app.get('/api/user/orders', authenticateToken, (req, res) => {
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', req.user.id, (err, rows) => {
    if (err) return res.status(500).json({ error: 'db_error' })
    res.json(rows)
  })
})

app.get('/api/admin/stats', (req, res) => {
  const queries = {
    products: 'SELECT COUNT(*) AS count FROM products',
    orders: 'SELECT COUNT(*) AS count FROM orders',
    users: 'SELECT COUNT(*) AS count FROM users'
  }

  const results = {}
  let completed = 0
  const total = Object.keys(queries).length

  Object.keys(queries).forEach(key => {
    db.get(queries[key], (err, row) => {
      if (err) return res.status(500).json({ error: 'db_error' })
      results[key] = row.count
      completed++
      if (completed === total) {
        res.json(results)
      }
    })
  })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

