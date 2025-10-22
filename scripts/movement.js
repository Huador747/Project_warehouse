import { BACKEND_URL } from './config.js';

const ctx = document.getElementById('movementChart').getContext('2d');
let chart;

const productSelect = document.getElementById('product-select');
const inventoryInfo = document.getElementById('inventory-info');

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

async function fetchAll() {
    try {
        const [productsRes, buyinRes, saleRes] = await Promise.all([
            fetch(`${BACKEND_URL}/products`).then(r => r.json()).catch(()=>[]),
            fetch(`${BACKEND_URL}/buyin_product`).then(r => r.json()).catch(()=>[]),
            fetch(`${BACKEND_URL}/sale_product`).then(r => r.json()).catch(()=>[])
        ]);
        return {
            products: Array.isArray(productsRes) ? productsRes : [],
            buyin: Array.isArray(buyinRes) ? buyinRes : [],
            sale: Array.isArray(saleRes) ? saleRes : []
        };
    } catch (err) {
        console.error('fetchAll error', err);
        return { products: [], buyin: [], sale: [] };
    }
}

// คำนวณสต็อกจาก products + ประวัติซื้อ/ขาย และเก็บข้อมูลต้นทุนจากการซื้อ
function computeInventory(products, buyin, sale) {
    const map = {};

    // init จาก products
    (products || []).forEach(p => {
        const code = p.product_code ?? p.code ?? (p._id ? String(p._id) : '');
        if (!code) return;
        map[code] = {
            product_code: code,
            product_name: p.product_name ?? p.name ?? '-',
            qty: toNumber(p.quantity ?? p.qty ?? p.stock ?? 0),
            productObj: p,
            buyTotalQty: 0,
            buyTotalCost: 0
        };
    });

    // accumulate buyin (เพิ่มจำนวน และรวมต้นทุนเพื่อคำนวณ average cost)
    (buyin || []).forEach(b => {
        const code = b.product_code ?? b.code ?? '';
        if (!code) return;
        if (!map[code]) map[code] = { product_code: code, product_name: b.product_name ?? b.name ?? '-', qty: 0, productObj: {}, buyTotalQty: 0, buyTotalCost: 0 };
        const q = toNumber(b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0);
        // หา cost per unit ในรายการซื้อ
        const price = toNumber(b.price ?? b.buy_price ?? b.unit_price ?? 0);
        const total = toNumber(b.total ?? 0) || (q * price);
        map[code].qty += q;
        map[code].buyTotalQty += q;
        map[code].buyTotalCost += total;
    });

    // subtract sale
    (sale || []).forEach(s => {
        const code = s.product_code ?? s.code ?? '';
        if (!code) return;
        if (!map[code]) map[code] = { product_code: code, product_name: s.product_name ?? s.name ?? '-', qty: 0, productObj: {}, buyTotalQty: 0, buyTotalCost: 0 };
        const q = toNumber(s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0);
        map[code].qty -= q;
    });

    return map;
}

// ประเมินต้นทุนต่อหน่วย: ใช้จาก product field ถ้ามี มิฉะนั้นใช้ average buy price หากมี
function estimateUnitCost(mapEntry, buyinList) {
    const p = mapEntry.productObj || {};
    const priceKeys = ['cost','cost_price','price','buy_price','unit_cost','purchase_price'];
    for (const k of priceKeys) {
        if (k in p && p[k] != null && p[k] !== '') return toNumber(p[k]);
    }
    // ถ้ามีข้อมูลรวมจาก computeInventory
    if (mapEntry.buyTotalQty && mapEntry.buyTotalQty > 0) {
        return mapEntry.buyTotalCost / mapEntry.buyTotalQty;
    }
    // fallback: ค้นหาในรายการซื้อแยก (ถ้ากรณี mapEntry ไม่มี buys)
    if (buyinList && buyinList.length) {
        const buys = buyinList.filter(b => (b.product_code ?? b.code ?? '') === mapEntry.product_code);
        let totalQty = 0, totalCost = 0;
        buys.forEach(b => {
            const q = toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0);
            const price = toNumber(b.price ?? b.buy_price ?? 0);
            const total = toNumber(b.total ?? (price * q));
            totalQty += q;
            totalCost += total;
        });
        if (totalQty) return totalCost / totalQty;
    }
    return 0;
}

