import { BACKEND_URL } from "./config.js";

let currentProductId = null;

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
function isoToThaiDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

// ฟังก์ชันคำนวณจำนวนคงเหลือจริง (ซื้อ - ขาย)
async function calculateRealStock(productCode) {
  try {
    const [buyinRes, saleRes] = await Promise.all([
      fetch(`${BACKEND_URL}/buyin_product`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/sale_product`).then((r) => r.json()),
    ]);

    // รวมยอดซื้อ
    const totalBuyin = buyinRes
      .filter((b) => b.product_code === productCode)
      .reduce(
        (sum, b) =>
          sum +
          (Number(b.quantity) ||
            Number(b.buyin_quantity) ||
            Number(b.buy_quantity) ||
            0),
        0
      );

    // รวมยอดขาย
    const totalSale = saleRes
      .filter((s) => s.product_code === productCode)
      .reduce(
        (sum, s) =>
          sum +
          (Number(s.salequantity) ||
            Number(s.sale_quantity) ||
            Number(s.quantity) ||
            0),
        0
      );

    // คำนวณคงเหลือ
    const realStock = totalBuyin - totalSale;

    return {
      totalBuyin,
      totalSale,
      realStock,
    };
  } catch (error) {
    console.error("❌ Error calculating stock:", error);
    return {
      totalBuyin: 0,
      totalSale: 0,
      realStock: 0,
    };
  }
}

// ฟังก์ชันตรวจสอบสถานะสินค้า (แก้ไขให้คำนวณจำนวนคงเหลือจริง)
async function checkProductStatus(productCode) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/products/search?q=${encodeURIComponent(productCode)}`
    );
    const products = await response.json();

    if (products.length === 0) {
      return { valid: false, message: "ไม่พบสินค้า" };
    }

    const product = products[0];

    // คำนวณจำนวนคงเหลือจริง
    const stockData = await calculateRealStock(productCode);
    product.realQuantity = stockData.realStock;
    product.totalBuyin = stockData.totalBuyin;
    product.totalSale = stockData.totalSale;

    // ตรวจสอบสถานะการขาย
    if (product.sale_status === "พักการขาย") {
      return {
        valid: false,
        message: `⚠️ สินค้ารหัส "${productCode}" อยู่ในสถานะ "พักการขาย"`,
        product: product,
      };
    }

    // ตรวจสอบจำนวนคงเหลือจริง
    if (product.realQuantity <= 0) {
      return {
        valid: false,
        message: `⚠️ สินค้าหมด\nสินค้ารหัส "${productCode}"\nซื้อ: ${stockData.totalBuyin} | ขาย: ${stockData.totalSale} | คงเหลือ: ${stockData.realStock}`,
        product: product,
      };
    }

    return {
      valid: true,
      message: "ตรวจสอบสำเร็จ",
      product: product,
    };
  } catch (error) {
    console.error("❌ Error checking product status:", error);
    return {
      valid: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบสถานะสินค้า",
    };
  }
}

// ฟังก์ชันสร้าง badge สถานะ
function createStatusBadge(saleStatus) {
  if (saleStatus === "ขายปกติ") {
    return '<span class="status-badge status-active">ขายปกติ</span>';
  } else if (saleStatus === "พักการขาย") {
    return '<span class="status-badge status-paused">พักการขาย</span>';
  }
  return "";
}

// ฟังก์ชันสร้าง badge จำนวนคงเหลือ
function createQuantityBadge(quantity, unit = "") {
  const qty = Number(quantity) || 0;
  let badgeClass = "quantity-badge";
  let icon = "📦";

  // กำหนดสีและไอคอนตามจำนวน
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

// ฟังก์ชันเติมข้อมูลในฟอร์ม
function fillForm(product) {
  currentProductId = product._id;
  document.getElementById("product_name").value = product.product_name || "";
  document.getElementById("product_code").value = product.product_code || "";
  document.getElementById("unit").value = product.unit || "";
  document.getElementById("condition").value = product.condition || "";
  document.getElementById("price").value = product.price || "";
  document.getElementById("sale_price").value = product.sale_price || "";
  document.getElementById("salequantity").value = "";

  // ตั้งค่า max ให้กับ input จำนวนขาย (ใช้จำนวนคงเหลือจริง)
  const salequantityInput = document.getElementById("salequantity");
  if (salequantityInput) {
    salequantityInput.max = product.realQuantity || 0;
  }

  // แสดงจำนวนคงเหลือจริง
  const availableQty = document.getElementById("available-qty");
  if (availableQty) {
    availableQty.textContent = `${product.realQuantity || 0} ${product.unit || ""}`;
  }

  if (typeof updateTotal === "function") updateTotal();

  document.getElementById("search-result")?.remove();
  searchInput.value = "";
}

const searchInput = document.querySelector(".search-product-input");

// ระบบค้นหา - พร้อมแสดงจำนวนคงเหลือจริง
searchInput.addEventListener("input", async function () {
  const query = this.value.trim();
  document.getElementById("search-result")?.remove();

  if (!query) return;

  try {
    const response = await fetch(
      `${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`
    );
    const products = await response.json();

    // คำนวณจำนวนคงเหลือจริงสำหรับทุกสินค้า
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
          const statusClass =
            p.sale_status === "พักการขาย" ? "item-paused" : "";

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

    // ให้ CSS animation ทำงาน
    requestAnimationFrame(() => {
      resultDiv.classList.add("animate");
    });

    // Event เลือกสินค้า
    resultDiv.querySelectorAll(".search-item").forEach((item) => {
      item.addEventListener("click", async function () {
        const product = JSON.parse(this.dataset.product);

        const statusCheck = await checkProductStatus(product.product_code);

        if (!statusCheck.valid) {
          showCustomModal({
            icon: "error",
            title: "ไม่สามารถขายสินค้าได้",
            text: statusCheck.message,
            confirmText: "ตกลง",
          });
          return;
        }

        fillForm(statusCheck.product);
      });
    });
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาดในการค้นหา:", err);
  }
});

// ตรวจสอบจำนวนขายไม่เกินจำนวนคงเหลือ
document.getElementById("salequantity")?.addEventListener("input", function () {
  const max = parseInt(this.max) || 0;
  const value = parseInt(this.value) || 0;

  if (value > max) {
    this.value = max;
    showCustomModal({
      icon: "error",
      title: "จำนวนขายเกินคงเหลือ",
      text: `⚠️ จำนวนขายต้องไม่เกิน ${max} ${document.getElementById("unit").value || "ชิ้น"}`,
      confirmText: "ตกลง"
    });
  }

  if (typeof updateTotal === "function") updateTotal();
});

// ปิดผลลัพธ์เมื่อคลิกข้างนอก
document.addEventListener("click", function (e) {
  if (
    !searchInput.contains(e.target) &&
    !document.getElementById("search-result")?.contains(e.target)
  ) {
    document.getElementById("search-result")?.remove();
  }
});

// เพิ่ม flatpickr สำหรับวันที่พร้อมตั้งค่าวันที่อัตโนมัติ
(function () {
  function formatDMY(date) {
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear(); // ใช้ ค.ศ. สำหรับค่าที่จะส่งไป backend
    return `${day}/${month}/${year}`;
  }

  function ensureTodayIfEmpty(inputEl) {
    if (inputEl && !inputEl.value) {
      inputEl.value = formatDMY(new Date());
    }
  }

  function setupDatePicker() {
    const input = document.querySelector("#saleoutdate");
    if (!input) return;

    if (window.flatpickr) {
      flatpickr("#saleoutdate", {
        dateFormat: "d/m/Y",
        altInput: true,
        altFormat: "d/m/Y",
        allowInput: true,
        defaultDate: new Date(), // ตั้งค่า default เป็นวันนี้
        locale: "th",
        onReady: function (selectedDates, dateStr, instance) {
          // ถ้า input ยังว่าง ให้ตั้งค่าเป็นวันนี้ทันที
          if (!instance.input.value) {
            instance.setDate(new Date(), true);
          }
          ensureTodayIfEmpty(instance.input);

          // ปุ่ม "วันนี้"
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
                fp.setDate(new Date(), true);
                fp.close();
              };
              calendarContainer.appendChild(todayBtn);
            }
          }
        },
        onOpen: function (selectedDates, dateStr, instance) {
          // กันกรณีเปิดปฏิทินครั้งแรกแล้วยังว่าง
          ensureTodayIfEmpty(instance.input);
        },
        onChange: function (selectedDates) {
          if (selectedDates.length > 0) {
            const date = selectedDates[0];
            const buddhistYear = date.getFullYear() + 543;
            const day = ("0" + date.getDate()).slice(-2);
            const month = ("0" + (date.getMonth() + 1)).slice(-2);
            const thaiDate = day + "/" + month + "/" + buddhistYear;
            // นำ thaiDate ไปใช้ต่อได้หากต้องการ (แสดงผล)
          }
        },
      });
    } else {
      // กรณีไม่มี flatpickr ให้เติมค่าวันนี้ลง input
      ensureTodayIfEmpty(input);
    }

    // Fallback ตอนส่งฟอร์ม: ถ้ายังว่างให้ใส่ "วันนี้" อัตโนมัติ
    const form = document.querySelector(".product-form");
    form?.addEventListener("submit", () => ensureTodayIfEmpty(document.querySelector("#saleoutdate")));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDatePicker);
  } else {
    setupDatePicker();
  }
})();

