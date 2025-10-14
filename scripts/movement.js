import { BACKEND_URL } from './config.js';

const ctx = document.getElementById('movementChart').getContext('2d');
let chart;

const productSelect = document.getElementById('product-select');
const inventoryInfo = document.getElementById('inventory-info');

async function fetchProducts() {
    const res = await fetch(`${BACKEND_URL}/products`);
    return await res.json();
}

async function fetchStats(type = 'month', productCode = '') {
    const [buyin, sale, products] = await Promise.all([
        fetch(`${BACKEND_URL}/buyin_product`).then(r => r.json()),
        fetch(`${BACKEND_URL}/sale_product`).then(r => r.json()),
        fetchProducts()
    ]);

    // สร้าง dropdown สินค้า (ครั้งแรก)
    if (productSelect.options.length <= 1) {
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.product_code;
            opt.textContent = `${p.product_code} - ${p.product_name}`;
            productSelect.appendChild(opt);
        });
    }

    const now = new Date();
    let labels = [];
    let buyinSummary = [];
    let saleSummary = [];

    if (type === 'year') {
        const years = [];
        for (let i = 4; i >= 0; i--) years.push(now.getFullYear() - i);
        labels = years.map(y => y.toString());

        buyinSummary = years.map(y =>
            buyin.filter(b => new Date(b.buyindate).getFullYear() === y && (!productCode || b.product_code === productCode))
                 .reduce((sum, b) => sum + (b.total || 0), 0)
        );
        saleSummary = years.map(y =>
            sale.filter(s => new Date(s.saleoutdate).getFullYear() === y && (!productCode || s.product_code === productCode))
                .reduce((sum, s) => sum + (s.total || 0), 0)
        );
    } else if (type === 'quarter') {
        const year = now.getFullYear();
        labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        buyinSummary = [1,2,3,4].map(q =>
            buyin.filter(b => {
                const d = new Date(b.buyindate);
                return d.getFullYear() === year && Math.floor(d.getMonth()/3)+1 === q && (!productCode || b.product_code === productCode);
            }).reduce((sum, b) => sum + (b.total || 0), 0)
        );
        saleSummary = [1,2,3,4].map(q =>
            sale.filter(s => {
                const d = new Date(s.saleoutdate);
                return d.getFullYear() === year && Math.floor(d.getMonth()/3)+1 === q && (!productCode || s.product_code === productCode);
            }).reduce((sum, s) => sum + (s.total || 0), 0)
        );
    } else {
        const year = now.getFullYear();
        labels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        buyinSummary = Array.from({length:12}, (_,i) =>
            buyin.filter(b => {
                const d = new Date(b.buyindate);
                return d.getFullYear() === year && d.getMonth() === i && (!productCode || b.product_code === productCode);
            }).reduce((sum, b) => sum + (b.total || 0), 0)
        );
        saleSummary = Array.from({length:12}, (_,i) =>
            sale.filter(s => {
                const d = new Date(s.saleoutdate);
                return d.getFullYear() === year && d.getMonth() === i && (!productCode || s.product_code === productCode);
            }).reduce((sum, s) => sum + (s.total || 0), 0)
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
                legend: { position: 'top' },
                title: { display: true, text: productCode ? 'กราฟยอดซื้อ-ขายสินค้าชิ้นเดียว' : 'กราฟการเคลื่อนไหวของสินค้าและจำนวนเงิน' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function showInventoryInfo(productCode = '') {
    const products = await fetchProducts();
    let info = '';
    if (productCode) {
        const p = products.find(x => x.product_code === productCode);
        if (p) {
            const sunkMoney = (p.quantity ?? 0) * (p.price ?? 0);
            info = `เงินจมของสินค้ารหัส ${productCode} (${p.product_name}): ${sunkMoney.toLocaleString()} บาท (จำนวนคงเหลือ ${p.quantity ?? 0} × ราคาต้นทุน ${p.price ?? 0})`;
        } else {
            info = 'ไม่พบข้อมูลสินค้า';
        }
    } else {
        // รวมเงินจมทุกสินค้า
        const totalSunk = products.reduce((sum, p) => sum + ((p.quantity ?? 0) * (p.price ?? 0)), 0);
        info = `เงินจมรวมสินค้าทั้งหมด: ${totalSunk.toLocaleString()} บาท`;
    }
    inventoryInfo.textContent = info;
}

// เรียกใช้ทุกครั้งที่เลือกสินค้าใหม่
document.getElementById('period-type').addEventListener('change', function() {
    renderChart(this.value, productSelect.value);
    showInventoryInfo(productSelect.value);
});
productSelect.addEventListener('change', function() {
    renderChart(document.getElementById('period-type').value, this.value);
    showInventoryInfo(this.value);
});

// เรียกครั้งแรก
renderChart('month');
showInventoryInfo('');