function renderInventorySummary(entries) {
    // แสดงเฉพาะจำนวนเงินจมรวมเท่านั้น
    const totalSunk = (entries || []).reduce((s, e) => s + toNumber(e.sunk), 0);
    inventoryInfo.textContent = `เงินจมรวม: ${totalSunk.toLocaleString('th-TH')} บาท`;
}

async function showInventoryInfo(productCode = '') {
    const { products, buyin, sale } = await fetchAll();
    const map = computeInventory(products, buyin, sale);
    const allEntries = Object.values(map).map(e => {
        const cost = estimateUnitCost(e, buyin);
        const sunk = toNumber(e.qty) * toNumber(cost);
        return { code: e.product_code, name: e.product_name || (e.productObj.product_name ?? '-'), qty: toNumber(e.qty), cost: toNumber(cost), sunk: toNumber(sunk) };
    });

    const filtered = productCode ? allEntries.filter(x => x.code === productCode) : allEntries;
    renderInventorySummary(filtered);
}

// สร้าง dropdown สินค้า (เติมเมื่อมีข้อมูล)
async function populateProductSelect() {
    const { products } = await fetchAll();
    // เก็บตัวเลือกเดิม (index 0 = "ทั้งหมด")
    const existingFirst = productSelect.options.length ? productSelect.options[0].outerHTML : null;
    productSelect.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'ทั้งหมด';
    productSelect.appendChild(optAll);
    (products || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.product_code ?? p.code ?? (p._id ? String(p._id) : '');
        opt.textContent = `${opt.value} - ${p.product_name ?? p.name ?? '-'}`;
        productSelect.appendChild(opt);
    });
}

