# Copilot Instructions for Project Warehouse

## Project Overview
- **Project Warehouse** is a Node.js/Express + MongoDB application for inventory, sales, and purchasing management, with a browser-based frontend (HTML/CSS/JS) and a RESTful backend.
- Data is stored in MongoDB, with schemas defined in `assets/schema-project_warehouse-products-mongoDBJSON.json` and JSON data in `Database/`.
- The UI is organized by business function: inventory, buy-in, sale, history, movement, etc. Each has its own HTML, CSS, and JS files in `src/`, `styles/`, and `scripts/`.

## Key Components & Data Flow
- **Frontend:** Static HTML in `src/`, styled by `styles/`, with business logic in `scripts/` (e.g., `inventory.js`, `buyin.js`).
- **Backend:** `server.js` (Express), connects to MongoDB via Mongoose. API endpoints are not in `src/` but handled in backend/server files.
- **Data:**
  - Products and users: `Database/project_warehouse.products.json`, `Database/project_warehouse.users.json`
  - Product schema: `assets/schema-project_warehouse-products-mongoDBJSON.json`
- **Config:** API base URL is set in `scripts/config.js` as `BACKEND_URL` (defaults to `http://<hostname>:3000`).

## Developer Workflows
- **Start server:**
  - `npm start` (runs `server.js`)
  - `npm run pm2` (runs with PM2 for production)
- **Firewall:** Open port 3000 for external access (see `manual.txt` for Windows Firewall steps).
- **Access:**
  - Local: `http://localhost:3000/login.html`
  - LAN: `http://<ipv4-address>:3000/login.html` (see `manual.txt`)
- **No build step:** Static files are served directly; no bundler or transpiler is used.

## Project-Specific Patterns & Conventions
- **Thai language:** Many UI labels, comments, and date formats are in Thai.
- **Date handling:** Dates are often displayed in Buddhist calendar years (AD+543).
- **Frontend logic:**
  - Data fetching via `fetch()` to backend endpoints using `BACKEND_URL`.
  - Table rendering, pagination, and filtering are implemented in JS (see `scripts/inventory.js`, `scripts/history.js`).
  - Reports and print views are generated in JS (see `scripts/movement.js`).
- **Styling:**
  - Custom CSS for each business area (e.g., `styles/inventory.css`, `styles/history.css`).
  - Animated SVG icons and custom fonts (Sarabun).
- **Navigation:**
  - Sidebar and navbar navigation is hardcoded in HTML files, not dynamically generated.

## Integration & Extensibility
- **External dependencies:**
  - Express, Mongoose, CORS (see `package.json`).
  - PM2 for process management (production).
- **Adding new features:**
  - Add new HTML/CSS/JS files in `src/`, `styles/`, `scripts/` as needed.
  - Update navigation in all relevant HTML files for new pages.
  - Update backend endpoints in `server.js` if new API routes are needed.

## Examples
- To add a new inventory report:
  - Create `src/newreport.html`, `styles/newreport.css`, `scripts/newreport.js`.
  - Link the new page in the sidebar of all relevant HTML files.
  - Add backend logic in `server.js` if new data is required.

---

**For AI agents:**
- Always check for business logic in `scripts/` before duplicating code.
- Follow the Thai date and language conventions for UI and data.
- When in doubt about data structure, refer to the schema in `assets/` and sample data in `Database/`.
- See `manual.txt` for deployment and LAN access tips.
