import { BACKEND_URL } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    // ฟังก์ชันเพิ่ม option ใหม่ให้ dropdown
    function addNewOption(inputId, selectId) {
        const input = document.getElementById(inputId);
        const select = document.getElementById(selectId);
        const value = input.value.trim();
        
        if (!value) {
            alert('กรุณากรอกข้อมูล');
            return;
        }

        const exists = Array.from(select.options).some(opt => opt.value === value);
        
        if (exists) {
            alert('มีข้อมูลนี้อยู่แล้ว');
            select.value = value;
            input.value = '';
            return;
        }

        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
        select.value = value;
        input.value = '';
        
        console.log(`✅ เพิ่ม ${value} เข้า ${selectId} สำเร็จ`);
    }

    // Event listeners สำหรับปุ่มเพิ่มข้อมูล
    document.getElementById('add-maker-btn')?.addEventListener('click', () => {
        addNewOption('new-maker', 'maker');
    });

    document.getElementById('add-category-btn')?.addEventListener('click', () => {
        addNewOption('new-category', 'category');
    });

    document.getElementById('add-unit-btn')?.addEventListener('click', () => {
        addNewOption('new-unit', 'unit');
    });

    document.getElementById('add-location-btn')?.addEventListener('click', () => {
        addNewOption('new-location', 'location');
    });

    // Preview รูปภาพ
    document.getElementById('image')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('image-preview');
        
        if (!file) {
            previewContainer.innerHTML = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            this.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('ขนาดไฟล์ใหญ่เกินไป (ไม่เกิน 5MB)');
            this.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            previewContainer.innerHTML = `
                <img 
                    src="${evt.target.result}" 
                    alt="Preview" 
                    style="max-width: 180px; max-height: 180px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                />
            `;
        };
        reader.readAsDataURL(file);
    });

    // Submit ฟอร์ม
    document.querySelector('.product-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();

        console.log('📝 เริ่มบันทึกสินค้า...');

        const formData = new FormData(this);
        
        // ✅ รวบรวมข้อมูลทั้งหมด รวมถึง controls
        const productData = {
            product_code: formData.get('product_code')?.trim() || '',
            model: formData.get('model')?.trim() || '',
            product_name: formData.get('product_name')?.trim() || '',
            maker: formData.get('maker') || '',
            category: formData.get('category') || '',
            condition: formData.get('condition') || '',
            price: Number(formData.get('price')) || 0,
            sale_price: Number(formData.get('sale_price')) || 0,
            unit: formData.get('unit') || '',
            location: formData.get('location') || '',
            controls: formData.get('controls') || '', // ✅ เพิ่มบรรทัดนี้
            sale_status: 'ขายปกติ',
            quantity: 0
        };

        // บันทึกวันที่และเวลาสร้างในรูปแบบไทย
        const now = new Date();
        productData.createdDate = now.toLocaleDateString('th-TH');
        productData.createdTime = now.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        // จัดการรูปภาพ (Base64)
        const imageInput = document.getElementById('image');
        if (imageInput?.files[0]) {
            try {
                const base64 = await fileToBase64(imageInput.files[0]);
                productData.image = base64;
            } catch (err) {
                console.error('❌ Error converting image:', err);
                alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
                return;
            }
        }

        console.log('📦 ข้อมูลที่จะบันทึก:', {
            ...productData,
            image: productData.image ? `Base64 (${(productData.image.length / 1024).toFixed(2)} KB)` : 'ไม่มี'
        });

        // ส่งข้อมูลไปยัง Backend
        try {
            const response = await fetch(`${BACKEND_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'บันทึกไม่สำเร็จ');
            }

            const result = await response.json();
            console.log('✅ บันทึกสำเร็จ:', result);
            
            alert(`✅ บันทึกสินค้าสำเร็จ!\n\nรหัสสินค้า: ${productData.product_code}\nการควบคุม: ${productData.controls}`);
            
            // รีเซ็ตฟอร์ม
            this.reset();
            document.getElementById('image-preview').innerHTML = '';
            
            // ถามว่าต้องการเพิ่มสินค้าใหม่หรือไปหน้า Inventory
            const goToInventory = confirm('ต้องการไปดูสินค้าทั้งหมดหรือไม่?');
            if (goToInventory) {
                window.location.href = 'inventory.html';
            }
        } catch (error) {
            console.error('❌ Error saving product:', error);
            alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // Hamburger menu
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    hamburger?.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('sidebar-open');
    });

    document.addEventListener('click', (e) => {
        if (!sidebar?.contains(e.target) && !hamburger?.contains(e.target)) {
            sidebar?.classList.remove('sidebar-open');
            hamburger?.classList.remove('active');
        }
    });

    // Navbar animation
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('login.html');
    });
});

// ฟังก์ชันแปลงไฟล์เป็น Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}