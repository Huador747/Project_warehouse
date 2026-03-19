import { BACKEND_URL } from './config.js';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector('.search-product-input');

    let currentProductId = null; // เก็บ id สินค้าที่เลือก

    // Animation for navbar
    const navbarTextEls = document.querySelectorAll('.navbar .navbar-text');
    navbarTextEls.forEach((el, idx) => {
        // Don't force opacity via inline styles (prevents CSS animation from showing)
        const delay = 100 + idx * 120;
        el.style.animationDelay = `${delay}ms`;
        requestAnimationFrame(() => el.classList.add('slide-in'));
    });

    // Animation for product form
    const productForm = document.querySelector('.product-form');
    if (productForm) {
        productForm.classList.add('animate');
        const groups = productForm.querySelectorAll('.form-group');
        groups.forEach((g, idx) => {
            g.classList.add('stagger');
            g.style.animationDelay = 100 + idx * 70 + 'ms';
        });
    }

    // ฟังก์ชันเติมข้อมูลในฟอร์ม (ตัวอย่าง)
    function fillForm(product) {
        console.log('fillForm() called with product:', product);
        currentProductId = product._id; // เก็บ id ไว้ใช้ตอนอัพเดท
        document.getElementById('product_code').value = product.product_code || '';
        document.getElementById('model').value = product.model || '';
        document.getElementById('product_name').value = product.product_name || '';
        document.getElementById('price').value = product.price || '';
        document.getElementById('sale_price').value = product.sale_price || '';
        document.getElementById('unit').value = product.unit || '';
        document.getElementById('location').value = product.location || '';

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
        // เพิ่มเติม
        document.getElementById('sale_status').value = product.sale_status || '';
        // ตั้งค่าฟิลด์ "การควบคุม" (ถ้ามี)
        const controlsSelect = document.getElementById('controls');

        if (controlsSelect) {
            // ให้เลือกเป็นค่าว่างได้ (ไม่บังคับ)
            if (![...controlsSelect.options].some(o => o.value === '')) {
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = '— ไม่ระบุ —';
                controlsSelect.insertBefore(placeholder, controlsSelect.firstChild);
            }
            controlsSelect.removeAttribute('required');

            // ตั้งค่าตามข้อมูลสินค้า ถ้าไม่ชัดเจนให้เว้นว่าง
            controlsSelect.value = product.controls ?? product.co ?? '';
        } else {
            console.warn('controls select element not found in DOM (id="controls")');
        }

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
        if (!previewBox) {
            console.error('image preview box not found in DOM');
            return;
        }

        previewBox.innerHTML = ''; // เคลียร์ของเดิมก่อน
        previewBox.classList.remove('enlarged');
        hideCloseButton();

        if (product.image) {
            const img = document.createElement('img');
            img.id = 'preview-image';
            img.src = product.image;
            img.alt = 'รูปสินค้าเดิม';
            img.style.display = 'block';
            img.style.cursor = 'zoom-in';

            // Debug: ดูว่าโหลดรูปสำเร็จหรือไม่
            img.onload = () => console.log('preview image loaded successfully');
            img.onerror = (err) => console.error('preview image failed to load', err, img.src);

            // คลิกที่รูปเพื่อขยาย / ย่อ
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => {
                const isEnlarged = previewBox.classList.toggle('enlarged');
                if (isEnlarged) {
                    showCloseButton();
                } else {
                    hideCloseButton();
                }
            });

            previewBox.appendChild(img);
        } else {
            // ถ้าไม่มีรูป ให้แสดงข้อความ placeholder
            const label = document.createElement('label');
            label.className = 'label-image-preview';
            label.textContent = 'รูปภาพสินค้าเดิม';
            previewBox.appendChild(label);
        }

        // ปุ่มปิดสำหรับโหมดขยาย
        function showCloseButton() {
            if (previewBox.querySelector('.image-close-btn')) return;

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'image-close-btn';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', () => {
                previewBox.classList.remove('enlarged');
                hideCloseButton();
            });

            previewBox.appendChild(closeBtn);
            document.body.style.overflow = 'hidden';
        }

        function hideCloseButton() {
            const btn = previewBox.querySelector('.image-close-btn');
            if (btn) btn.remove();
            document.body.style.overflow = '';
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
                    // สร้างแต่ละผลลัพธ์ด้วย DOM เพื่อหลีกเลี่ยงปัญหา JSON ขนาดใหญ่ที่อาจทำให้ attribute แตก
                    resultDiv.innerHTML = '';
                    products.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'search-item';
                        item.style.padding = '8px';
                        item.style.cursor = 'pointer';
                        item.innerHTML = `
                            <b class="product_code">${p.product_code || ''}</b>
                            <span class="product_name">${p.product_name || ''}</span>
                            <small class="product_model">
                                ${p.model || ''} | 
                                <span class="maker">${p.maker || ''}</span> | 
                                <span class="category">${p.category || ''}</span>
                            </small>
                        `;

                        item.addEventListener('click', async () => {
                            // ถ้าในผลลัพธ์มี image อยู่แล้ว ให้ใช้เลย
                            if (p.image) {
                                fillForm(p);
                                return;
                            }

                            // ป้องกันกรณี backend ตัด field รูปออกจาก search API
                            try {
                                const res = await fetch(`${BACKEND_URL}/products/${p._id}`);
                                const text = await res.text();
                                console.log('fetch /products/:id response:', res.status, text);
                                if (res.ok) {
                                    const fullProduct = JSON.parse(text);
                                    fillForm(fullProduct);
                                } else {
                                    fillForm(p);
                                }
                            } catch (err) {
                                console.error('ไม่สามารถดึงข้อมูลสินค้าเพิ่มเติมได้', err);
                                fillForm(p);
                            }
                        });

                        resultDiv.appendChild(item);
                    });
                }

                // แทรกผลลัพธ์ใต้ input
                searchInput.parentNode.insertBefore(resultDiv, searchInput.nextSibling);

                // ให้ CSS animation ทำงาน (เพิ่ม class หลัง insert เพื่อให้ transition/animation เห็น)
                requestAnimationFrame(() => {
                    resultDiv.classList.add('animate');
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
        let previewImg = document.getElementById('preview-image');
        const previewBox = document.querySelector('.image-preview-box');

        // If the preview image element isn't present (e.g. on first load), create it
        if (!previewImg && previewBox) {
            previewImg = document.createElement('img');
            previewImg.id = 'preview-image';
            previewImg.alt = 'รูปสินค้า';
            previewImg.style.display = 'none';
            previewImg.style.cursor = 'zoom-in';
            previewBox.appendChild(previewImg);
        }

        if (file && previewImg) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                previewImg.src = evt.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    function showCustomModal({ title = "", text = "", icon = "success", confirmText = "ตกลง", onClose = null }) {
        document.getElementById("custom-modal")?.remove();
        const modal = document.createElement("div");
        modal.id = "custom-modal";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.background = "rgba(0,0,0,0.35)";
        modal.style.zIndex = "99999";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.innerHTML = `
          <div style="
            background: #fffbe9;
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(30,41,59,0.18);
            padding: 32px 28px 24px 28px;
            min-width: 320px;
            max-width: 90vw;
            text-align: center;
            position: relative;
            font-family: 'Sarabun', sans-serif;
          ">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">
              ${icon === "success" ? "✅" : icon === "error" ? "❌" : "ℹ️"}
            </div>
            <div style="font-size: 1.35rem; font-weight: bold; color: #d35400; margin-bottom: 10px;">
              ${title}
            </div>
            <div style="font-size: 1.1rem; color: #333; margin-bottom: 22px;">
              ${text}
            </div>
            <button id="custom-modal-confirm" style="
              padding: 10px 36px;
              font-size: 1.1rem;
              border-radius: 8px;
              background: #ffd336;
              border: none;
              cursor: pointer;
              color: #333;
              font-weight: 600;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              transition: background 0.2s;
            ">${confirmText}</button>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("custom-modal-confirm").onclick = () => {
            modal.remove();
            if (typeof onClose === "function") onClose();
        };
    }

    document.querySelector('.product-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!currentProductId) {
            showCustomModal({
                icon: "error",
                title: "กรุณาเลือกสินค้า",
                text: "กรุณาค้นหาและเลือกสินค้าที่ต้องการแก้ไขก่อน",
                confirmText: "ตกลง"
            });
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
                showCustomModal({
                    icon: "success",
                    title: "อัพเดทข้อมูลสินค้าสำเร็จ",
                    text: "ข้อมูลสินค้าถูกแก้ไขเรียบร้อยแล้ว",
                    confirmText: "ตกลง"
                });
            } else {
                showCustomModal({
                    icon: "error",
                    title: "เกิดข้อผิดพลาด",
                    text: result.message || "เกิดข้อผิดพลาด",
                    confirmText: "ตกลง"
                });
            }
        } catch (err) {
            showCustomModal({
                icon: "error",
                title: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
                text: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
                confirmText: "ตกลง"
            });
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

document.addEventListener('DOMContentLoaded', () => {
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }
});

 // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });