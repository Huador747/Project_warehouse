document.addEventListener("DOMContentLoaded", function () {
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
            // วันเวลาสร้าง (บันทึกครั้งแรกเท่านั้น)
            createdDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' }),
            createdTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // แปลงไฟล์ภาพเป็น base64
        const imageInput = document.getElementById('image');
        let imageBase64 = "";
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            imageBase64 = await toBase64(file);
        }
        formData.image = imageBase64;

        fetch('http://192.168.0.101:3000/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            alert('บันทึกสินค้าเรียบร้อย!');
            this.reset();
        })
        .catch(err => {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        });
    });

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // เพิ่มประเภทใหม่เข้า dropdown
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
});