async function fetchStats(type = 'month', productCode = '') {
    // ใช้ข้อมูลจาก buyin/sale เพื่อวาด chart เหมือนเดิม แต่กันกรณี field ต่างกันอย่างยืดหยุ่น
    const { products, buyin, sale } = await fetchAll();
    // สร้าง dropdown สินค้า ถ้ายังไม่สร้าง
    if (productSelect.options.length <= 1) await populateProductSelect();

    const now = new Date();
    let labels = [];
    let buyinSummary = [];
    let saleSummary = [];

    const safeDate = (d) => {
        try { return new Date(d); } catch { return new Date(NaN); }
    };

    if (type === 'year') {
        const years = [];
        for (let i = 4; i >= 0; i--) years.push(now.getFullYear() - i);
        labels = years.map(y => y.toString());
        buyinSummary = years.map(y =>
            buyin.filter(b => {
                const dt = safeDate(b.buyindate ?? b.date);
                return !isNaN(dt) && dt.getFullYear() === y && (!productCode || (b.product_code ?? b.code) === productCode);
            }).reduce((sum, b) => sum + toNumber(b.total ?? (toNumber(b.price ?? b.buy_price) * toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0))), 0)
        );
        saleSummary = years.map(y =>
            sale.filter(s => {
                const dt = safeDate(s.saleoutdate ?? s.date);
                return !isNaN(dt) && dt.getFullYear() === y && (!productCode || (s.product_code ?? s.code) === productCode);
            }).reduce((sum, s) => sum + toNumber(s.total ?? (toNumber(s.sale_price ?? s.price) * toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0))), 0)
        );
    } else if (type === 'quarter') {
        const year = now.getFullYear();
        labels = [
            'ไตรมาสที่ 1\nมกราคม - มีนาคม', 
            'ไตรมาสที่ 2\nเมษายน - มิถุนายน', 
            'ไตรมาสที่ 3\nกรกฎาคม - กันยายน', 
            'ไตรมาสที่ 4\nตุลาคม - ธันวาคม'
        ];
        buyinSummary = [1,2,3,4].map(q =>
            buyin.filter(b => {
                const dt = safeDate(b.buyindate ?? b.date);
                return !isNaN(dt) && dt.getFullYear() === year && Math.floor(dt.getMonth()/3)+1 === q && (!productCode || (b.product_code ?? b.code) === productCode);
            }).reduce((sum, b) => sum + toNumber(b.total ?? (toNumber(b.price ?? b.buy_price) * toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0))), 0)
        );
        saleSummary = [1,2,3,4].map(q =>
            sale.filter(s => {
                const dt = safeDate(s.saleoutdate ?? s.date);
                return !isNaN(dt) && dt.getFullYear() === year && Math.floor(dt.getMonth()/3)+1 === q && (!productCode || (s.product_code ?? s.code) === productCode);
            }).reduce((sum, s) => sum + toNumber(s.total ?? (toNumber(s.sale_price ?? s.price) * toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0))), 0)
        );
    } else {
        const year = now.getFullYear();
        labels = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        buyinSummary = Array.from({length:12}, (_,i) =>
            buyin.filter(b => {
                const dt = safeDate(b.buyindate ?? b.date);
                return !isNaN(dt) && dt.getFullYear() === year && dt.getMonth() === i && (!productCode || (b.product_code ?? b.code) === productCode);
            }).reduce((sum, b) => sum + toNumber(b.total ?? (toNumber(b.price ?? b.buy_price) * toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0))), 0)
        );
        saleSummary = Array.from({length:12}, (_,i) =>
            sale.filter(s => {
                const dt = safeDate(s.saleoutdate ?? s.date);
                return !isNaN(dt) && dt.getFullYear() === year && dt.getMonth() === i && (!productCode || (s.product_code ?? s.code) === productCode);
            }).reduce((sum, s) => sum + toNumber(s.total ?? (toNumber(s.sale_price ?? s.price) * toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0))), 0)
        );
    }

    return { labels, buyinSummary, saleSummary };
}

async function renderChart(type = 'month', productCode = '') {
    const { labels, buyinSummary, saleSummary } = await fetchStats(type, productCode);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: productCode ? `ยอดซื้อสินค้ารหัส ${productCode} (บาท)` : 'ยอดซื้อ (บาท)',
                    data: buyinSummary,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: productCode ? `ยอดขายสินค้ารหัส ${productCode} (บาท)` : 'ยอดขาย (บาท)',
                    data: saleSummary,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        callback: function(val) {
                            // แยกข้อความตาม \n และคืนค่าเป็น array เพื่อให้แสดงหลายบรรทัด
                            const label = this.getLabelForValue(val);
                            return label.split('\n');
                        }
                    }
                }
            }
        }
    });
}

// event listeners
document.getElementById('period-type').addEventListener('change', function() {
    renderChart(this.value, productSelect.value);
    showInventoryInfo(productSelect.value);
});
productSelect.addEventListener('change', function() {
    renderChart(document.getElementById('period-type').value, this.value);
    showInventoryInfo(this.value);
});

//กดให้sidebarค้างไว้
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');

    // Toggle sidebar
    hamburger?.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('sidebar-open');
    });

    // ปิด sidebar เมื่อคลิกนอก
    document.addEventListener('click', function(ev) {
        if (!sidebar.contains(ev.target) && !hamburger.contains(ev.target)) {
            sidebar.classList.remove('sidebar-open');
            hamburger.classList.remove('active');
        }
    });
});
//กดให้sidebarค้างไว้

// init
(async function init() {
    await populateProductSelect();
    renderChart('month');
    showInventoryInfo('');
})();