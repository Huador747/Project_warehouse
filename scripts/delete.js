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
    loadProducts();

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
            await fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE' });
        }
        alert('ลบสินค้าเรียบร้อย');
        loadProducts();
    });

    // ฟังก์ชันโหลดสินค้า
    function loadProducts() {
        fetch('http://localhost:3000/products')
            .then(res => res.json())
            .then(products => {
                const productList = document.getElementById('product-list');
                if (!products || products.length === 0) {
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
                for (const p of products) {
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
});