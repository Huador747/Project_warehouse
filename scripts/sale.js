import { BACKEND_URL } from './config.js';

let currentProductId = null;
function fillForm(product) {
    currentProductId = product._id;
    document.getElementById('productName').value = product.product_name || '';
    document.getElementById('productCode').value = product.product_code || '';
    document.getElementById('unit').value = product.unit || '';
    document.getElementById('condition').value = product.condition || '';
    document.getElementById('quantity').value = product.quantity || '';
    document.getElementById('total').value = product.total || '';
    document.getElementById('total_vat').value = product.total_vat || '';
    document.getElementById('profit').value = product.profit || '';
    document.getElementById('customerName').value = product.customerName || '';
    document.getElementById('date').value = product.date || '';

    // เรียกคำนวณยอดรวมถ้ามี
    if (typeof updateTotal === 'function') updateTotal();

    // ลบผลลัพธ์การค้นหา
    document.getElementById('search-result')?.remove();
    searchInput.value = '';
}

const searchInput = document.querySelector('.search-product-input');

searchInput.addEventListener('input', function () {
    const query = this.value.trim();
    document.getElementById('search-result')?.remove();

    if (!query) return;

    fetch(`${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(products => {
            const resultDiv = document.createElement('div');
            resultDiv.id = 'search-result';
            resultDiv.className = 'search-results-container';
            resultDiv.style.position = 'absolute';
            resultDiv.style.background = '#fff';
            resultDiv.style.border = '1px solid #ccc';
            resultDiv.style.width = searchInput.offsetWidth + 'px';
            resultDiv.style.zIndex = 9999;
            resultDiv.style.maxHeight = '250px';
            resultDiv.style.overflowY = 'auto';

            if (products.length === 0) {
                resultDiv.innerHTML = '<div class="no-results">ไม่พบสินค้า</div>';
            } else {
                resultDiv.innerHTML = products.map(p => `
                    <div class="search-item" style="padding:8px;cursor:pointer;" data-product='${JSON.stringify(p)}'>
                        <b>${p.product_code || ''}</b> - ${p.product_name || ''} <br>
                        <small>${p.model || ''} | ${p.maker || ''} | ${p.category || ''}</small>
                    </div>
                `).join('');
            }

            // แทรกผลลัพธ์ใต้ input
            searchInput.parentNode.insertBefore(resultDiv, searchInput.nextSibling);

            // Event เลือกสินค้า
            resultDiv.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', function () {
                    const product = JSON.parse(this.dataset.product);
                    fillForm(product);
                });
            });
        })
        .catch(err => {
            console.error('เกิดข้อผิดพลาดในการค้นหา:', err);
        });
});

// ปิดผลลัพธ์เมื่อคลิกข้างนอก
document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !document.getElementById('search-result')?.contains(e.target)) {
        document.getElementById('search-result')?.remove();
    }
});