document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector('.search-product-input');

    // ฟังก์ชันเติมข้อมูลในฟอร์ม (ตัวอย่าง)
    function fillForm(product) {
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

        // แสดงรูปภาพสินค้าเดิม (ถ้ามี)
        const previewImg = document.getElementById('preview-image');
        const placeholder = document.getElementById('image-placeholder');
        if (product.image) {
            previewImg.src = product.image;
            previewImg.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            placeholder.style.display = 'block';
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

        fetch(`http://192.168.0.101:3000/products/search?q=${encodeURIComponent(query)}`)
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
});