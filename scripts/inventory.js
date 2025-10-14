import { BACKEND_URL } from './config.js';

async function fetchProducts() {
    const res = await fetch(`${BACKEND_URL}/products`);
    return await res.json();
}

function renderTable(products, search = '') {
    const tbody = document.querySelector('#inventory-table tbody');
    tbody.innerHTML = '';
    products
        .filter(p => {
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                (p.product_code || '').toLowerCase().includes(s) ||
                (p.product_name || '').toLowerCase().includes(s) ||
                (p.model || '').toLowerCase().includes(s) ||
                (p.category || '').toLowerCase().includes(s)
            );
        })
        .forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.product_code || '-'}</td>
                <td>${p.product_name || '-'}</td>
                <td>${p.model || '-'}</td>
                <td>${p.category || '-'}</td>
                <td>${p.quantity ?? '-'}</td>
                <td>${p.unit || '-'}</td>
                <td>${p.location || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
}

async function main() {
    const products = await fetchProducts();
    renderTable(products);

    document.getElementById('search-input').addEventListener('input', function() {
        renderTable(products, this.value.trim());
    });
}

main();