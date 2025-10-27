import { BACKEND_URL } from './config.js';

const rowsPerPage = 10;
let currentPage = 1;
let filteredStock = [];

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

function computeStock(products, buyin, sale) {
    const map = {};
    products.forEach(p => {
        const code = p.product_code ?? (p._id ? String(p._id) : '');
        map[code] = {
            product_code: code,
            product_name: p.product_name ?? p.name ?? '',
            model: p.model ?? '',
            category: p.category ?? p.cat ?? '',
            quantity: typeof p.quantity === 'number' ? p.quantity : toNumber(p.quantity),
            unit: p.unit ?? '',
            location: p.location ?? ''
        };
    });

    buyin.forEach(b => {
        const code = b.product_code ?? '';
        if (!map[code]) {
            map[code] = {
                product_code: code,
                product_name: b.product_name ?? b.name ?? '',
                model: b.model ?? '',
                category: b.category ?? '',
                quantity: 0,
                unit: b.unit ?? '',
                location: ''
            };
        }
        const qty = toNumber(b.quantity ?? b.buyquantity ?? b.buy_quantity);
        map[code].quantity = toNumber(map[code].quantity) + qty;
        if (!map[code].product_name) map[code].product_name = b.product_name ?? b.name ?? '';
        if (!map[code].category) map[code].category = b.category ?? '';
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });

    sale.forEach(s => {
        const code = s.product_code ?? '';
        if (!map[code]) {
            map[code] = {
                product_code: code,
                product_name: s.product_name ?? s.name ?? '',
                model: s.model ?? '',
                category: s.category ?? '',
                quantity: 0,
                unit: s.unit ?? '',
                location: ''
            };
        }
        const qty = toNumber(s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.sell_quantity ?? s.sellqty);
        map[code].quantity = toNumber(map[code].quantity) - qty;
        if (!map[code].product_name) map[code].product_name = s.product_name ?? s.name ?? '';
        if (!map[code].category) map[code].category = s.category ?? '';
    });

    return Object.values(map);
}

function renderStockPaged(stockList, page = 1, search = '') {
    const tbody = document.querySelector('#stock-table tbody');
    tbody.innerHTML = '';
    const q = (search || '').toLowerCase();
    filteredStock = stockList
        .filter(item => {
            if (!q) return true;
            return (
                (item.product_code || '').toLowerCase().includes(q) ||
                (item.product_name || '').toLowerCase().includes(q) ||
                (item.model || '').toLowerCase().includes(q) ||
                (item.category || '').toLowerCase().includes(q)
            );
        })
        .sort((a, b) => (a.product_code || '').localeCompare(b.product_code || ''));

    const totalPages = Math.ceil(filteredStock.length / rowsPerPage);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages || 1;
    currentPage = page;

    const startIdx = (page - 1) * rowsPerPage;
    const pageItems = filteredStock.slice(startIdx, startIdx + rowsPerPage);

    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        const qty = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
        const qtyTxt = qty.toString();
        tr.innerHTML = `
            <td>${item.product_code || '-'}</td>
            <td>${item.product_name || '-'}</td>
            <td>${item.model || '-'}</td>
            <td>${item.category || '-'}</td>
            <td class="${qty < 0 ? 'negative' : ''}">${qtyTxt}</td>
        `;
        tbody.appendChild(tr);
    });

    // เพิ่มแถวว่างให้ครบ 10 แถว
    const emptyRows = rowsPerPage - pageItems.length;
    if (emptyRows > 0) {
        for (let i = 0; i < emptyRows; i++) {
            const tr = document.createElement('tr');
            tr.className = 'empty-row';
            tr.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            `;
            tbody.appendChild(tr);
        }
    }

    // อัพเดท pagination
    renderPagination(filteredStock.length, currentPage, rowsPerPage);
}

function renderPagination(totalItems, page, perPage) {
    const totalPages = Math.ceil(totalItems / perPage);
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (pageInfo) pageInfo.textContent = `หน้า ${page} / ${totalPages || 1}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (page > 1) renderStockPaged(filteredStock, page - 1, document.getElementById('search-input')?.value || '');
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (page < totalPages) renderStockPaged(filteredStock, page + 1, document.getElementById('search-input')?.value || '');
        };
    }
}

async function main() {
    try {
        const { products, buyin, sale } = await fetchAll();
        const stock = computeStock(products || [], buyin || [], sale || []);
        renderStockPaged(stock, 1);

        const input = document.getElementById('search-input');
        if (input) {
            input.addEventListener('input', function() {
                renderStockPaged(stock, 1, this.value.trim());
            });
        }
    } catch (err) {
        console.error('inventory error', err);
    }
}

main();

document.addEventListener('DOMContentLoaded', () => {
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }
});