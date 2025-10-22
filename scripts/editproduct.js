import { BACKEND_URL } from './config.js';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector('.search-product-input');

    let currentProductId = null; // เก็บ id สินค้าที่เลือก

    // ฟังก์ชันเติมข้อมูลในฟอร์ม (ตัวอย่าง)
    function fillForm(product) {
        currentProductId = product._id; // เก็บ id ไว้ใช้ตอนอัพเดท
        document.getElementById('product_code').value = product.product_code || '';
        document.getElementById('model').value = product.model || '';
        document.getElementById('product_name').value = product.product_name || '';

        // --- เพิ่ม option ให้ <select> ถ้ายังไม่มี ---
        // สำหรับ maker
        const makerSelect = document.getElementById('maker');
        if (product.maker && ![...makerSelect.options].some(opt => opt.value === product.maker)) {
            const option = document.createElement('option');
            option.value = product.maker;
            option.textContent = product.maker;
            makerSelect.appendChild(option);
        }
        makerSelect.value = product.maker || '';

        // สำหรับ category
        const categorySelect = document.getElementById('category');
        if (product.category && ![...categorySelect.options].some(opt => opt.value === product.category)) {
            const option = document.createElement('option');
            option.value = product.category;
            option.textContent = product.category;
            categorySelect.appendChild(option);
        }
        categorySelect.value = product.category || '';
        // --- จบการเพิ่ม option ---

        document.getElementById('condition').value = product.condition || '';
        document.getElementById('price').value = product.price || '';
        document.getElementById('sale_price').value = product.sale_price || '';
       
        const unitSelect = document.getElementById('unit');
        if (product.unit && ![...unitSelect.options].some(opt => opt.value === product.unit)) {
            const option = document.createElement('option');
            option.value = product.unit;
            option.textContent = product.unit;
            unitSelect.appendChild(option);
        }
        unitSelect.value = product.unit || '';

        // --- เติมตำแหน่งสินค้า ---
        const locationSelect = document.getElementById('location');
        if (product.location && ![...locationSelect.options].some(opt => opt.value === product.location)) {
            const option = document.createElement('option');
            option.value = product.location;
            option.textContent = product.location;
            locationSelect.appendChild(option);
        }
        locationSelect.value = product.location || '';

        // เติมรูปภาพสินค้าเดิม
        const previewBox = document.querySelector('.image-preview-box');
        previewBox.innerHTML = ''; // เคลียร์ของเดิมก่อน

        if (product.image) {
            const img = document.createElement('img');
            img.id = 'preview-image';
            img.src = product.image;
            img.alt = 'รูปสินค้าเดิม';
            img.style.maxWidth = '180px';
            img.style.maxHeight = '180px';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            previewBox.appendChild(img);
        } else {
            // ถ้าไม่มีรูป ให้แสดงข้อความ placeholder
            const label = document.createElement('label');
            label.className = 'label-image-preview';
            label.textContent = 'รูปภาพสินค้าเดิม';
            previewBox.appendChild(label);
        }

        // ลบผลลัพธ์การค้นหา
        document.getElementById('search-result')?.remove();
        searchInput.value = '';
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
                resultDiv.style.position = 'absolute';
                resultDiv.style.background = '#faf2b9ff';
                resultDiv.style.border = '1px solid #ccc';
                resultDiv.style.width = searchInput.offsetWidth + 'px';
                resultDiv.style.zIndex = 9999;
                resultDiv.style.maxHeight = '250px';
                resultDiv.style.overflowY = 'auto';

                // หลังสร้าง resultDiv และก่อนแทรกเข้า DOM ให้เพิ่ม:
                const rect = searchInput.getBoundingClientRect();
                // ถ้า parent ของ searchInput มี position: relative (เช่น .navbar) ให้คำนวณตำแหน่งแบบ offset ภายใน parent:
                const parentRect = searchInput.parentElement.getBoundingClientRect();
                resultDiv.style.width = rect.width + 'px';
                // วางให้อยู่ใต้ input โดยคำนวณ relative left/top ภายใน parent
                resultDiv.style.left = (rect.left - parentRect.left) + 'px';
                resultDiv.style.top = (rect.bottom - parentRect.top + 6) + 'px'; // +6 ช่องว่างเล็กน้อย
                resultDiv.style.boxSizing = 'border-box';

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

    // ปิดผลลัพธ์เมื่อคลิกข้างนอก
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !document.getElementById('search-result')?.contains(e.target)) {
            document.getElementById('search-result')?.remove();
        }
    });

    document.getElementById('image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const previewImg = document.getElementById('preview-image');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                previewImg.src = evt.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    document.querySelector('.product-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!currentProductId) {
            alert('กรุณาค้นหาและเลือกสินค้าที่ต้องการแก้ไขก่อน');
            return;
        }

        // รวบรวมข้อมูลจากฟอร์ม
        const formData = new FormData(this);
        let productData = Object.fromEntries(formData.entries());

        // === เพิ่มบันทึกวันที่และเวลาแก้ไข ===
        const now = new Date();
        productData.updatedDate = now.toLocaleDateString('th-TH');
        productData.updatedTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const imageInput = document.getElementById('image');
        const previewImg = document.getElementById('preview-image');

        if (imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async function(evt) {
                productData.image = evt.target.result;
                await updateProduct(currentProductId, productData);
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            if (previewImg && previewImg.src && previewImg.style.display !== 'none' && previewImg.src.startsWith('data')) {
                productData.image = previewImg.src;
            } else {
                delete productData.image;
            }
            await updateProduct(currentProductId, productData);
        }
    });

    async function updateProduct(id, data) {
        try {
            const res = await fetch(`${BACKEND_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                alert('อัพเดทข้อมูลสินค้าสำเร็จ');
            } else {
                alert(result.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    }

    document.getElementById('add-maker-btn').addEventListener('click', function() {
        const newMaker = document.getElementById('new-maker').value.trim();
        const makerSelect = document.getElementById('maker');
        if (newMaker) {
            let exists = false;
            for (let option of makerSelect.options) {
                if (option.value === newMaker) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newMaker;
                option.textContent = newMaker;
                makerSelect.appendChild(option);
                makerSelect.value = newMaker;
            }
            document.getElementById('new-maker').value = '';
        }
    });

    document.getElementById('add-category-btn').addEventListener('click', function() {
        const newCategory = document.getElementById('new-category').value.trim();
        const categorySelect = document.getElementById('category');
        if (newCategory) {
            let exists = false;
            for (let option of categorySelect.options) {
                if (option.value === newCategory) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newCategory;
                option.textContent = newCategory;
                categorySelect.appendChild(option);
                categorySelect.value = newCategory;
            }
            document.getElementById('new-category').value = '';
        }
    });
});

 // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });