 # Copilot Instructions for Project Warehouse

## Architecture Overview
**Project Warehouse** is a vanilla JavaScript inventory management system with:
- **Backend:** Express.js + Mongoose (MongoDB) monolith in `server.js` (~540 lines)
- **Frontend:** Static HTML/CSS/JS served via `express.static()`, organized by business function
- **No build tooling:** Direct browser ES6 modules (`type="module"` imports)
- **State management:** `localStorage` for auth (userId, username, role), no framework/library

## Critical Data Flow Pattern
All frontend pages follow this three-collection merge pattern:
```javascript
// Example from scripts/inventory.js
const [products, buyin, sale] = await Promise.all([
  fetch(`${BACKEND_URL}/products`).then(r => r.json()),
  fetch(`${BACKEND_URL}/buyin_product`).then(r => r.json()),
  fetch(`${BACKEND_URL}/sale_product`).then(r => r.json())
]);
// Calculate real stock: totalBuyin - totalSale
```
**Why:** `products` collection stores base data, but real-time inventory = `buyin_product` quantity minus `sale_product` quantity. This pattern is used in `inventory.js`, `buyin.js`, `sale.js`, and `history.js`.

## MongoDB Collections & Schemas
Three main collections (all in `project_warehouse` database):
1. **products** - Base product catalog (ProductSchema in `server.js`)
2. **buyin_product** - Purchase/receiving transactions (BuyinProductSchema)
3. **sale_product** - Sales transactions (SaleProductSchema)
4. **users** - Authentication (UserSchema with Base64 profileImage storage)

Schema reference: `assets/schema-project_warehouse-products-mongoDBJSON.json` (note: some fields like `sale_status`, `controls` added dynamically)

## Developer Workflows
```powershell
# Development
npm start                     # Runs server.js on 0.0.0.0:3000
npm run pm2                   # Production with PM2

# MongoDB must be running on localhost:27017
# Access: http://localhost:3000/login.html

# LAN deployment (Windows-specific, see manual.txt):
# 1. Open Windows Firewall > Inbound Rules > New Rule
# 2. TCP port 3000, Allow connection
# 3. Get IPv4 via `ipconfig`
# 4. Access from LAN: http://<ipv4>:3000/login.html

# Alternative LAN access methods (to avoid IP changes):
# Method 1: Use computer name (NetBIOS)
hostname                      # Get server name (e.g., SERVER-PC)
# Access: http://SERVER-PC:3000/login.html

# Method 2: Static IP + Hosts file
# Set static IP on server, then edit C:\Windows\System32\drivers\etc\hosts:
# 192.168.1.100   warehouse.local
# Access: http://warehouse.local:3000/login.html
```

## Project-Specific Conventions

### 1. Dynamic Backend URL Resolution
`scripts/config.js` uses hostname detection for LAN compatibility:
```javascript
export const BACKEND_URL = `http://${window.location.hostname}:3000`;
```
All API calls use this imported constant - **never hardcode** `localhost` or IP addresses.

### 2. Buddhist Calendar Years (พ.ศ.)
Dates are displayed as Thai Buddhist Era (AD + 543):
```javascript
// Pattern from scripts/sale.js
const buddhistYear = date.getFullYear() + 543;
const thaiDate = `${day}/${month}/${buddhistYear}`;
```
Backend stores ISO dates; frontend converts for display.

### 3. Authentication & Authorization
Login flow (`src/login.html`):
```javascript
// POST /login → stores in localStorage
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('userId', data.userId);
localStorage.setItem('username', username);
localStorage.setItem('role', data.role);  // 'admin' or 'user'
```
Every page checks `localStorage.getItem('userId')` in inline `<script>` tags for auth gates.

### 4. File Upload Pattern
- Profile images stored as **Base64 strings** in MongoDB (not file paths)
- `multer` configured but only used in `/api/users/*` endpoints
- Registration endpoint (`/register`) accepts Base64 directly in JSON body

### 5. Page Structure Pattern
Each business function has three files:
- `src/{function}.html` - Structure with inline auth check
- `styles/{function}.css` - Scoped styles
- `scripts/{function}.js` - ES6 module with `import { BACKEND_URL }`

Navigation sidebar is **duplicated** in every HTML file (not componentized).

## Key API Endpoints (from server.js)
```
GET  /products              - All products
GET  /products/search?q=    - Search by code/name/model
POST /products              - Create product
PUT  /products/:id          - Update product
DELETE /products/:id        - Delete product

POST /buyin_product         - Record purchase
GET  /buyin_product         - All purchases

POST /sale_product          - Record sale
GET  /sale_product          - All sales

POST /login                 - Auth (updates lastLogin, lastSeen)
POST /register              - New user with Base64 profileImage

GET  /api/users/all         - User management (backend/src/management.html)
POST /api/presence/heartbeat - Update lastSeen for online status
```

## Adding New Features Checklist
1. Create `src/newfeature.html` (copy auth check pattern from existing pages)
2. Create `styles/newfeature.css`
3. Create `scripts/newfeature.js` (start with `import { BACKEND_URL }`)
4. Add route to `server.js` if new data operation needed
5. **Update sidebar navigation** in ALL existing HTML files (search for `<nav>` tags)
6. Use `Promise.all()` for multi-collection fetches to reduce latency
7. Apply Buddhist year conversion for date displays

## Common Pitfalls
- ❌ Don't use `products.quantity` directly - it's stale
- ✅ Always calculate: `buyinTotal - saleTotal` for real inventory
- ❌ Don't add JSX/React - this is vanilla JS with ES6 modules
- ✅ Use `formatNumber(n).toLocaleString('th-TH')` for Thai number formatting
- ❌ Backend doesn't have route handlers in separate files - all in `server.js`

## Frontend Patterns Reference
- **Pagination:** See `scripts/history.js` ~line 200-300 for reusable pattern
- **Search/Filter:** See `scripts/inventory.js` ~line 100-200
- **Print View:** See `scripts/movement.js` ~line 1200+ for CSS print media queries
- **User Presence:** See `backend/script/dashboard.js` for lastSeen/isOnline logic
