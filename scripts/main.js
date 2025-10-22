import { BACKEND_URL } from './config.js';

const rowsPerPage = 5;
let currentPage = 1;
let currentProductId = null;
let allProducts = [];

function checkLogin() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") || sessionStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
        window.location.replace("login.html");
    }
}

// Helper: set value for select, add option if not exists
function setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return;
    let exists = [...select.options].some(opt => opt.value === value);
    if (!exists && value) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
    select.value = value;
}

// Fill form for edit
function fillForm(product) {
    currentProductId = product._id;
    const fields = {
        product_code: product.product_code || '',
        model: product.model || '',
        product_name: product.product_name || '',
        price: product.price || '',
        sale_price: product.sale_price || ''
    };
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });
    const selects = {
        maker: product.maker,
        category: product.category,
        condition: product.condition,
        unit: product.unit,
        location: product.location
    };
    Object.entries(selects).forEach(([id, value]) => setSelectValue(id, value));
    document.getElementById('updatedDate').textContent = product.updatedDate || '-';
    document.getElementById('updatedTime').textContent = product.updatedTime || '-';
    document.getElementById('search-result')?.remove();
    document.querySelector('.search-product-input') && (document.querySelector('.search-product-input').value = '');
}



// Render table with pagination
function renderProductsTable(products, page = 1) {
    const productList = document.getElementById('product-list');
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageProducts = products.slice(start, end);

    console.log('จำนวนสินค้าต่อหน้า:', pageProducts.length); // ตรวจสอบจำนวนจริง

    if (!pageProducts || pageProducts.length === 0) {
        productList.innerHTML = '<tr><td colspan="10" class="no-data">ไม่พบข้อมูลสินค้า</td></tr>';
        return;
    }
    const productsHTML = pageProducts.map(p => `
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
}

function renderPagination(products, page = 1) {
    const totalPages = Math.ceil(products.length / rowsPerPage);
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    let html = '';
    if (totalPages > 1) {
        html += `<button ${page === 1 ? 'disabled' : ''} id="prev-page">ก่อนหน้า</button>`;
        html += `<span style="margin:0 8px;">หน้า ${page} / ${totalPages}</span>`;
        html += `<button ${page === totalPages ? 'disabled' : ''} id="next-page">ถัดไป</button>`;
    }
    paginationDiv.innerHTML = html;

    if (totalPages > 1) {
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderProductsTable(allProducts, currentPage);
                renderPagination(allProducts, currentPage);
            }
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderProductsTable(allProducts, currentPage);
                renderPagination(allProducts, currentPage);
            }
        });
    }
}

// Load all products and render
function loadProducts() {
    fetch(`${BACKEND_URL}/products`)
        .then(res => res.json())
        .then(products => {
            allProducts = products;
            currentPage = 1;
            renderProductsTable(allProducts, currentPage);
            renderPagination(allProducts, currentPage);

            // เพิ่มอนิเมชันให้ product-card (stagger) เมื่อโหลดเสร็จ
            requestAnimationFrame(() => {
                const cards = document.querySelectorAll('.product-card');
                cards.forEach((c, i) => {
                    c.classList.add('animate');
                    c.style.animationDelay = `${100 + i * 60}ms`;
                });
            });
        })
        .catch(error => {
            console.error('Error loading products:', error);
            const productList = document.getElementById('product-list');
            productList.innerHTML = '<tr><td colspan="10" class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        });
}

// Convert file to base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", function () {
    checkLogin();

    // Hamburger menu
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    hamburger?.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", function () {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });

    // Navigation
    document.querySelector(".function-btn-add")?.addEventListener("click", e => {
        e.preventDefault();
        window.location.href = "addproduct.html";
    });
    document.querySelector(".function-btn-edit")?.addEventListener("click", e => {
        e.preventDefault();
        window.location.href = "editproduct.html";
    });
    document.querySelector(".function-btn-delete")?.addEventListener("click", e => {
        e.preventDefault();
        window.location.href = "delete.html";
    });

    // Add category
    document.getElementById('add-category-btn')?.addEventListener('click', function() {
        const newCategory = document.getElementById('new-category').value.trim();
        const categorySelect = document.getElementById('category');
        if (newCategory && categorySelect) {
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

    // Add maker
    document.getElementById('add-maker-btn')?.addEventListener('click', function() {
        const newMaker = document.getElementById('new-maker').value.trim();
        const makerSelect = document.getElementById('maker');
        if (newMaker && makerSelect) {
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

    // Add unit
    document.getElementById('add-unit-btn')?.addEventListener('click', function() {
        const newUnit = document.getElementById('new-unit').value.trim();
        const unitSelect = document.getElementById('unit');
        if (newUnit && unitSelect) {
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

    // Add location
    document.getElementById('add-location-btn')?.addEventListener('click', function() {
        const newLocation = document.getElementById('new-location').value.trim();
        const locationSelect = document.getElementById('location');
        if (newLocation && locationSelect) {
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

// กรองด้วยคำค้นหา
    const searchLower = search.toLowerCase();
    transactions = transactions.filter(item => {
        if (!search) return true;
        return (
            (item.product_code || '').toLowerCase().includes(searchLower) ||
            (item.product_name || '').toLowerCase().includes(searchLower) ||
            (item.model || '').toLowerCase().includes(searchLower)
        );
    });

    // Search product
    const searchInput = document.querySelector('.search-product-input');
    searchInput?.addEventListener('input', function() {
        const query = this.value.trim();
        document.getElementById('search-result')?.remove();
        if (!query) return;
        fetch(`${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(products => {
                const oldResult = document.getElementById('search-result');
                if (oldResult) oldResult.remove();
                const resultDiv = document.createElement('div');
                resultDiv.id = 'search-result';
                resultDiv.className = 'search-results-container';
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
                searchInput.parentNode.appendChild(resultDiv);

                // ให้ผลลัพธ์แสดง animation แบบ stagger
                requestAnimationFrame(() => resultDiv.classList.add('animate'));

                document.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', function() {
                        try {
                            const product = JSON.parse(this.dataset.product);
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

    // Submit form (add/edit product)
    document.querySelector('.product-form')?.addEventListener('submit', async function(e) {
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
            updatedDate: new Date().toLocaleDateString('th-TH', {
                year: 'numeric', month: 'numeric', day: 'numeric'
            }),
            updatedTime: new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            })
        };
        // Image
        const imageInput = document.getElementById('image');
        let imageBase64 = "";
        if (imageInput && imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            imageBase64 = await toBase64(file);
        }
        formData.image = imageBase64;

        const method = currentProductId ? 'PATCH' : 'POST';
        const url = currentProductId
            ? `${BACKEND_URL}/products/${currentProductId}`
            : `${BACKEND_URL}/products`;

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            alert(currentProductId ? 'อัปเดตสินค้าเรียบร้อย!' : 'บันทึกสินค้าเรียบร้อย!');
            this.reset();
            currentProductId = null;
            loadProducts();
        })
        .catch(err => {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        });
    });

    // Horizontal scroll for .product-table
    const tableBox = document.querySelector('.product-table');
    if (tableBox) {
        tableBox.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tableBox.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    // เพิ่ม: สไลด์ .navbar-text จากซ้ายแบบ stagger
    const navbarTextEls = document.querySelectorAll('.navbar .navbar-text');
    navbarTextEls.forEach((el, idx) => {
        // ซ่อนก่อน เพื่อให้ animation เริ่มจากซ้ายอย่างราบรื่น
        el.style.opacity = '0';
        // ค่าหน่วงเวลาเพิ่มขึ้นตามลำดับ (ms)
        const delay = 100 + idx * 120;
        el.style.animationDelay = `${delay}ms`;
        // ใส่คลาส แบบ requestAnimationFrame เพื่อให้ browser รับรู้การเปลี่ยนแปลงสถานะก่อนเริ่ม
        requestAnimationFrame(() => el.classList.add('slide-in'));
    });

    // Initial load
    loadProducts();
});
// ให้ scroll เมาส์แนวนอนเมื่อชี้ที่ .product-table
document.addEventListener('DOMContentLoaded', function() {
    const tableBox = document.querySelector('.product-table');
    if (tableBox) {
        tableBox.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tableBox.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }
});

