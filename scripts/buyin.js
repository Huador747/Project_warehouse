import { BACKEND_URL } from "./config.js";

if (window.flatpickr) {
    flatpickr("#buyindate", {  
        dateFormat: "d/m/Y",
        altInput: true,
        altFormat: "d/m/Y",
        allowInput: true,
        defaultDate: "today",
        onReady: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const date = selectedDates[0];
                const buddhistYear = date.getFullYear() + 543;
                const day = ("0" + date.getDate()).slice(-2);
                const month = ("0" + (date.getMonth() + 1)).slice(-2);
                const thaiDate = day + "/" + month + "/" + buddhistYear;
                // นำ thaiDate ไปใช้ต่อได้หากต้องการ
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
                    todayBtn.onclick = function () {
                        fp.setDate(new Date());
                        fp.close();
                    };
                    calendarContainer.appendChild(todayBtn);
                }
            }
        },
        onChange: function (selectedDates) {
            if (selectedDates.length > 0) {
                const date = selectedDates[0];
                const buddhistYear = date.getFullYear() + 543;
                const day = ("0" + date.getDate()).slice(-2);
                const month = ("0" + (date.getMonth() + 1)).slice(-2);
                const thaiDate = day + "/" + month + "/" + buddhistYear;
                // นำ thaiDate ไปใช้ต่อได้หากต้องการ
            }
        },
    });
}

let currentProductId = null;

// คำนวณจำนวนคงเหลือจริงต่อ product_code
async function calculateRealStock(productCode) {
    try {
        const [buyinRes, saleRes] = await Promise.all([
            fetch(`${BACKEND_URL}/buyin_product`).then((r) => r.json()),
            fetch(`${BACKEND_URL}/sale_product`).then((r) => r.json()),
        ]);

        // รวมยอดซื้อเฉพาะสินค้าที่ตรงกับรหัส
        const totalBuyin = buyinRes.reduce((sum, b) => {
            if ((b.product_code || b.code) !== productCode) return sum;
            const qty = Number(b.quantity ?? b.buyin_quantity ?? b.buy_quantity) || 0;
            return sum + qty;
        }, 0);

        // รวมยอดขายเฉพาะสินค้าที่ตรงกับรหัส
        const totalSale = saleRes.reduce((sum, s) => {
            if ((s.product_code || s.code) !== productCode) return sum;
            const qty = Number(s.salequantity ?? s.sale_quantity ?? s.quantity) || 0;
            return sum + qty;
        }, 0);

        return {
            totalBuyin,
            totalSale,
            realStock: totalBuyin - totalSale,
        };
    } catch (error) {
        console.error("❌ Error calculating stock:", error);
        return { totalBuyin: 0, totalSale: 0, realStock: 0 };
    }
}

function isoToThaiDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear() + 543;
    return `${day}/${month}/${year}`;
}

function fillForm(product) {
    currentProductId = product._id;
    document.getElementById("product_code").value = product.product_code || "";
    document.getElementById("model").value = product.model || "";
    document.getElementById("price").value = product.price || 0;
    document.getElementById("unit").value = product.unit || "";
    document.getElementById("condition").value = product.condition || "";
    document.getElementById("quantity").value = product.quantity || 0;
    document.getElementById("total").value = product.total || 0;
    document.getElementById("note").value = product.note || "";
    document.getElementById("buyindate").value = isoToThaiDate(product.buyindate);

    updateTotal();

    // ลบผลลัพธ์การค้นหาและเคลียร์ช่องค้นหา
    document.getElementById("search-result")?.remove();
    const si = document.querySelector(".search-product-input");
    if (si) si.value = "";
}

