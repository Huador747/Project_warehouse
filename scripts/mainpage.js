import { BACKEND_URL } from "./config.js";

function animateCounter(element, to, duration = 800) {
  const from = parseInt(element.textContent) || 0;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(from + (to - from) * progress);
    element.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const res = await fetch(`${BACKEND_URL}/products`);
    const products = await res.json();
    window.allProducts = products;
    window.currentPage = 1;
    renderProductsTablePage(products, 1);

    // ดึงข้อมูลซื้อ/ขายและคำนวณจำนวนคงเหลือ
    const { buyin, sale } = await fetchBuyinAndSale();
    const stockMap = computeStock(products, buyin, sale);

    // Animated counter
    // 1. จำนวนสินค้าทั้งหมด
    const totalProductsElem = document.getElementById("total-products");
    if (totalProductsElem)
      animateCounter(totalProductsElem, products.length, 800);

    // 2. จำนวนประเภทสินค้า
    const categories = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];
    const totalCategoriesElem = document.getElementById("total-categories");
    if (totalCategoriesElem)
      animateCounter(totalCategoriesElem, categories.length, 800);

    // 3. พร้อมขาย: เฉพาะสินค้าที่ condition == "พร้อมขาย" และ stock > 0
    const available = products.filter((p) => {
      const code = p.product_code ?? p.code ?? "";
      return (stockMap[code] ?? 0) > 0;
    }).length;
    const totalAvailableElem = document.getElementById("total-available");
    if (totalAvailableElem) animateCounter(totalAvailableElem, available, 800);

    // 4. ไม่พร้อมขาย: เฉพาะสินค้าที่ condition == "ไม่พร้อมขาย" หรือ stock <= 0
    const unavailable = products.filter((p) => {
      const code = p.product_code ?? p.code ?? "";
      return p.condition === "ไม่พร้อมขาย" || (stockMap[code] ?? 0) <= 0;
    }).length;
    const totalUnavailableElem = document.getElementById("total-unavailable");
    if (totalUnavailableElem)
      animateCounter(totalUnavailableElem, unavailable, 800);
  } catch (err) {
    document.getElementById("product-list").innerHTML =
      '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า</div>';
  }

  // ช่องค้นหาแบบrealtime
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  function doSearch() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const filtered = window.allProducts.filter(
      (p) =>
        (p.product_code ?? "").toLowerCase().includes(q) ||
        (p.product_name ?? "").toLowerCase().includes(q) ||
        (p.model ?? "").toLowerCase().includes(q)
    );
    window.currentPage = 1;
    renderProductsTablePage(filtered, 1);
  }
  searchInput?.addEventListener("input", doSearch);
  searchBtn?.addEventListener("click", doSearch);

  const hamburger = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");

  hamburger?.addEventListener("click", function (e) {
    e.stopPropagation();
    hamburger.classList.toggle("active");
    sidebar.classList.toggle("sidebar-open");
  });

  // ปิด sidebar เมื่อคลิกข้างนอก
  document.addEventListener("click", function (ev) {
    if (!sidebar.contains(ev.target) && !hamburger.contains(ev.target)) {
      sidebar.classList.remove("sidebar-open");
      hamburger.classList.remove("active");
    }
  });
});

let currentPage = 1; // ตัวแปร global

function goToPage(products, page) {
  const perPage = 10;
  const totalPages = Math.ceil(products.length / perPage);

  // ป้องกันออกนอกขอบเขต
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  currentPage = page;
  renderProductsTablePage(products, currentPage);
}

// ปัญหานี้เกิดจากการที่ event listeners
// ถูกเพิ่มซ้ำๆ ทุกครั้งที่มีการ render ตาราง ทำให้เกิดการทำงานซ้ำซ้อน
let prevPageListener = null;
let nextPageListener = null;

