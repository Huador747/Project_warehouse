import { BACKEND_URL } from './config.js';

async function fetchHistory() {
    const [buyinRes, saleRes] = await Promise.all([
        fetch(`${BACKEND_URL}/buyin_product`).then(r => r.json()),
        fetch(`${BACKEND_URL}/sale_product`).then(r => r.json())
    ]);
    return { buyin: buyinRes, sale: saleRes };
}

function summarizeStock(buyin, sale) {
    // สรุปจำนวนคงเหลือแต่ละ product_code
    const stock = {};
    buyin.forEach(item => {
        if (!stock[item.product_code]) {
            stock[item.product_code] = {
                product_code: item.product_code,
                product_name: item.product_name,
                model: item.model,
                category: item.category,
                quantity: 0
            };
        }
        stock[item.product_code].quantity += Number(item.quantity) || 0;
    });
    sale.forEach(item => {
        if (!stock[item.product_code]) {
            stock[item.product_code] = {
                product_code: item.product_code,
                product_name: item.product_name,
                model: item.model,
                category: item.category,
                quantity: 0
            };
        }
        stock[item.product_code].quantity -= Number(item.salequantity) || 0;
    });
    return Object.values(stock);
}

function renderStockTable(stockList) {
    const tbody = document.querySelector('#stock-table tbody');
    tbody.innerHTML = '';
    stockList.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.product_code || '-'}</td>
            <td>${item.product_name || '-'}</td>
            <td>${item.model || '-'}</td>
            <td>${item.category || '-'}</td>
            <td>${item.quantity}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderHistoryTable(buyin, sale, search = '') {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';
    // รวมและเรียงตามวันที่ (ใหม่สุดก่อน)
    const all = [
        ...buyin.map(item => ({...item, type: 'ซื้อ', date: item.buyindate, qty: item.quantity, price: item.price, total: item.total, partner: '-', note: item.note })),
        ...sale.map(item => ({...item, type: 'ขาย', date: item.saleoutdate, qty: item.salequantity, price: item.sale_price, total: item.total, partner: item.customerName, note: item.notesale }))
    ];
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    all.forEach(item => {
        // filter
        if (search && !(
            (item.product_code || '').toLowerCase().includes(search) ||
            (item.product_name || '').toLowerCase().includes(search) ||
            (item.model || '').toLowerCase().includes(search) ||
            (item.category || '').toLowerCase().includes(search)
        )) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date ? new Date(item.date).toLocaleDateString('th-TH') : '-'}</td>
            <td>${item.type}</td>
            <td>${item.product_code || '-'}</td>
            <td>${item.product_name || '-'}</td>
            <td>${item.model || '-'}</td>
            <td>${item.qty || '-'}</td>
            <td>${item.price || '-'}</td>
            <td>${item.total || '-'}</td>
            <td>${item.partner || '-'}</td>
            <td>${item.note || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function main() {
    const { buyin, sale } = await fetchHistory();
    let stockList = summarizeStock(buyin, sale);
    renderStockTable(stockList);
    renderHistoryTable(buyin, sale);

    // ค้นหา
    document.getElementById('search-input').addEventListener('input', function() {
        const search = this.value.trim().toLowerCase();
        renderHistoryTable(buyin, sale, search);
    });
}

main();