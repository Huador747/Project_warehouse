const backendHost = window.location.hostname;

function animateCounter(element, to, duration = 800) {
    const from = parseInt(element.textContent) || 0;
    const start = performance.now();
    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.floor(from + (to - from) * progress);
        element.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

document.addEventListener('DOMContentLoaded', async function() {
    // ดึงข้อมูลสินค้า
    try {
        const res = await fetch(`http://${backendHost}:3000/products`);
        const products = await res.json();
        window.allProducts = products; // เก็บไว้ใช้กับ pagination
        window.currentPage = 1;
        renderProductsTablePage(products, 1);

        // Animated counter
        // 1. จำนวนสินค้าทั้งหมด
        const totalProductsElem = document.getElementById('total-products');
        if (totalProductsElem) animateCounter(totalProductsElem, products.length, 800);

        // 2. จำนวนประเภทสินค้า (นับ category ที่ไม่ซ้ำ)
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        const totalCategoriesElem = document.getElementById('total-categories');
        if (totalCategoriesElem) animateCounter(totalCategoriesElem, categories.length, 800);

        // 3. พร้อมขาย (เช่น condition == "พร้อมขาย" หรือกำหนดเอง)
        const available = products.filter(p => p.condition === "พร้อมขาย").length;
        const totalAvailableElem = document.getElementById('total-available');
        if (totalAvailableElem) animateCounter(totalAvailableElem, available, 800);

        // 4. ไม่พร้อมขาย (เช่น condition == "ไม่พร้อมขาย" หรือกำหนดเอง)
        const unavailable = products.filter(p => p.condition === "ไม่พร้อมขาย").length;
        const totalUnavailableElem = document.getElementById('total-unavailable');
        if (totalUnavailableElem) animateCounter(totalUnavailableElem, unavailable, 800);

    } catch (err) {
        document.getElementById('product-list').innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า</div>';
    }
});

function renderProductsTablePage(products, page) {
    const container = document.getElementById('product-list');
    const perPage = 7;
    const totalPages = Math.ceil(products.length / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageProducts = products.slice(start, end);

    let html = `
        <div class="product-table">
        <table>
            <thead>
                <tr>
                    <th>รหัสสินค้า</th>
                    <th>Model</th>
                    <th>ชื่อสินค้า</th>
                    <th>Maker</th>
                    <th>หมวดหมู่</th>
                    <th>จำนวน</th>
                    <th>สภาพ</th>
                    <th>ราคา</th>
                    <th>ราคาขาย</th>
                    <th>หน่วย</th>
                    <th>ที่เก็บ</th>
                    <th>วันที่สร้าง</th>
                    <th>เวลาสร้าง</th>
                    <th>วันที่แก้ไข</th>
                    <th>เวลาแก้ไข</th>
                    <th>รูปภาพ</th>
                </tr>
            </thead>
            <tbody>
    `;
    html += pageProducts.map(product => `
        <tr>
            <td>${product.product_code || '-'}</td>
            <td>${product.model || '-'}</td>
            <td>${product.product_name || '-'}</td>
            <td>${product.maker || '-'}</td>
            <td>${product.category || '-'}</td>
            <td>${product.quantity ?? '-'}</td>
            <td>${product.condition || '-'}</td>
            <td>${product.price ?? '-'}</td>
            <td>${product.sale_price || '-'}</td>
            <td>${product.unit || '-'}</td>
            <td>${product.location || '-'}</td>
            <td>${product.createdDate || '-'}</td>
            <td>${product.createdTime || '-'}</td>
            <td>${product.updatedDate ? product.updatedDate : 'ยังไม่มีการแก้ไข'}</td>
            <td>${product.updatedTime ? product.updatedTime : 'ยังไม่มีการแก้ไข'}</td>
            <td>
                ${product.image 
                    ? `<img src="${product.image}" alt="img" style="width:60px;height:60px;object-fit:contain;border-radius:8px;">`
                    : '-'}
            </td>
        </tr>
    `).join('');
    html += `
            </tbody>
        </table>
        <div class="pagination-controls">
            <button id="prev-page" ${page === 1 ? 'disabled' : ''}>ย้อนกลับ</button>
            <span>หน้า ${page} / ${totalPages}</span>
            <button id="next-page" ${page === totalPages ? 'disabled' : ''}>ถัดไป</button>
        </div>
        </div>
    `;
    container.innerHTML = html;

    // เพิ่ม event scroll แนวนอนหลัง render ตาราง
    const tableBox = container.querySelector('.product-table');
    if (tableBox) {
        tableBox.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tableBox.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    // เพิ่ม event ให้ปุ่ม
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (page > 1) {
            window.currentPage = page - 1;
            renderProductsTablePage(window.allProducts, window.currentPage);
        }
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
        if (page < totalPages) {
            window.currentPage = page + 1;
            renderProductsTablePage(window.allProducts, window.currentPage);
        }
    });
}