async function renderProductsTablePage(products, page) {
  const tableBody = document.getElementById("product-table-body");
  const perPage = 5; // จำนวนแถวต่อหน้า
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageProducts = products.slice(start, end);

  // ดึงข้อมูลซื้อ/ขายและคำนวณจำนวนคงเหลือ
  const { buyin, sale } = await fetchBuyinAndSale();
  const stockMap = computeStock(products, buyin, sale);

  // สร้าง HTML สำหรับแถวข้อมูล
  let rowsHtml = pageProducts
    .map((product) => {
      const code = product.product_code ?? product.code ?? "";
      const stockQty = stockMap[code] ?? 0;
      return `
                <tr>
                    <td>${product.product_code || "-"}</td>
                    <td>${product.model || "-"}</td>
                    <td>${product.product_name || "-"}</td>
                    <td>${product.maker || "-"}</td>
                    <td>${product.category || "-"}</td>
                    <td>${stockQty}</td>
                    <td>${product.condition || "-"}</td>
                    <td>${product.price ?? "-"}</td>
                    <td>${product.sale_price || "-"}</td>
                    <td>${product.unit || "-"}</td>
                    <td>${product.location || "-"}</td>
                    <td>${thaiDateToAD(product.createdDate) || "-"}</td>
                    <td>${product.createdTime || "-"}</td>
                    <td>${
                      product.updatedDate
                        ? thaiDateToAD(product.updatedDate)
                        : "ยังไม่มีการแก้ไข"
                    }</td>
                    <td>${
                      product.updatedTime
                        ? product.updatedTime
                        : "ยังไม่มีการแก้ไข"
                    }</td>
                   <td>
  ${
    product.image
      ? `<img src="${product.image}" alt="img" class="product-img-thumb" style="width:80px;height:80px;object-fit:contain;border-radius:8px;cursor:pointer;" onclick="showImageModal('${product.image}')">`
      : `<span class="no-image-text">ไม่มีรูปภาพ</span>`
  }
</td>
                </tr>
            `;
    })
    .join("");

  // จะแก้ไขให้ตารางมีขนาดคงที่แม้ข้อมูลไม่ครบ 5 แถว โดยการเพิ่มแถวว่างเข้าไปให้ครบ 5 แถว
  const emptyRows = perPage - pageProducts.length;
  if (emptyRows > 0) {
    const emptyRowHtml = `
            <tr class="empty-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `;
    rowsHtml += emptyRowHtml.repeat(emptyRows);
  }

  tableBody.innerHTML = rowsHtml;

  // อัพเดท pagination
  const totalPages = Math.ceil(products.length / perPage);
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");

  // ลบ event listeners เดิมออก
  if (prevPageListener) {
    prevButton.removeEventListener("click", prevPageListener);
  }
  if (nextPageListener) {
    nextButton.removeEventListener("click", nextPageListener);
  }

  // สร้าง event listeners ใหม่
  prevPageListener = () => {
    if (page > 1) {
      renderProductsTablePage(products, page - 1);
    }
  };

  nextPageListener = () => {
    if (page < totalPages) {
      renderProductsTablePage(products, page + 1);
    }
  };

  // เพิ่ม event listeners ใหม่
  prevButton.addEventListener("click", prevPageListener);
  nextButton.addEventListener("click", nextPageListener);

  // อัพเดทสถานะปุ่ม
  prevButton.disabled = page === 1;
  nextButton.disabled = page === totalPages;
  document.getElementById(
    "page-info"
  ).textContent = `หน้า ${page} / ${totalPages}`;

  // เพิ่ม event scroll แนวนอนหลัง render ตาราง
  const tableBox = document.querySelector(".product-table");
  if (tableBox) {
    tableBox.addEventListener(
      "wheel",
      function (e) {
        // เลื่อนแนวนอนด้วยลูกกลิ้งเมาส์ (ไม่ต้องกด Shift)
        if (e.deltaX !== 0 || e.deltaY !== 0) {
          e.preventDefault();
          tableBox.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
        }
      },
      { passive: false }
    );
  }
}

async function fetchBuyinAndSale() {
  const [buyinRes, saleRes] = await Promise.all([
    fetch(`${BACKEND_URL}/buyin_product`)
      .then((r) => r.json())
      .catch(() => []),
    fetch(`${BACKEND_URL}/sale_product`)
      .then((r) => r.json())
      .catch(() => []),
  ]);
  return {
    buyin: Array.isArray(buyinRes) ? buyinRes : [],
    sale: Array.isArray(saleRes) ? saleRes : [],
  };
}

function computeStock(products, buyin, sale) {
  const stockMap = {};
  products.forEach((p) => {
    const code = p.product_code ?? p.code ?? "";
    stockMap[code] = 0;
  });
  buyin.forEach((b) => {
    const code = b.product_code ?? b.code ?? "";
    const qty = Number(
      b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0
    );
    if (code in stockMap) stockMap[code] += qty;
  });
  sale.forEach((s) => {
    const code = s.product_code ?? s.code ?? "";
    const qty = Number(
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0
    );
    if (code in stockMap) stockMap[code] -= qty;
  });
  return stockMap;
}

function thaiDateToISO(dateStr) {
  // รับรูปแบบ "15/10/2568" → คืนค่า "2025-10-15"
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const [d, m, y] = dateStr.split("/");
  const yearAD = +y > 2400 ? +y - 543 : +y;
  return `${yearAD}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function thaiDateToAD(dateStr) {
  // รับ "15/10/2568" → คืนค่า "15/10/2025"
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const [d, m, y] = dateStr.split("/");
  const yearAD = +y > 2400 ? +y - 543 : +y;
  return `${d}/${m}/${yearAD}`;
}

window.showImageModal = function (src) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  if (modal && modalImg) {
    modalImg.src = src;
    modal.style.display = "flex";
  }
};

window.closeImageModal = function () {
  const modal = document.getElementById("image-modal");
  if (modal) modal.style.display = "none";
};

// ปิด modal เมื่อคลิกที่พื้นหลัง
document.addEventListener("click", function (e) {
  const modal = document.getElementById("image-modal");
  if (modal && modal.style.display === "flex" && e.target === modal) {
    modal.style.display = "none";
  }
});
