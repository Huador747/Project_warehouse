const backendHost = window.location.hostname;

document.addEventListener("DOMContentLoaded", function () {
    // เพิ่มฟังก์ชันตรวจสอบการล็อกอิน
    function checkLogin() {
        // ตรวจสอบว่ามีการล็อกอินหรือไม่
        const isLoggedIn = localStorage.getItem("isLoggedIn") || sessionStorage.getItem("isLoggedIn");
        if (!isLoggedIn) {
            window.location.replace("login.html");
        }
    }

    // เรียกใช้ฟังก์ชันตรวจสอบเมื่อโหลดหน้า
    checkLogin();

    // ประกาศตัวแปร global
    let currentProductId = null;
    const searchInput = document.querySelector('.search-product-input');

    // แก้ไขส่วน logout
    const logoutBtn = document.getElementById("logout-btn");
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            // เคลียร์ข้อมูลการล็อกอิน (ถ้ามี)
            localStorage.clear();
            sessionStorage.clear();
            
            try {
                // ส่งกลับไปหน้า login
                window.location.replace("login.html");
            } catch (error) {
                console.error("Logout error:", error);
                // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีนี้แทน
                window.location.href = "login.html";
            }
        });
    }

    const categorySelect = document.getElementById('category');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const newCategoryInput = document.getElementById('new-category');

    // เพิ่มประเภทใหม่เข้า dropdown
    addCategoryBtn.addEventListener('click', function() {
        const newCategory = newCategoryInput.value.trim();
        const categorySelect = document.getElementById('category');
        if (newCategory) {
            // เช็คว่ามีอยู่แล้วหรือยัง
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
            newCategoryInput.value = '';
        }
    });

    // เพิ่มผู้ผลิตใหม่
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

    // เพิ่มหน่วยนับใหม่
    document.getElementById('add-unit-btn').addEventListener('click', function() {
        const newUnit = document.getElementById('new-unit').value.trim();
        const unitSelect = document.getElementById('unit');
        if (newUnit) {
            let exists = false;
            for (let option of unitSelect.options) {
                if (option.value === newUnit) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newUnit;
                option.textContent = newUnit;
                unitSelect.appendChild(option);
                unitSelect.value = newUnit;
            }
            document.getElementById('new-unit').value = '';
        }
    });

    // เพิ่มตำแหน่งใหม่
    document.getElementById('add-location-btn').addEventListener('click', function() {
        const newLocation = document.getElementById('new-location').value.trim();
        const locationSelect = document.getElementById('location');
        if (newLocation) {
            let exists = false;
            for (let option of locationSelect.options) {
                if (option.value === newLocation) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newLocation;
                option.textContent = newLocation;
                locationSelect.appendChild(option);
                locationSelect.value = newLocation;
            }
            document.getElementById('new-location').value = '';
        }
    });

    // ฟังก์ชัน helper สำหรับจัดการ select elements
    function setSelectValue(selectId, value) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`Select element ${selectId} not found`);
            return;
        }
        
        let exists = [...select.options].some(opt => opt.value === value);
        if (!exists) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }
        select.value = value;
    }

    // ฟังก์ชันเติมข้อมูลในฟอร์ม
    function fillForm(product) {
        console.log('Filling form with:', product); // Debug log

        // เก็บ ID สำหรับการอัพเดท
        currentProductId = product._id;

        // ตั้งค่า input fields
        const fields = {
            product_code: product.product_code || '',
            model: product.model || '',
            product_name: product.product_name || '',
            price: product.price || '',
            sale_price: product.sale_price || ''
        };

        // เติมข้อมูลใน input fields
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`Set ${id} to ${value}`); // Debug log
            } else {
                console.warn(`Element ${id} not found`);
            }
        });

        // ตั้งค่า select fields
        const selects = {
            maker: product.maker,
            category: product.category,
            condition: product.condition,
            unit: product.unit,
            location: product.location
        };

        // เติมข้อมูลใน select fields
        Object.entries(selects).forEach(([id, value]) => {
            try {
                setSelectValue(id, value);
                console.log(`Set ${id} to ${value}`); // Debug log
            } catch (err) {
                console.warn(`Error setting ${id}:`, err);
            }
        });

        // แสดงเวลา
        document.getElementById('updatedDate').textContent = product.updatedDate || '-';
        document.getElementById('updatedTime').textContent = product.updatedTime || '-';

        // ซ่อนผลการค้นหา
        const searchResult = document.getElementById('search-result');
        if (searchResult) searchResult.remove();
        
        // เคลียร์ช่องค้นหา
        if (searchInput) searchInput.value = '';
    }

    // Event listener สำหรับการค้นหา
    searchInput?.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (query.length === 0) {
            document.getElementById('search-result')?.remove();
            return;
        }

        fetch(`http://${backendHost}:3000/products/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(products => {
                console.log('Search results:', products); // Debug log
                
                // ลบผลการค้นหาเก่า
                const oldResult = document.getElementById('search-result');
                if (oldResult) oldResult.remove();

                // สร้างกล่องผลการค้นหาใหม่
                const resultDiv = document.createElement('div');
                resultDiv.id = 'search-result';
                resultDiv.className = 'search-results-container'; // เพิ่ม class สำหรับ styling

                if (products.length === 0) {
                    resultDiv.innerHTML = '<div class="no-results">ไม่พบสินค้า</div>';
                } else {
                    resultDiv.innerHTML = products.map(p => `
                        <div class="search-item" data-product='${JSON.stringify(p)}'>
                            <div class="product-code">${p.product_code || ''}</div>
                            <div class="product-name">${p.product_name || ''}</div>
                            <div class="product-details">
                                ${p.model || ''} - ${p.maker || ''} - ${p.category || ''}
                            </div>
                        </div>
                    `).join('');
                }

                // แทรกผลการค้นหาใต้ช่องค้นหา
                searchInput.parentNode.appendChild(resultDiv);

                // เพิ่ม event listeners สำหรับแต่ละผลการค้นหา
                document.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', function() {
                        try {
                            const product = JSON.parse(this.dataset.product);
                            console.log('Clicked product:', product); // Debug log
                            fillForm(product);
                        } catch (err) {
                            console.error('Error parsing product data:', err);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Search error:', err);
            });
    });

    // เพิ่มฟังก์ชันโหลดและแสดงข้อมูลสินค้า
    function loadProducts() {
        fetch('http://192.168.0.101:3000/products')
            .then(res => res.json())
            .then(products => {
                const productList = document.getElementById('product-list');
                
                if (!products || products.length === 0) {
                    productList.innerHTML = '<tr><td colspan="10" class="no-data">ไม่พบข้อมูลสินค้า</td></tr>';
                    return;
                }

                const productsHTML = products.map(p => `
                    <tr>
                        <td>${p.product_code || '-'}</td>
                        <td>${p.model || '-'}</td>
                        <td>${p.product_name || '-'}</td>
                        <td>${p.maker || '-'}</td>
                        <td>${p.category || '-'}</td>
                        <td>${p.condition || '-'}</td>
                        <td>${p.price || '-'}</td>
                        <td>${p.sale_price || '-'}</td>
                        <td>${p.unit || '-'}</td>
                        <td>${p.location || '-'}</td>
                    </tr>
                `).join('');
                
                productList.innerHTML = productsHTML;
            })
            .catch(error => {
                console.error('Error loading products:', error);
                const productList = document.getElementById('product-list');
                productList.innerHTML = '<tr><td colspan="10" class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            });
    }

    // เรียกใช้ฟังก์ชันเมื่อโหลดหน้า
    loadProducts();

    // เพิ่มผู้ผลิตใหม่
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

    // เพิ่มหน่วยนับใหม่
    document.getElementById('add-unit-btn').addEventListener('click', function() {
        const newUnit = document.getElementById('new-unit').value.trim();
        const unitSelect = document.getElementById('unit');
        if (newUnit) {
            let exists = false;
            for (let option of unitSelect.options) {
                if (option.value === newUnit) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newUnit;
                option.textContent = newUnit;
                unitSelect.appendChild(option);
                unitSelect.value = newUnit;
            }
            document.getElementById('new-unit').value = '';
        }
    });

    // เพิ่มตำแหน่งใหม่
    document.getElementById('add-location-btn').addEventListener('click', function() {
        const newLocation = document.getElementById('new-location').value.trim();
        const locationSelect = document.getElementById('location');
        if (newLocation) {
            let exists = false;
            for (let option of locationSelect.options) {
                if (option.value === newLocation) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const option = document.createElement('option');
                option.value = newLocation;
                option.textContent = newLocation;
                locationSelect.appendChild(option);
                locationSelect.value = newLocation;
            }
            document.getElementById('new-location').value = '';
        }
    });

    // ฟังก์ชัน helper สำหรับจัดการ select elements
    function setSelectValue(selectId, value) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`Select element ${selectId} not found`);
            return;
        }
        
        let exists = [...select.options].some(opt => opt.value === value);
        if (!exists) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }
        select.value = value;
    }

    // ฟังก์ชันเติมข้อมูลในฟอร์ม
    function fillForm(product) {
        console.log('Filling form with:', product); // Debug log

        // เก็บ ID สำหรับการอัพเดท
        currentProductId = product._id;

        // ตั้งค่า input fields
        const fields = {
            product_code: product.product_code || '',
            model: product.model || '',
            product_name: product.product_name || '',
            price: product.price || '',
            sale_price: product.sale_price || ''
        };

        // เติมข้อมูลใน input fields
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`Set ${id} to ${value}`); // Debug log
            } else {
                console.warn(`Element ${id} not found`);
            }
        });

        // ตั้งค่า select fields
        const selects = {
            maker: product.maker,
            category: product.category,
            condition: product.condition,
            unit: product.unit,
            location: product.location
        };

        // เติมข้อมูลใน select fields
        Object.entries(selects).forEach(([id, value]) => {
            try {
                setSelectValue(id, value);
                console.log(`Set ${id} to ${value}`); // Debug log
            } catch (err) {
                console.warn(`Error setting ${id}:`, err);
            }
        });

        // แสดงเวลา
        document.getElementById('updatedDate').textContent = product.updatedDate || '-';
        document.getElementById('updatedTime').textContent = product.updatedTime || '-';

        // ซ่อนผลการค้นหา
        const searchResult = document.getElementById('search-result');
        if (searchResult) searchResult.remove();
        
        // เคลียร์ช่องค้นหา
        if (searchInput) searchInput.value = '';
    }

    // Event listener สำหรับการค้นหา
    searchInput?.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (query.length === 0) {
            document.getElementById('search-result')?.remove();
            return;
        }

        fetch(`http://${backendHost}:3000/products/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(products => {
                console.log('Search results:', products); // Debug log
                
                // ลบผลการค้นหาเก่า
                const oldResult = document.getElementById('search-result');
                if (oldResult) oldResult.remove();

                // สร้างกล่องผลการค้นหาใหม่
                const resultDiv = document.createElement('div');
                resultDiv.id = 'search-result';
                resultDiv.className = 'search-results-container'; // เพิ่ม class สำหรับ styling

                if (products.length === 0) {
                    resultDiv.innerHTML = '<div class="no-results">ไม่พบสินค้า</div>';
                } else {
                    resultDiv.innerHTML = products.map(p => `
                        <div class="search-item" data-product='${JSON.stringify(p)}'>
                            <div class="product-code">${p.product_code || ''}</div>
                            <div class="product-name">${p.product_name || ''}</div>
                            <div class="product-details">
                                ${p.model || ''} - ${p.maker || ''} - ${p.category || ''}
                            </div>
                        </div>
                    `).join('');
                }

                // แทรกผลการค้นหาใต้ช่องค้นหา
                searchInput.parentNode.appendChild(resultDiv);

                // เพิ่ม event listeners สำหรับแต่ละผลการค้นหา
                document.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', function() {
                        try {
                            const product = JSON.parse(this.dataset.product);
                            console.log('Clicked product:', product); // Debug log
                            fillForm(product);
                        } catch (err) {
                            console.error('Error parsing product data:', err);
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Search error:', err);
            });
    });

    // เพิ่มฟังก์ชันโหลดและแสดงข้อมูลสินค้า
    function loadProducts() {
        fetch('http://192.168.0.101:3000/products')
            .then(res => res.json())
            .then(products => {
                const productList = document.getElementById('product-list');
                
                if (!products || products.length === 0) {
                    productList.innerHTML = '<tr><td colspan="10" class="no-data">ไม่พบข้อมูลสินค้า</td></tr>';
                    return;
                }

                const productsHTML = products.map(p => `
                    <tr>
                        <td>${p.product_code || '-'}</td>
                        <td>${p.model || '-'}</td>
                        <td>${p.product_name || '-'}</td>
                        <td>${p.maker || '-'}</td>
                        <td>${p.category || '-'}</td>
                        <td>${p.condition || '-'}</td>
                        <td>${p.price || '-'}</td>
                        <td>${p.sale_price || '-'}</td>
                        <td>${p.unit || '-'}</td>
                        <td>${p.location || '-'}</td>
                    </tr>
                `).join('');
                
                productList.innerHTML = productsHTML;
            })
            .catch(error => {
                console.error('Error loading products:', error);
                const productList = document.getElementById('product-list');
                productList.innerHTML = '<tr><td colspan="10" class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            });
    }

    // เรียกใช้ฟังก์ชันเมื่อโหลดหน้า
    loadProducts();

    // เพิ่ม event listener สำหรับการ submit form
    document.querySelector('.product-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            product_code: document.getElementById('product_code').value,
            model: document.getElementById('model').value,
            product_name: document.getElementById('product_name').value,
            maker: document.getElementById('maker').value,
            category: document.getElementById('category').value,
            condition: document.getElementById('condition').value,
            price: Number(document.getElementById('price').value) || 0,
            sale_price: document.getElementById('sale_price').value,
            unit: document.getElementById('unit').value,
            location: document.getElementById('location').value,
            // เพิ่มข้อมูลเวลาอัพเดท
            updatedDate: new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            }),
            updatedTime: new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        // แปลงไฟล์ภาพเป็น base64
        const imageInput = document.getElementById('image');
        let imageBase64 = "";
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            imageBase64 = await toBase64(file);
        }

        formData.image = imageBase64;

        const method = currentProductId ? 'PATCH' : 'POST';
        const url = currentProductId 
            ? `http://192.168.0.101:3000/products/${currentProductId}`: 'http://192.168.0.101:3000/products';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then (data => {
            alert(currentProductId ? 'อัปเดตสินค้าเรียบร้อย!' : 'บันทึกสินค้าเรียบร้อย!');
            this.reset();
            currentProductId = null;
        })
        .catch(err => {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        });
    });

    // ฟังก์ชันแปลงไฟล์เป็น base64
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
});
