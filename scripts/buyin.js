import { BACKEND_URL } from './config.js';

if (window.flatpickr) {
        flatpickr("#buyindate", {
            dateFormat: "d/m/Y",
            altInput: true,
            altFormat: "d/m/Y",
            allowInput: true,
            defaultDate: "today",
            onReady: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const buddhistYear = date.getFullYear() + 543;
                    const day = ("0" + date.getDate()).slice(-2);
                    const month = ("0" + (date.getMonth() + 1)).slice(-2);
                    const thaiDate = day + '/' + month + '/' + buddhistYear;
                    // คุณสามารถนำ thaiDate ไปใช้ต่อได้
                }
                const fp = instance;
                const calendarContainer = fp.calendarContainer;
                if (calendarContainer) {
                    let todayBtn = calendarContainer.querySelector(".flatpickr-today-btn");
                    if (!todayBtn) {
                        todayBtn = document.createElement("button");
                        todayBtn.type = "button";
                        todayBtn.className = "flatpickr-today-btn";
                        todayBtn.textContent = "วันนี้";
                        todayBtn.style.margin = "8px";
                        todayBtn.style.padding = "6px 16px";
                        todayBtn.style.background = "#ffe0b2";
                        todayBtn.style.border = "1px solid #e0b97d";
                        todayBtn.style.borderRadius = "4px";
                        todayBtn.style.cursor = "pointer";
                        todayBtn.onclick = function() {
                            fp.setDate(new Date());
                            fp.close();
                        };
                        calendarContainer.appendChild(todayBtn);
                    }
                }
            },
            onChange: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const buddhistYear = date.getFullYear() + 543;
                    const day = ("0" + date.getDate()).slice(-2);
                    const month = ("0" + (date.getMonth() + 1)).slice(-2);
                    const thaiDate = day + '/' + month + '/' + buddhistYear;
                    // คุณสามารถนำ thaiDate ไปใช้ต่อได้
                }
            }
        });
    }

    let currentProductId = null; // เก็บ _id สินค้าที่ค้นหาได้
    function isoToThaiDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const day = ("0" + date.getDate()).slice(-2);
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    }

    function fillForm(product) {
        currentProductId = product._id;
        document.getElementById('product_code').value = product.product_code || '';
        document.getElementById('model').value = product.model || '';
        document.getElementById('price').value = product.price || '';
        document.getElementById('unit').value = product.unit || '';
        document.getElementById('condition').value = product.condition || '';
        document.getElementById('quantity').value = product.quantity || '';
        document.getElementById('total').value = product.total || '';
        document.getElementById('note').value = product.note || '';
        document.getElementById('buyindate').value = isoToThaiDate(product.buyindate);

        // เรียกคำนวณยอดรวมทุกครั้งที่เติมข้อมูล
        updateTotal();

        // ลบผลลัพธ์การค้นหา
        document.getElementById('search-result')?.remove();
        searchInput.value = '';
    }

    function updateTotal() {
    const price = parseFloat(document.getElementById('price').value) || 0;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const total = price * quantity;
    document.getElementById('total').value = total;
    }

    document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector('.search-product-input');

    // ให้ navbar-text สไลด์จากซ้ายเมื่อหน้าโหลด
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }

    // Toggle sidebar
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    
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

    // --- เพิ่ม: entrance animation ให้ฟอร์มและทำ stagger ให้แต่ละ .form-group ---
    const productForm = document.querySelector('.product-form');
    if (productForm) {
        // เพิ่ม class เพื่อให้ CSS ทำงาน
        productForm.classList.add('animate');
        // เพิ่ม stagger ให้แต่ละ .form-group (JS ตั้ง delay ทีละชิ้น)
        const groups = productForm.querySelectorAll('.form-group');
        groups.forEach((g, idx) => {
            g.classList.add('stagger');
            g.style.animationDelay = (100 + idx * 70) + 'ms';
        });
    }

    // ระบบค้นหา
    searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        document.getElementById('search-result')?.remove();

        if (!query) return;

        fetch(`${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`) // ใช้ BACKEND_URL
            .then(res => res.json())
            .then(products => {
                const resultDiv = document.createElement('div');
                resultDiv.id = 'search-result';
                resultDiv.className = 'search-results-container';
                // ปรับ style พื้นฐาน (เดิม)...
                resultDiv.style.position = 'absolute';
                resultDiv.style.background = '#faf2b9ff';
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
                            <b class="product_code">${p.product_code || ''}</b>
                            <span class="product_name">${p.product_name || ''}</span>
                            <small class="product_model">
                                ${p.model || ''} | 
                                <span class="maker">${p.maker || ''}</span> | 
                                <span class="category">${p.category || ''}</span>
                            </small>
                        </div>
                    `).join('');
                }

                // แทรกผลลัพธ์ใต้ input
                searchInput.parentNode.insertBefore(resultDiv, searchInput.nextSibling);

                // ให้ CSS animation ทำงาน (เพิ่ม class หลัง insert เพื่อให้ transition/animation เห็น)
                requestAnimationFrame(() => {
                    resultDiv.classList.add('animate');
                });

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

    // ปิดผลลัพธ์เมื่อคลิกข้างนอก (ให้ทำงานร่วมกับ toggle sidebar)
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !document.getElementById('search-result')?.contains(e.target)) {
            document.getElementById('search-result')?.remove();
        }
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", function () {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });
    
    document.querySelector('.product-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        // รวบรวมข้อมูลจากฟอร์ม
        const formData = new FormData(this);
        let productData = Object.fromEntries(formData.entries());

        // แปลง buyindate (d/m/Y) เป็น Date ISO string
        if (productData.buyindate) {
            const [day, month, year] = productData.buyindate.split('/');
            let y = parseInt(year, 10);
            if (y > 2500) y -= 543;
            if (!isNaN(day) && !isNaN(month) && !isNaN(y)) {
                const isoDate = new Date(`${y}-${month}-${day}T00:00:00.000Z`);
                if (!isNaN(isoDate.getTime())) {
                    productData.buyindate = isoDate.toISOString();
                } else {
                    delete productData.buyindate;
                    alert('รูปแบบวันที่ไม่ถูกต้อง');
                }
            } else {
                delete productData.buyindate;
                alert('กรุณากรอกวันที่ให้ถูกต้อง');
            }
        }

        // แปลงค่าเป็นตัวเลข
        productData.price = Number(productData.price) || 0;
        productData.quantity = Number(productData.quantity) || 0;
        productData.total = Number(productData.total) || 0;

        // **บันทึกเป็นรายการใหม่ทุกครั้ง**
        try {
            const res = await fetch(`${BACKEND_URL}/buyin_product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            if (res.ok) {
                alert('บันทึกข้อมูลสำเร็จ');
                this.reset();
            } else {
                const data = await res.json();
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    });
    //


    // เพิ่ม event สำหรับคำนวณยอดรวม
    document.getElementById('price').addEventListener('input', updateTotal);
    document.getElementById('quantity').addEventListener('input', updateTotal);
});