// Logout
const logoutBtn = document.getElementById("logout-btn");
logoutBtn?.addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace("login.html");
});

// ฟังก์ชันคำนวณยอดรวม
function updateTotal() {
  const price = parseFloat(document.getElementById("sale_price").value) || 0;
  const quantity = parseInt(document.getElementById("salequantity").value) || 0;
  const cost = parseFloat(document.getElementById("price").value) || 0;
  const shipping = parseFloat(document.getElementById("shipping").value) || 0;

  const total = price * quantity + shipping;
  document.getElementById("total").value = total.toFixed(2);

  const vat = total * 0.07;
  document.getElementById("vat").value = vat.toFixed(2);

  const total_vat = total + vat;
  document.getElementById("total_vat").value = total_vat.toFixed(2);

  const profit = total_vat - cost * quantity - shipping;
  document.getElementById("profit").value = profit.toFixed(2);
}

// Event listeners สำหรับคำนวณ
document.getElementById("sale_price")?.addEventListener("input", updateTotal);
document.getElementById("salequantity")?.addEventListener("input", updateTotal);
document.getElementById("price")?.addEventListener("input", updateTotal);
document.getElementById("shipping")?.addEventListener("input", updateTotal);

// ตั้งค่าเริ่มต้นค่าขนส่ง
if (document.getElementById("shipping")) {
  document.getElementById("shipping").value = 100;
}

