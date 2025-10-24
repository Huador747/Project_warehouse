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
});

async function renderProductsTablePage(products, page) {
  const container = document.getElementById("product-list");
  const perPage = 5;
  const totalPages = Math.ceil(products.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageProducts = products.slice(start, end);

  // ดึงข้อมูลซื้อ/ขายและคำนวณจำนวนคงเหลือ
  const { buyin, sale } = await fetchBuyinAndSale();
  const stockMap = computeStock(products, buyin, sale);

  // สร้าง HTML ตารางสินค้า (ไม่มี pagination-controls ในนี้)
  let html = `
    <div class="product-table">
      <table>
        <thead>
            <tr>
                <th>รหัสสินค้า</th>
                <th>Model</th>
                <th>ชื่อสินค้า</th>
                <th>Maker</th>
                <th>หมวดหมู่</th>
                <th>จำนวน</th>
                <th>สภาพ</th>
                <th>ราคา</th>
                <th>ราคาขาย</th>
                <th>หน่วย</th>
                <th>ที่เก็บ</th>
                <th>วันที่สร้าง</th>
                <th>เวลาสร้าง</th>
                <th>วันที่แก้ไข</th>
                <th>เวลาแก้ไข</th>
                <th>รูปภาพ</th>
            </tr>
        </thead>
        <tbody>
    `;
  html += pageProducts
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
            <td>${product.createdDate || "-"}</td>
            <td>${product.createdTime || "-"}</td>
            <td>${
              product.updatedDate ? product.updatedDate : "ยังไม่มีการแก้ไข"
            }</td>
            <td>${
              product.updatedTime ? product.updatedTime : "ยังไม่มีการแก้ไข"
            }</td>
            <td>
                ${
                  product.image
                    ? `<img src="${product.image}" alt="img" style="width:60px;height:60px;object-fit:contain;border-radius:8px;">`
                    : "-"
                }
            </td>
        </tr>
    `;
    })
    .join("");
  html += `
            </tbody>
        </table>
        </div>
    `;
  container.innerHTML = html;

  // สร้าง pagination-controls แยกต่างหาก
  let paginationHtml = `
    <div class="pagination-controls">
      <button id="prev-page" ${page === 1 ? "disabled" : ""}>ย้อนกลับ</button>
      <span>หน้า ${page} / ${totalPages}</span>
      <button id="next-page" ${page === totalPages ? "disabled" : ""}>ถัดไป</button>
    </div>
  `;

  // แทรก pagination-controls ต่อจาก product-list
  container.insertAdjacentHTML('afterend', paginationHtml);
  
  // เพิ่ม event scroll แนวนอนหลัง render ตาราง
  const tableBox = container.querySelector(".product-table");
  if (tableBox) {
    tableBox.addEventListener(
      "wheel",
      function (e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          tableBox.scrollLeft += e.deltaY;
        }
      },
      { passive: false }
    );
  }

  // เพิ่ม event ให้ปุ่ม
  document.getElementById("prev-page")?.addEventListener("click", () => {
    if (page > 1) {
      window.currentPage = page - 1;
      renderProductsTablePage(window.allProducts, window.currentPage);
    }
  });
  document.getElementById("next-page")?.addEventListener("click", () => {
    if (page < totalPages) {
      window.currentPage = page + 1;
      renderProductsTablePage(window.allProducts, window.currentPage);
    }
  });
}

function loadProducts() {
  fetch(`${BACKEND_URL}/products`)
    .then((res) => res.json())
    .then((products) => {
      const productList = document.getElementById("product-list");

      if (!products || products.length === 0) {
        productList.innerHTML =
          '<tr><td colspan="14" class="no-data">ไม่พบข้อมูลสินค้า</td></tr>';
        return;
      }

      // เพิ่มหัวตาราง
      let tableHTML = `
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>รหัสสินค้า</th>
                            <th>โมเดล</th>
                            <th>ชื่อสินค้า</th>
                            <th>ผู้ผลิต</th>
                            <th>ประเภท</th>
                            <th>สถานะ</th>
                            <th>ราคาต้นทุน</th>
                            <th>ราคาขาย</th>
                            <th>หน่วย</th>
                            <th>ตำแหน่ง</th>
                            <th>วันที่สร้าง</th>
                            <th>เวลาสร้าง</th>
                            <th>วันที่อัพเดท</th>
                            <th>เวลาอัพเดท</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

      tableHTML += products
        .map(
          (p) => `
                <tr>
                    <td>${p.product_code || "-"}</td>
                    <td>${p.model || "-"}</td>
                    <td>${p.product_name || "-"}</td>
                    <td>${p.maker || "-"}</td>
                    <td>${p.category || "-"}</td>
                    <td>${p.condition || "-"}</td>
                    <td>${p.price || "-"}</td>
                    <td>${p.sale_price || "-"}</td>
                    <td>${p.unit || "-"}</td>
                    <td>${p.location || "-"}</td>
                    <td>${p.createdDate || "-"}</td>
                    <td>${p.createdTime || "-"}</td>
                    <td>${p.updatedDate || "-"}</td>
                    <td>${p.updatedTime || "-"}</td>
                </tr>
            `
        )
        .join("");

      tableHTML += `
                    </tbody>
                </table>
            `;

      productList.innerHTML = tableHTML;
    })
    .catch((error) => {
      console.error("Error loading products:", error);
      const productList = document.getElementById("product-list");
      productList.innerHTML =
        '<tr><td colspan="14" class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    });
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
