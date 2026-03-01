import { BACKEND_URL } from './config.js';

let allProducts = [];
let filteredProducts = [];

// ฟังก์ชันดึงข้อมูลทั้งหมด
async function fetchAll() {
    const [productsRes, buyinRes, saleRes] = await Promise.all([
        fetch(`${BACKEND_URL}/products`).then(r => r.json()),
        fetch(`${BACKEND_URL}/buyin_product`).then(r => r.json()),
        fetch(`${BACKEND_URL}/sale_product`).then(r => r.json())
    ]);
    return { products: productsRes, buyin: buyinRes, sale: saleRes };
}

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// ฟังก์ชันคำนวณจำนวนคงเหลือจริง (ซื้อ - ขาย)
function computeRealStock(products, buyin, sale) {
    const stockMap = {};

    products.forEach(p => {
        const code = p.product_code || '';
        if (!code) return;
        
        stockMap[code] = {
            _id: p._id,
            product_code: code,
            product_name: p.product_name || '',
            model: p.model || '',
            maker: p.maker || '',
            category: p.category || '',
            sale_status: p.sale_status || 'ขายปกติ',
            unit: p.unit || '',
            location: p.location || '',
            // controls: p.controls || '', // ❌ ลบออก
            totalBuyin: 0,
            totalSale: 0,
            quantity: 0
        };
    });

    buyin.forEach(b => {
        const code = b.product_code || '';
        if (!code) return;

        if (!stockMap[code]) {
            stockMap[code] = {
                product_code: code,
                product_name: b.product_name || '',
                model: b.model || '',
                maker: b.maker || '',
                category: b.category || '',
                sale_status: 'ขายปกติ',
                unit: b.unit || '',
                location: '',
                // controls: '', // ❌ ลบออก
                totalBuyin: 0,
                totalSale: 0,
                quantity: 0
            };
        }

        const qty = toNumber(b.quantity || b.buyin_quantity || b.buy_quantity);
        stockMap[code].totalBuyin += qty;
    });

    sale.forEach(s => {
        const code = s.product_code || '';
        if (!code) return;

        if (!stockMap[code]) {
            stockMap[code] = {
                product_code: code,
                product_name: s.product_name || '',
                model: s.model || '',
                maker: s.maker || '',
                category: s.category || '',
                sale_status: 'ขายปกติ',
                unit: s.unit || '',
                location: '',
                // controls: '', // ❌ ลบออก
                totalBuyin: 0,
                totalSale: 0,
                quantity: 0
            };
        }

        const qty = toNumber(s.salequantity || s.sale_quantity || s.quantity);
        stockMap[code].totalSale += qty;
    });

    Object.values(stockMap).forEach(item => {
        item.quantity = item.totalBuyin - item.totalSale;
    });

    return Object.values(stockMap);
}

// ฟังก์ชันโหลดสินค้าและคำนวณจำนวนคงเหลือ
async function loadProducts() {
    try {
        const { products, buyin, sale } = await fetchAll();
        allProducts = computeRealStock(products || [], buyin || [], sale || []);
        applyFilters();
    } catch (error) {
        console.error('❌ Error loading products:', error);
    }
}

// ✅ ฟังก์ชันกรองแบบรวม (สถานะ + controls + คำค้นหา)
function applyFilters() {
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    filteredProducts = allProducts.filter(p => {
        // กรองสถานะการขาย
        if (statusFilter && p.sale_status !== statusFilter) {
            return false;
        }

        // กรองคำค้นหา
        if (searchQuery) {
            const matches = 
                (p.product_code && p.product_code.toLowerCase().includes(searchQuery)) ||
                (p.product_name && p.product_name.toLowerCase().includes(searchQuery)) ||
                (p.model && p.model.toLowerCase().includes(searchQuery));
            
            if (!matches) return false;
        }

        return true;
    });

    renderTable();
}

// ฟังก์ชันกรองตามสถานะ (เรียก applyFilters แทน)
function filterByStatus(status) {
    applyFilters();
}

// ฟังก์ชันกรองตามคำค้นหา (เรียก applyFilters แทน)
function filterBySearch(query) {
    applyFilters();
}

