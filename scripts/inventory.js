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
            controls: p.controls || '', // ✅ เก็บค่า controls
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
                controls: '',
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
                controls: '',
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
});