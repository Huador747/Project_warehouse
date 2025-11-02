import { BACKEND_URL } from './config.js';

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let allProducts = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();

    // Hamburger menu
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    hamburger?.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });

    // ฟังก์ชันตรวจสอบการล็อกอิน
    function checkLogin() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            window.location.replace('login.html');
        }
    }

    // โหลดรายการสินค้า
    async function loadProducts() {
        try {
            const response = await fetch(`${BACKEND_URL}/products`);
            const products = await response.json();
            allProducts = products;
            filteredProducts = products;
            currentPage = 1;
            renderProducts();
        } catch (error) {
            console.error('❌ Error loading products:', error);
            document.getElementById('product-list').innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        }
    }

    // แสดงสินค้าแบบแบ่งหน้า (10 รายการต่อหน้า)
    function renderProducts() {
        const productList = document.getElementById('product-list');
        
        if (!filteredProducts || filteredProducts.length === 0) {
            productList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">ไม่พบสินค้า</div>';
            updatePagination(0);
            return;
        }

        // คำนวณหน้าที่แสดง
        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const pageProducts = filteredProducts.slice(startIdx, endIdx);

        // สร้างตาราง
        let html = `
            <table class="product-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"></th>
                        <th>รหัสสินค้า</th>
                        <th>ชื่อสินค้า</th>
                        <th>รุ่น</th>
                        <th>ผู้ผลิต</th>
                        <th>ประเภท</th>
                        <th>ราคา</th>
                        <th>หน่วย</th>
                        <th>ตำแหน่ง</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // แสดงสินค้าในหน้านี้
        for (const p of pageProducts) {
            html += `
                <tr>
                    <td style="text-align: center;">
                        <input type="checkbox" class="delete-checkbox" data-id="${p._id}">
                    </td>
                    <td>${p.product_code || '-'}</td>
                    <td>${p.product_name || '-'}</td>
                    <td>${p.model || '-'}</td>
                    <td>${p.maker || '-'}</td>
                    <td>${p.category || '-'}</td>
                    <td>${p.price || '-'}</td>
                    <td>${p.unit || '-'}</td>
                    <td>${p.location || '-'}</td>
                </tr>
            `;
        }

        // เติมแถวว่างให้ครบ 10 แถว
        const emptyRows = ITEMS_PER_PAGE - pageProducts.length;
        if (emptyRows > 0) {
            for (let i = 0; i < emptyRows; i++) {
                html += `
                    <tr class="empty-row" style="height: 48px; background-color: #f9f9f9; opacity: 0.5;">
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                `;
            }
        }

        html += `</tbody></table>`;
        productList.innerHTML = html;

        // อัปเดต pagination
        updatePagination(totalPages);
    }

    // อัปเดตปุ่ม pagination
    function updatePagination(totalPages) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');

        if (totalPages === 0) {
            pageInfo.textContent = 'หน้า 0 จาก 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;

        // ลบ event listeners เก่า
        const newPrevBtn = prevBtn.cloneNode(true);
        const newNextBtn = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        // เพิ่ม event listeners ใหม่
        newPrevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderProducts();
            }
        });

        newNextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderProducts();
            }
        });
    }

    // ลบสินค้าที่เลือก
    document.getElementById('delete-selected-btn').addEventListener('click', async function() {
        const checked = document.querySelectorAll('.delete-checkbox:checked');
        if (checked.length === 0) {
            alert('กรุณาเลือกสินค้าที่ต้องการลบ');
            return;
        }
        if (!confirm(`คุณแน่ใจว่าต้องการลบสินค้า ${checked.length} รายการ?`)) return;

        try {
            // ลบสินค้าทีละรายการ
            for (let cb of checked) {
                const id = cb.dataset.id;
                await fetch(`${BACKEND_URL}/products/${id}`, { method: 'DELETE' });
            }
            alert('ลบสินค้าเรียบร้อย');
            
            // โหลดข้อมูลใหม่
            await loadProducts();
        } catch (error) {
            console.error('❌ Error deleting products:', error);
            alert('เกิดข้อผิดพลาดในการลบสินค้า');
        }
    });

    // ช่องค้นหาแบบ realtime
    const searchInput = document.getElementById('search-input');
    function doSearch() {
        const q = (searchInput.value || '').trim().toLowerCase();
        filteredProducts = allProducts.filter(p =>
            (p.product_code ?? '').toLowerCase().includes(q) ||
            (p.product_name ?? '').toLowerCase().includes(q) ||
            (p.model ?? '').toLowerCase().includes(q)
        );
        currentPage = 1; // รีเซ็ตกลับไปหน้า 1
        renderProducts();
    }
    searchInput?.addEventListener('input', doSearch);

    // โหลดสินค้าครั้งแรก
    loadProducts();
});

