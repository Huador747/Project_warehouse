import { BACKEND_URL } from "./config.js";

let currentProductId = null;
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
  document.getElementById("product_name").value = product.product_name || "";
  document.getElementById("product_code").value = product.product_code || "";
  document.getElementById("unit").value = product.unit || "";
  document.getElementById("condition").value = product.condition || "";
  document.getElementById("price").value = product.price || "";
  document.getElementById("salequantity").value = product.salequantity || "";
  document.getElementById("total_vat").value = product.total_vat || "";
  document.getElementById("profit").value = product.profit || "";
  document.getElementById("customerName").value = product.customerName || "";
  document.getElementById("saleoutdate").value = isoToThaiDate(
    product.saleoutdate
  );
  //เติมข้อมูลลงฟอร์ม

  if (typeof updateTotal === "function") updateTotal();

  document.getElementById("search-result")?.remove();
  searchInput.value = "";
}

const searchInput = document.querySelector(".search-product-input");

// ระบบค้นหา
searchInput.addEventListener("input", function () {
  const query = this.value.trim();
  document.getElementById("search-result")?.remove();

  if (!query) return;

  fetch(`${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`) // ใช้ BACKEND_URL
    .then((res) => res.json())
    .then((products) => {
      const resultDiv = document.createElement("div");
      resultDiv.id = "search-result";
      resultDiv.className = "search-results-container";
      resultDiv.style.position = "absolute";
      resultDiv.style.background = "#faf2b9ff";
      resultDiv.style.border = "1px solid #ccc";
      resultDiv.style.width = searchInput.offsetWidth + "px";
      resultDiv.style.zIndex = 9999;
      resultDiv.style.maxHeight = "250px";
      resultDiv.style.overflowY = "auto";

      if (products.length === 0) {
        resultDiv.innerHTML = '<div class="no-results">ไม่พบสินค้า</div>';
      } else {
        resultDiv.innerHTML = products
          .map(
            (p) => `
                        <div class="search-item" style="padding:8px;cursor:pointer;" data-product='${JSON.stringify(
                          p
                        )}'>
                            <b class="product_code">${p.product_code || ""}</b>
                            <span class="product_name">${
                              p.product_name || ""
                            }</span>
                            <small class="product_model">
                                ${p.model || ""} | 
                                <span class="maker">${p.maker || ""}</span> | 
                                <span class="category">${
                                  p.category || ""
                                }</span>
                            </small>
                        </div>
                    `
          )
          .join("");
      }

      // แทรกผลลัพธ์ใต้ input
      searchInput.parentNode.insertBefore(resultDiv, searchInput.nextSibling);

      // Event เลือกสินค้า
      resultDiv.querySelectorAll(".search-item").forEach((item) => {
        item.addEventListener("click", function () {
          const product = JSON.parse(this.dataset.product);
          fillForm(product);
        });
      });

      requestAnimationFrame(() => {
        document.getElementById("search-result")?.classList.add("animate");
      });
    })
    .catch((err) => {
      console.error("เกิดข้อผิดพลาดในการค้นหา:", err);
    });
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
// เพิ่ม flatpickr สำหรับ saleoutdate
if (window.flatpickr) {
  flatpickr("#saleoutdate", {
    dateFormat: "d/m/Y",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: true,
    defaultDate: "today",
    locale: "th",
    onReady: function (selectedDates, dateStr, instance) {
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
  });
}

 // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    });

// ดัก event submit ฟอร์ม ขายสินค้า
document
  .querySelector(".product-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

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
          alert("รูปแบบวันที่ไม่ถูกต้อง");
        }
      } else {
        delete saleData.saleoutdate;
        alert("กรุณากรอกวันที่ให้ถูกต้อง");
      }
    }

    // ส่งข้อมูลไป sale_product
    try {
      const res = await fetch(`${BACKEND_URL}/sale_product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
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

function updateTotal() {
  const price = parseFloat(document.getElementById("sale_price").value) || 0;
  const quantity = parseInt(document.getElementById("salequantity").value) || 0;
  const cost = parseFloat(document.getElementById("price").value) || 0;
  const shipping = parseFloat(document.getElementById("shipping").value) || 0;

  // คำนวณยอดรวม (รวมค่าขนส่ง)
  const total = (price * quantity) + shipping;
  document.getElementById("total").value = total.toFixed(2);

  // คำนวณ VAT 7%
  const vat = total * 0.07;
  document.getElementById("vat").value = vat.toFixed(2);

  // คำนวณยอดรวม VAT
  const total_vat = total + vat;
  document.getElementById("total_vat").value = total_vat.toFixed(2);

  // คำนวณกำไร (ราคารวมภาษี - ต้นทุน*จำนวน - ค่าขนส่ง)
  const profit = total_vat - (cost * quantity) - shipping;
  document.getElementById("profit").value = profit.toFixed(2);
}

// เรียกใช้เมื่อกรอกหรือเปลี่ยนราคาขาย, จำนวนที่ขาย, หรือต้นทุน
document.getElementById("sale_price").addEventListener("input", updateTotal);
document.getElementById("salequantity").addEventListener("input", updateTotal);
document.getElementById("price").addEventListener("input", updateTotal);
document.getElementById("shipping").addEventListener("input", updateTotal);
document.getElementById("shipping").value = 100;

app.post("/sale_product", async (req, res) => {
  // ...
});

const SaleProductSchema = new mongoose.Schema({
  saleoutdate: Date,
  productName: String,
  productCode: String,
  unit: String,
  condition: String,
  price: Number,
  sale_price: Number,
  vat: Number, 
  salequantity: Number,
  total: Number,
  total_vat: Number,
  profit: Number,
  customerName: String,
  notesale: String,
  shipping: Number,
});

// เพิ่มการสไลด์ navbar-text, entrance ฟอร์ม, hamburger toggle และ animation ให้ผลลัพธ์การค้นหา
document.addEventListener("DOMContentLoaded", () => {
  // Toggle Sidebar
  const hamburger = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");
  
  if (hamburger && sidebar) {
      // เมื่อคลิกที่ปุ่ม hamburger
      hamburger.addEventListener("click", (e) => {
          e.stopPropagation();
          hamburger.classList.toggle("active");
          sidebar.classList.toggle("sidebar-open");
      });

      // ปิด sidebar เมื่อคลิกนอก
      document.addEventListener("click", (ev) => {
          if (!sidebar.contains(ev.target) && !hamburger.contains(ev.target)) {
              sidebar.classList.remove("sidebar-open");
              hamburger.classList.remove("active");
          }
      });
  }

  // slide-in navbar text
  const navbarText = document.querySelector(".navbar-text");
  if (navbarText)
    requestAnimationFrame(() => navbarText.classList.add("slide-in"));

  // entrance + stagger ให้ฟอร์ม
  const productForm = document.querySelector(".product-form");
  if (productForm) {
    productForm.classList.add("animate");
    const groups = productForm.querySelectorAll(".form-group");
    groups.forEach((g, idx) => {
      g.classList.add("stagger");
      g.style.animationDelay = 100 + idx * 70 + "ms";
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
        });
    }
});
