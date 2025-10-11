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
    
    document.querySelector('.product-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('submit event fired'); // เพิ่มบรรทัดนี้
        // รวบรวมข้อมูลจากฟอร์ม
        const formData = new FormData(this);
        let productData = Object.fromEntries(formData.entries());

        // แปลง buyindate (d/m/Y) เป็น Date ISO string
        if (productData.buyindate) {
            const [day, month, year] = productData.buyindate.split('/');
            let y = parseInt(year, 10);
            if (y > 2500) y -= 543;
            // ตรวจสอบว่า day, month, year เป็นตัวเลขและไม่ NaN
            if (!isNaN(day) && !isNaN(month) && !isNaN(y)) {
                const isoDate = new Date(`${y}-${month}-${day}T00:00:00.000Z`);
                if (!isNaN(isoDate.getTime())) {
                    productData.buyindate = isoDate.toISOString();
                } else {
                    // ถ้าแปลงไม่ได้ ให้ลบฟิลด์ date หรือแจ้งเตือน
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
        productData.total = Number(productData.total) || 0; // << สำคัญ

        // 
        if (currentProductId) {
            // อัปเดตสินค้าเดิม (เพิ่ม/อัปเดต quantity, total, note, date)
            try {
                const res = await fetch(`${BACKEND_URL}/products/${currentProductId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                if (res.ok) {
                    alert('อัปเดตข้อมูลสำเร็จ');
                    this.reset();
                    currentProductId = null;
                } else {
                    const data = await res.json();
                    alert(data.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
            }
        } else {
            // สร้างสินค้าใหม่ (กรณีไม่มี _id) กรณีนี้จะบันทึกข้อมูลใหม่ทั้งหมดถ้าในdatabseไม่มี
            try {
                const res = await fetch(`${BACKEND_URL}/products`, {
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
        }
    });
    //


    // เพิ่ม event สำหรับคำนวณยอดรวม
    document.getElementById('price').addEventListener('input', updateTotal);
    document.getElementById('quantity').addEventListener('input', updateTotal);
});
