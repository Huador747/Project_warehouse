import { BACKEND_URL } from './config.js';

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
    
    // โหลดรายการสินค้า
    function loadProducts(filteredList) {
        fetch(`${BACKEND_URL}/products`)
            .then(res => res.json())
            .then(products => {
                window.allProducts = products; // กำหนดค่าไว้ใช้ค้นหา
                const productList = document.getElementById('product-list');
                const showList = filteredList || products;
                if (!showList || showList.length === 0) {
                    productList.innerHTML = '<div>ไม่พบสินค้า</div>';
                    return;
                }
                let html = `
                    <table class="product-table">
                        <thead>
                            <tr>
                                <th></th>
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
                for (const p of showList) {
                    html += `
                        <tr>
                            <td><input type="checkbox" class="delete-checkbox" data-id="${p._id}"></td>
                            <td>${p.product_code || ''}</td>
                            <td>${p.product_name || ''}</td>
                            <td>${p.model || ''}</td>
                            <td>${p.maker || ''}</td>
                            <td>${p.category || ''}</td>
                            <td>${p.price || ''}</td>
                            <td>${p.unit || ''}</td>
                            <td>${p.location || ''}</td>
                        </tr>
                    `;
                }
                html += `</tbody></table>`;
                productList.innerHTML = html;
            });
    }

    // ฟังก์ชันตรวจสอบการล็อกอิน
    function checkLogin() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            window.location.replace('login.html');
        }
    }

    const deleteProductBtn = document.querySelector(".function-btn-delete");
    deleteProductBtn?.addEventListener("click", function(e) {
        e.preventDefault();
        window.location.href = "delete.html";
    });

    // ลบสินค้าที่เลือก
    document.getElementById('delete-selected-btn').addEventListener('click', async function() {
        const checked = document.querySelectorAll('.delete-checkbox:checked');
        if (checked.length === 0) {
            alert('กรุณาเลือกสินค้าที่ต้องการลบ');
            return;
        }
        if (!confirm('คุณแน่ใจว่าต้องการลบสินค้าที่เลือก?')) return;

        for (let cb of checked) {
            const id = cb.dataset.id;
            await fetch(`${BACKEND_URL}/products/${id}`, { method: 'DELETE' });
        }
        alert('ลบสินค้าเรียบร้อย');
        loadProducts();
    });

    // ช่องค้นหาแบบ realtime
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    function doSearch() {
        const q = (searchInput.value || '').trim().toLowerCase();
        const filtered = (window.allProducts || []).filter(p =>
            (p.product_code ?? '').toLowerCase().includes(q) ||
            (p.product_name ?? '').toLowerCase().includes(q) ||
            (p.model ?? '').toLowerCase().includes(q)
        );
        loadProducts(filtered); // แสดงเฉพาะสินค้าที่ค้นเจอ
    }
    searchInput?.addEventListener('input', doSearch);
    searchBtn?.addEventListener('click', doSearch);

    // โหลดสินค้าครั้งแรก
    loadProducts();
});