function updateTotal() {
    const price = parseFloat(document.getElementById("price").value) || 0;
    const quantity = parseInt(document.getElementById("quantity").value) || 0;
    const total = price * quantity;
    document.getElementById("total").value = total;
}

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector(".search-product-input");

    // entrance animation
    const navbarText = document.querySelector(".navbar-text");
    if (navbarText) {
        requestAnimationFrame(() => navbarText.classList.add("slide-in"));
    }

    // Toggle sidebar
    const hamburger = document.getElementById("hamburger-btn");
    const sidebar = document.getElementById("sidebar");

    hamburger?.addEventListener("click", function (e) {
        e.stopPropagation();
        hamburger.classList.toggle("active");
        sidebar?.classList.toggle("sidebar-open");
    });

    // ปิด sidebar เมื่อคลิกนอก
    document.addEventListener("click", function (ev) {
        if (!sidebar?.contains(ev.target) && !hamburger?.contains(ev.target)) {
            sidebar?.classList.remove("sidebar-open");
            hamburger?.classList.remove("active");
        }
    });

    // entrance animation ให้ฟอร์ม
    const productForm = document.querySelector(".product-form");
    if (productForm) {
        productForm.classList.add("animate");
        const groups = productForm.querySelectorAll(".form-group");
        groups.forEach((g, idx) => {
            g.classList.add("stagger");
            g.style.animationDelay = 100 + idx * 70 + "ms";
        });
    }

    // ตรวจสอบสถานะสินค้า
    async function checkProductStatus(productCode) {
        try {
            const response = await fetch(
                `${BACKEND_URL}/products/search?q=${encodeURIComponent(productCode)}`
            );
            const products = await response.json();

            if (!Array.isArray(products) || products.length === 0) {
                return { valid: false, message: "ไม่พบสินค้า" };
            }

            const product = products[0];

            if (product.sale_status === "พักการขาย") {
                return {
                    valid: false,
                    message: `⚠️ สินค้านี้อยู่ในสถานะ "พักการขาย"\nรหัสสินค้า: "${productCode}"`,
                    product,
                };
            }

            return { valid: true, message: "ตรวจสอบสำเร็จ", product };
        } catch (error) {
            console.error("❌ Error checking product status:", error);
            return { valid: false, message: "เกิดข้อผิดพลาดในการตรวจสอบสถานะสินค้า" };
        }
    }

    // badge สถานะ
    function createStatusBadge(saleStatus) {
        if (saleStatus === "ขายปกติ") {
            return '<span class="status-badge status-active">ขายปกติ</span>';
        } else if (saleStatus === "พักการขาย") {
            return '<span class="status-badge status-paused">พักการขาย</span>';
        }
        return "";
    }

    // badge จำนวนคงเหลือ
    function createQuantityBadge(quantity, unit = "") {
        const qty = Number(quantity) || 0;
        let badgeClass = "quantity-badge";
        let icon = "📦";
        if (qty === 0) {
            badgeClass += " quantity-empty";
            icon = "❌";
        } else if (qty < 0) {
            badgeClass += " quantity-negative";
            icon = "⚠️";
        } else if (qty <= 5) {
            badgeClass += " quantity-low";
            icon = "⚠️";
        } else if (qty <= 20) {
            badgeClass += " quantity-medium";
            icon = "📊";
        } else {
            badgeClass += " quantity-high";
            icon = "✅";
        }
        return `<span class="${badgeClass}">${icon} ${qty} ${unit}</span>`;
    }

    // ระบบค้นหา - พร้อมแสดงจำนวนคงเหลือจริง (ปรับใช้จากโค้ดที่ให้มา)
    searchInput?.addEventListener("input", async function () {
        const query = this.value.trim();
        document.getElementById("search-result")?.remove();

        if (!query) return;

        try {
            const response = await fetch(
                `${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`
            );
            const products = await response.json();

            // คำนวณจำนวนคงเหลือจริงสำหรับทุกสินค้า (อิงตาม product_code)
            const productsWithStock = await Promise.all(
                products.map(async (p) => {
                    const stockData = await calculateRealStock(p.product_code);
                    return {
                        ...p,
                        realQuantity: stockData.realStock,
                        totalBuyin: stockData.totalBuyin,
                        totalSale: stockData.totalSale,
                    };
                })
            );

            const resultDiv = document.createElement("div");
            resultDiv.id = "search-result";
            resultDiv.className = "search-results-container";

            if (productsWithStock.length === 0) {
                resultDiv.innerHTML = '<div class="no-results">ไม่พบสินค้า</div>';
            } else {
                resultDiv.innerHTML = productsWithStock
                    .map((p) => {
                        const statusBadge = createStatusBadge(p.sale_status);
                        const quantityBadge = createQuantityBadge(p.realQuantity, p.unit);
                        const statusClass = p.sale_status === "พักการขาย" ? "item-paused" : "";
                        return `
                            <div class="search-item ${statusClass}" data-product='${JSON.stringify(
                                p
                            )}'>
                                <div class="search-item-header">
                                    <b class="product_code">${p.product_code || ""}</b>
                                    ${quantityBadge}
                                </div>
                                <span class="product_name">${p.product_name || ""}</span>
                                <small class="product_model">
                                    ${p.model || ""} | 
                                    <span class="maker">${p.maker || ""}</span> | 
                                    <span class="category">${p.category || ""}</span>
                                </small>
                                <div class="product_status">${statusBadge}</div>
                            </div>
                        `;
                    })
                    .join("");
            }

            // แทรกผลลัพธ์ใต้ parent
            const parent = this.closest(".search-logout-row");
            if (parent) {
                parent.appendChild(resultDiv);
            } else {
                this.parentNode.appendChild(resultDiv);
            }

            requestAnimationFrame(() => resultDiv.classList.add("animate"));

            // Event เลือกสินค้า (สำหรับ Buy-in อนุญาตให้เลือกแม้อยู่ในสถานะพักการขาย โดยยืนยันก่อน)
            resultDiv.querySelectorAll(".search-item").forEach((item) => {
                item.addEventListener("click", async function () {
                    const product = JSON.parse(this.dataset.product);
                    const statusCheck = await checkProductStatus(product.product_code);

                    if (!statusCheck.valid) {
                        const confirmBuy = confirm(
                            `${statusCheck.message}\n\nคุณต้องการบันทึกรายการซื้อนี้หรือไม่?\n(สินค้าจะยังคงอยู่ในสถานะพักการขาย)`
                        );
                        if (!confirmBuy) return;
                    }

                    fillForm(statusCheck.product || product);
                });
            });
        } catch (err) {
            console.error("❌ เกิดข้อผิดพลาดในการค้นหา:", err);
        }
    });

    // ปิดผลลัพธ์เมื่อคลิกข้างนอก
    document.addEventListener("click", function (e) {
        const inInput = searchInput ? searchInput.contains(e.target) : false;
        const inResult = document.getElementById("search-result")?.contains(e.target);
        if (!inInput && !inResult) {
            document.getElementById("search-result")?.remove();
        }
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", function () {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });

    // บันทึกรายการซื้อเข้า (บันทึกใหม่ทุกครั้ง)
    document.querySelector(".product-form")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        let productData = Object.fromEntries(formData.entries());

        // แปลง buyindate (d/m/Y) เป็น ISO
        if (productData.buyindate) {
            const [day, month, year] = productData.buyindate.split("/");
            let y = parseInt(year, 10);
            if (y > 2500) y -= 543;
            if (!isNaN(day) && !isNaN(month) && !isNaN(y)) {
                const isoDate = new Date(`${y}-${month}-${day}T00:00:00.000Z`);
                if (!isNaN(isoDate.getTime())) {
                    productData.buyindate = isoDate.toISOString();
                } else {
                    delete productData.buyindate;
                    alert("รูปแบบวันที่ไม่ถูกต้อง");
                }
            } else {
                delete productData.buyindate;
                alert("กรุณากรอกวันที่ให้ถูกต้อง");
            }
        }

        // แปลงตัวเลข
        productData.price = Number(productData.price) || 0;
        productData.quantity = Number(productData.quantity) || 0;
        productData.total = Number(productData.total) || 0;

        try {
            const res = await fetch(`${BACKEND_URL}/buyin_product`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
            });
            if (res.ok) {
                alert("บันทึกข้อมูลสำเร็จ");
                this.reset();
            } else {
                const data = await res.json();
                alert(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    });

    // คำนวณยอดรวมตามราคา/จำนวน
    document.getElementById("price")?.addEventListener("input", updateTotal);
    document.getElementById("quantity")?.addEventListener("input", updateTotal);
});

// หมายเหตุ: โค้ดตรวจสอบจำนวนขายไม่เกินจำนวนคงเหลือ (salequantity) ไม่ได้นำมาใช้ในหน้า Buy-in
// เพราะการซื้อเข้าระบบไม่ต้องจำกัดจำนวนตามสต็อกคงเหลือ