// ดัก event submit ฟอร์ม - ไม่ต้องอัปเดต product.quantity อีกต่อไป
document
  .querySelector(".product-form")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const productCode = document.getElementById("product_code")?.value.trim();

    if (!productCode) {
      showCustomModal({
        icon: "error",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาระบุรหัสสินค้า",
        confirmText: "ตกลง",
      });
      return;
    }

    // ตรวจสอบสถานะสินค้าก่อนบันทึก
    const statusCheck = await checkProductStatus(productCode);

    if (!statusCheck.valid) {
      showCustomModal({
        icon: "error",
        title: "ไม่สามารถขายสินค้าได้",
        text: statusCheck.message,
        confirmText: "ตกลง",
      });
      return;
    }

    const formData = new FormData(this);
    let saleData = Object.fromEntries(formData.entries());

    // แปลงค่าที่ควรเป็นตัวเลข
    saleData.price = Number(saleData.price) || 0;
    saleData.sale_price = Number(saleData.sale_price) || 0;
    saleData.vat = Number(saleData.vat) || 0;
    saleData.salequantity = Number(saleData.salequantity) || 0;
    saleData.total = Number(saleData.total) || 0;
    saleData.total_vat = Number(saleData.total_vat) || 0;
    saleData.profit = Number(saleData.profit) || 0;
    saleData.shipping = Number(saleData.shipping) || 0;
    
    // ✅ เพิ่ม: แปลงค่าขนส่งเป็น Int32 และเก็บใน shipping_cost
    saleData.shipping_cost = Math.floor(Number(saleData.shipping) || 0);

    // แปลงวันที่
    if (saleData.saleoutdate) {
      const [day, month, year] = saleData.saleoutdate.split("/");
      let y = parseInt(year, 10);
      if (y > 2500) y -= 543;
      if (!isNaN(day) && !isNaN(month) && !isNaN(y)) {
        const isoDate = new Date(`${y}-${month}-${day}T00:00:00.000Z`);
        if (!isNaN(isoDate.getTime())) {
          saleData.saleoutdate = isoDate.toISOString();
        } else {
          delete saleData.saleoutdate;
          showCustomModal({
            icon: "error",
            title: "วันที่ไม่ถูกต้อง",
            text: "รูปแบบวันที่ไม่ถูกต้อง",
            confirmText: "ตกลง",
          });
          return;
        }
      } else {
        delete saleData.saleoutdate;
        showCustomModal({
          icon: "error",
          title: "วันที่ไม่ถูกต้อง",
          text: "กรุณากรอกวันที่ให้ถูกต้อง",
          confirmText: "ตกลง",
        });
        return;
      }
    }

    try {
      // บันทึกข้อมูลการขาย (ไม่ต้องอัปเดต product.quantity)
      const response = await fetch(`${BACKEND_URL}/sale_product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        throw new Error("Failed to save sale");
      }

      showCustomModal({
        icon: "success",
        title: "บันทึกการขายสำเร็จ",
        //text: `💰 ค่าขนส่ง: ${saleData.shipping_cost} บาท`,
        confirmText: "ตกลง",
        onClose: () => {
          // รีเซ็ตฟอร์มหลังปิด modal
          this.reset();
          document.getElementById("shipping").value = 100;
        }
      });
    } catch (error) {
      console.error("❌ Save error:", error);
      showCustomModal({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "เกิดข้อผิดพลาดในการบันทึก",
        confirmText: "ตกลง"
      });
    }
  });

// Custom Modal สำหรับแจ้งเตือน
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

    const formattedText = String(text || "").replace(/\n/g, "<br />");

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
        <div style="font-size: 1.1rem; color: #333; margin-bottom: 22px; line-height: 1.5;">
          ${formattedText}
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

// Hamburger menu และ animations
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");

  if (hamburger && sidebar) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      hamburger.classList.toggle("active");
      sidebar.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (ev) => {
      if (!sidebar.contains(ev.target) && !hamburger.contains(ev.target)) {
        sidebar.classList.remove("sidebar-open");
        hamburger.classList.remove("active");
      }
    });
  }

  // Navbar text animation (slide-in)
  const navbarTextEls = document.querySelectorAll('.navbar .navbar-text');
  navbarTextEls.forEach((el, idx) => {
    el.style.opacity = '0';
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
});