// ฟังก์ชันสร้าง badge จำนวนคงเหลือ
function createQuantityBadge(quantity, unit = '') {
    const qty = Number(quantity) || 0;
    let badgeClass = 'quantity-badge';
    let icon = '📦';

    if (qty === 0) {
        badgeClass += ' quantity-empty';
        icon = '';
    } else if (qty < 0) {
        badgeClass += ' quantity-negative';
        icon = '';
    } else if (qty <= 5) {
        badgeClass += ' quantity-low';
        icon = '';
    } else if (qty <= 20) {
        badgeClass += ' quantity-medium';
        icon = '';
    } else {
        badgeClass += ' quantity-high';
        icon = '';
    }

    return `<span class="${badgeClass}">${icon} ${qty}</span>`;
}

// ฟังก์ชันแสดงตาราง
// Pagination state
const PAGE_SIZE = 10;
let currentPage = 1;
let lastFilterCount = -1;

function getTotalPages() {
    return Math.max(1, Math.ceil((filteredProducts?.length || 0) / PAGE_SIZE));
}

function goToPage(page) {
    const total = getTotalPages();
    const newPage = Math.min(Math.max(1, page), total);
    if (newPage !== currentPage) {
        currentPage = newPage;
    }
    renderTable();
}

function renderPagination() {
    const container =
        document.getElementById('pagination') ||
        document.getElementById('inventory-pagination') ||
        document.querySelector('.pagination');

    if (!container) return;

    const prevBtn = container.querySelector('#prev-page');
    const nextBtn = container.querySelector('#next-page');
    const pageInfo = container.querySelector('#page-info');

    if (!prevBtn || !nextBtn || !pageInfo) return;

    const hasData = (filteredProducts?.length || 0) > 0;
    const total = getTotalPages();
    const current = hasData ? currentPage : 1;
    const totalDisplay = hasData ? total : 1;

    pageInfo.textContent = `หน้า ${current} / ${totalDisplay}`;

    prevBtn.disabled = !hasData || currentPage <= 1;
    nextBtn.disabled = !hasData || currentPage >= total;

    prevBtn.onclick = () => {
        if (!prevBtn.disabled) goToPage(currentPage - 1);
    };
    nextBtn.onclick = () => {
        if (!nextBtn.disabled) goToPage(currentPage + 1);
    };
}

function renderTable() {
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;

    // Reset to first page when filter result count changes
    if (lastFilterCount !== filteredProducts.length) {
        currentPage = 1;
        lastFilterCount = filteredProducts.length;
    }

    if (filteredProducts.length === 0) {
        // สร้าง 10 แถวเปล่า
        tbody.innerHTML = Array.from({length: 10}).map(() => `
            <tr>
                <td colspan="10" style="height:56px;"></td>
            </tr>
        `).join('');
        renderPagination();
        return;
    }

    const totalPages = getTotalPages();
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

    let rows = pageItems.map((product, index) => {
        const statusBadge = product.sale_status === 'ขายปกติ' 
            ? `<span class="status-badge status-active">ขายปกติ</span>`
            : `<span class="status-badge status-paused">พักการขาย</span>`;

        const quantityBadge = createQuantityBadge(product.quantity, product.unit);
        return `
            <tr data-sale-status="${product.sale_status || ''}">
                <td>${startIndex + index + 1}</td>
                <td>${product.product_code || '-'}</td>
                <td style="text-align: left;">-${product.model || '-'}</td>
                <td style="text-align: left;">-${product.product_name || '-'}</td>
                <td>${product.maker || '-'}</td>
                <td>${product.category || '-'}</td>
                <td>${statusBadge}</td>
                <td>${quantityBadge}</td>
                <td>${product.unit || '-'}</td>
                <td>${product.location || '-'}</td>
            </tr>
        `;
    });

    // เติมแถวเปล่าให้ครบ 10 แถว
    for (let i = pageItems.length; i < PAGE_SIZE; i++) {
        rows.push(`<tr><td colspan="10" style="height:56px;"></td></tr>`);
    }

    tbody.innerHTML = rows.join('');
    renderPagination();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }

    loadProducts();

    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    // Search filter
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('login.html');
    });

    // Report button
    document.getElementById("report-btn")?.addEventListener("click", async function (e) {
        e.preventDefault();

        // ดึงค่าตัวกรอง
        const status = document.getElementById("status-filter")?.value || "";
        const search = document.getElementById("search-input")?.value?.trim() || "";

        // ดึงข้อมูลล่าสุด
        const { products, buyin, sale } = await fetchAll();
        const stockList = computeRealStock(products, buyin, sale);

        // กรองข้อมูลตามสถานะและคำค้นหา
        let filtered = stockList.filter(p => {
            if (status && p.sale_status !== status) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    (p.product_code && p.product_code.toLowerCase().includes(q)) ||
                    (p.product_name && p.product_name.toLowerCase().includes(q)) ||
                    (p.model && p.model.toLowerCase().includes(q))
                );
            }
            return true;
        });

        // สรุปยอดรวม
        const totalProducts = filtered.length;
        const totalStock = filtered.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

        // สร้าง HTML สำหรับ Report
        const reportHtml = `
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            :root{
              --bg: #ffffff;
              --text: #111827;
              --muted: #6b7280;
              --border: #e5e7eb;
              --brand: #fbbf24;
              --brand-2: #f59e0b;
              --card: #ffffff;
              --tableHead: #fff7d6;
              --rowAlt: #fafafa;
              --shadow: 0 10px 25px rgba(17,24,39,.08);
              --shadow-sm: 0 2px 10px rgba(17,24,39,.08);
              --radius: 14px;
            }
            * { box-sizing: border-box; }
            body {
              font-family: "Sarabun", sans-serif;
              margin: 0;
              padding: 28px;
              color: var(--text);
              background: #f6f7fb;
            }
            .page {
              background: var(--bg);
              border: 1px solid var(--border);
              border-radius: 18px;
              box-shadow: var(--shadow);
              padding: 26px;
            }
            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              padding: 18px 18px;
              border-radius: var(--radius);
              background: linear-gradient(135deg, #fff7d6 0%, #ffffff 60%);
              border: 1px solid #fde68a;
            }
            .header h2{
              margin: 0;
              font-size: 1.35rem;
              letter-spacing: .2px;
            }
            .header .sub {
              margin-top: 6px;
              color: var(--muted);
              font-size: .95rem;
              line-height: 1.35;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 12px;
              border-radius: 999px;
              background: #111827;
              color: #fff;
              font-size: .85rem;
              white-space: nowrap;
              box-shadow: var(--shadow-sm);
            }
            .dot{
              width: 10px;
              height: 10px;
              border-radius: 999px;
              background: var(--brand-2);
              display: inline-block;
            }
            .filter-card{
              margin-top: 18px;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              box-shadow: var(--shadow-sm);
              padding: 18px 18px 14px;
            }
            .filter-title{
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin: 0 0 14px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid #fde68a;
            }
            .filter-title h3{
              margin: 0;
              font-size: 1.05rem;
              color: #1f2937;
            }
            .chip{
              padding: 6px 10px;
              border-radius: 999px;
              background: #fff7d6;
              border: 1px solid #fde68a;
              color: #92400e;
              font-size: .85rem;
              white-space: nowrap;
            }
            .filter-grid{
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px 16px;
              margin: 0;
              padding: 0;
              list-style: none;
            }
            .filter-grid li{
              display: flex;
              gap: 8px;
              align-items: baseline;
              color: #374151;
              font-size: .95rem;
              line-height: 1.4;
            }
            .filter-grid strong{
              color: #111827;
              font-weight: 700;
            }
            .summary-wrap{
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
              margin-top: 16px;
            }
            .summary-card{
              border: 1px solid var(--border);
              border-radius: var(--radius);
              background: var(--card);
              box-shadow: var(--shadow-sm);
              padding: 14px 16px;
            }
            .summary-label{
              color: var(--muted);
              font-size: .9rem;
              margin: 0 0 8px 0;
            }
            .summary-value{
              margin: 0;
              font-size: 1.25rem;
              font-weight: 800;
              letter-spacing: .2px;
            }
            .summary-meta{
              margin-top: 6px;
              color: #374151;
              font-size: .95rem;
            }
            .table-wrap{
              margin-top: 18px;
              border-radius: var(--radius);
              overflow: hidden;
              border: 1px solid var(--border);
              box-shadow: var(--shadow-sm);
              background: #fff;
            }
            table{
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              table-layout: fixed;
            }
            thead th{
              position: sticky;
              top: 0;
              z-index: 2;
              background: var(--tableHead);
              border-bottom: 1px solid var(--border);
              color: #1f2937;
              font-size: .9rem;
              text-align: left;
              padding: 10px 10px;
              white-space: nowrap;
            }
            tbody td{
              border-bottom: 1px solid var(--border);
              padding: 9px 10px;
              font-size: .9rem;
              color: #111827;
              vertical-align: top;
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            tbody tr:nth-child(even){
              background: var(--rowAlt);
            }
            tbody tr:hover{
              background: #fff7d6;
            }
            .num { text-align: right; font-variant-numeric: tabular-nums; }
            .center { text-align: center; }
            .action-buttons{
              display: flex;
              gap: 12px;
              margin-top: 18px;
              justify-content: flex-end;
            }
            .btn{
              appearance: none;
              border: 1px solid #fcd34d;
              background: linear-gradient(180deg, #ffd336 0%, #fbbf24 100%);
              padding: 10px 18px;
              border-radius: 10px;
              cursor: pointer;
              font-size: .95rem;
              font-weight: 700;
              color: #111827;
              box-shadow: var(--shadow-sm);
              transition: transform .12s ease, box-shadow .12s ease;
              min-width: 150px;
            }
            .btn:hover{
              transform: translateY(-1px);
              box-shadow: 0 12px 24px rgba(17,24,39,.10);
            }
            @media print{
              body{ background: #fff; padding: 0; }
              .page{ box-shadow: none; border: none; padding: 0; }
              .action-buttons{ display: none !important; }
              thead th{ position: static; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { margin: 0.6cm; size: A4; }
            }
            @media (max-width: 920px){
              body{ padding: 14px; }
              .summary-wrap{ grid-template-columns: 1fr; }
              .filter-grid{ grid-template-columns: 1fr; }
              thead th, tbody td{ font-size: .85rem; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <h2>รายงานสรุปจำนวนคงเหลือสินค้า</h2>
                <div class="sub">สรุปยอดและรายละเอียดสินค้าตามตัวกรองรายงาน</div>
              </div>
              <div class="badge"><span class="dot"></span> Report</div>
            </div>
            <div class="filter-card">
              <div class="filter-title">
                <h3>ตัวกรองรายงาน</h3>
                <div class="chip">${status ? status : "ทุกสถานะ"}</div>
              </div>
              <ul class="filter-grid">
                <li>สถานะ: <strong>${status ? status : "ทุกสถานะ"}</strong></li>
                <li>คำค้นหา: <strong>${search ? search : "ไม่ระบุ"}</strong></li>
                <li>จำนวนสินค้า: <strong>${totalProducts}</strong></li>
                <li>จำนวนคงเหลือรวม: <strong>${totalStock.toLocaleString("th-TH")}</strong></li>
              </ul>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:60px;">ลำดับ</th>
                    <th style="width:90px;">รหัสสินค้า</th>
                    <th style="width:120px;">โมเดล</th>
                    <th style="width:160px;">ชื่อสินค้า</th>
                    <th style="width:90px;">ผู้ผลิต</th>
                    <th style="width:90px;">หมวดหมู่</th>
                    <th style="width:90px;">สถานะขาย</th>
                    <th style="width:90px;" class="num">จำนวนคงเหลือ</th>
                    <th style="width:65px;">หน่วย</th>
                    <th style="width:90px;">ที่เก็บ</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((p, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${p.product_code || '-'}</td>
                      <td>${p.model || '-'}</td>
                      <td>${p.product_name || '-'}</td>
                      <td>${p.maker || '-'}</td>
                      <td>${p.category || '-'}</td>
                      <td>${p.sale_status || '-'}</td>
                      <td class="num">${Number(p.quantity).toLocaleString("th-TH")}</td>
                      <td>${p.unit || '-'}</td>
                      <td>${p.location || '-'}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <div class="action-buttons">
              <button class="btn" onclick="window.print()">Print</button>
            </div>
          </div>
        </body>
        </html>
        `;

        // เปิดหน้าต่างใหม่แสดงรายงาน
        const reportWin = window.open("", "_blank", "width=900,height=1200");
        reportWin.document.write(reportHtml);
        reportWin.document.title = "รายงานสรุปจำนวนคงเหลือสินค้า";
        reportWin.document.close();
    });
});