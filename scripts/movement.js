import { BACKEND_URL } from "./config.js";

const ctx = document.getElementById("movementChart").getContext("2d");
let chart;

const productSelect = document.getElementById("product-select");
const inventoryInfo = document.getElementById("inventory-info");

// เพิ่มด้านบน
const yearSelect = document.getElementById("year-select");
const yearLabel = document.getElementById("year-label");

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
// Logout
const logoutBtn = document.getElementById("logout-btn");
logoutBtn?.addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace("login.html");
});

async function fetchAll() {
  try {
    const [productsRes, buyinRes, saleRes] = await Promise.all([
      fetch(`${BACKEND_URL}/products`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${BACKEND_URL}/buyin_product`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${BACKEND_URL}/sale_product`)
        .then((r) => r.json())
        .catch(() => []),
    ]);
    return {
      products: Array.isArray(productsRes) ? productsRes : [],
      buyin: Array.isArray(buyinRes) ? buyinRes : [],
      sale: Array.isArray(saleRes) ? saleRes : [],
    };
  } catch (err) {
    console.error("fetchAll error", err);
    return { products: [], buyin: [], sale: [] };
  }
}

// คำนวณสต็อกจาก products + ประวัติซื้อ/ขาย และเก็บข้อมูลต้นทุนจากการซื้อ
function computeInventory(products, buyin, sale) {
  const map = {};

  // init จาก products
  (products || []).forEach((p) => {
    const code = p.product_code ?? p.code ?? (p._id ? String(p._id) : "");
    if (!code) return;
    map[code] = {
      product_code: code,
      product_name: p.product_name ?? p.name ?? "-",
      qty: toNumber(p.quantity ?? p.qty ?? p.stock ?? 0),
      productObj: p,
      buyTotalQty: 0,
      buyTotalCost: 0,
    };
  });

  // accumulate buyin (เพิ่มจำนวน และรวมต้นทุนเพื่อคำนวณ average cost)
  (buyin || []).forEach((b) => {
    const code = b.product_code ?? b.code ?? "";
    if (!code) return;
    if (!map[code])
      map[code] = {
        product_code: code,
        product_name: b.product_name ?? b.name ?? "-",
        qty: 0,
        productObj: {},
        buyTotalQty: 0,
        buyTotalCost: 0,
      };
    const q = toNumber(
      b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0
    );
    // หา cost per unit ในรายการซื้อ
    const price = toNumber(b.price ?? b.buy_price ?? b.unit_price ?? 0);
    const total = toNumber(b.total ?? 0) || q * price;
    map[code].qty += q;
    map[code].buyTotalQty += q;
    map[code].buyTotalCost += total;
  });

  // subtract sale
  (sale || []).forEach((s) => {
    const code = s.product_code ?? s.code ?? "";
    if (!code) return;
    if (!map[code])
      map[code] = {
        product_code: code,
        product_name: s.product_name ?? s.name ?? "-",
        qty: 0,
        productObj: {},
        buyTotalQty: 0,
        buyTotalCost: 0,
      };
    const q = toNumber(
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0
    );
    map[code].qty -= q;
  });

  return map;
}

// ประเมินต้นทุนต่อหน่วย: ใช้จาก product field ถ้ามี มิฉะนั้นใช้ average buy price หากมี
function estimateUnitCost(mapEntry, buyinList) {
  const p = mapEntry.productObj || {};
  const priceKeys = [
    "cost",
    "cost_price",
    "price",
    "buy_price",
    "unit_cost",
    "purchase_price",
  ];
  for (const k of priceKeys) {
    if (k in p && p[k] != null && p[k] !== "") return toNumber(p[k]);
  }
  // ถ้ามีข้อมูลรวมจาก computeInventory
  if (mapEntry.buyTotalQty && mapEntry.buyTotalQty > 0) {
    return mapEntry.buyTotalCost / mapEntry.buyTotalQty;
  }
  // fallback: ค้นหาในรายการซื้อแยก (ถ้ากรณี mapEntry ไม่มี buys)
  if (buyinList && buyinList.length) {
    const buys = buyinList.filter(
      (b) => (b.product_code ?? b.code ?? "") === mapEntry.product_code
    );
    let totalQty = 0,
      totalCost = 0;
    buys.forEach((b) => {
      const q = toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0);
      const price = toNumber(b.price ?? b.buy_price ?? 0);
      const total = toNumber(b.total ?? price * q);
      totalQty += q;
      totalCost += total;
    });
    if (totalQty) return totalCost / totalQty;
  }
  return 0;
}

function renderInventorySummary(entries) {
  // คำนวณเงินจมรวม
  const totalSunk = (entries || []).reduce((s, e) => s + toNumber(e.sunk), 0);
  // คำนวณกำไรรวม
  const totalProfit = (entries || []).reduce(
    (s, e) => s + toNumber(e.profit),
    0
  );
  // คำนวณยอดขายรวม
  const totalSale = (entries || []).reduce(
    (s, e) => s + toNumber(e.saleTotal),
    0
  );

  // แสดงผลรวม
  inventoryInfo.innerHTML = `
    <div style="color:orange;">ยอดขายรวม: ${totalSale.toLocaleString(
      "th-TH"
    )} บาท</div>
    <div style="color:green;">กำไรรวม: ${totalProfit.toLocaleString(
      "th-TH"
    )} บาท</div>
    <div style="color:red;">เงินจมรวม: ${totalSunk.toLocaleString(
      "th-TH"
    )} บาท</div>
  `;
}

// เพิ่มการคำนวณกำไรใน showInventoryInfo
async function showInventoryInfo(productCode = "", selectedYear = null) {
  const { products, buyin, sale } = await fetchAll();
  const map = computeInventory(products, buyin, sale);

  // กรองข้อมูลตามปีที่เลือก (ถ้ามี)
  let filteredBuyin = buyin,
    filteredSale = sale;
  if (selectedYear) {
    filteredBuyin = buyin.filter((b) => {
      const dt = new Date(b.buyindate ?? b.date);
      return dt.getFullYear() === Number(selectedYear);
    });
    filteredSale = sale.filter((s) => {
      const dt = new Date(s.saleoutdate ?? s.date);
      return dt.getFullYear() === Number(selectedYear);
    });
  }

  // สร้างแผนที่ยอดขายต่อสินค้า
  const saleMap = {};
  (filteredSale || []).forEach((s) => {
    const code = s.product_code ?? s.code ?? "";
    if (!code) return;
    const qty = toNumber(
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0
    );
    const total = toNumber(s.total ?? toNumber(s.sale_price ?? s.price) * qty);
    if (!saleMap[code]) saleMap[code] = { qty: 0, total: 0 };
    saleMap[code].qty += qty;
    saleMap[code].total += total;
  });

  const allEntries = Object.values(map).map((e) => {
    // ต้นทุนเฉลี่ยจากปีที่เลือก
    const cost = estimateUnitCost(e, filteredBuyin);
    // เงินจม = จำนวนคงเหลือในปีนั้น * ต้นทุนเฉลี่ย
    const sunk = toNumber(e.qty) * toNumber(cost);

    // กำไร = ยอดขาย - ต้นทุนขายออก (เฉพาะที่ขายออกในปีนั้น)
    const saleInfo = saleMap[e.product_code] || { qty: 0, total: 0 };
    const costOfSold = toNumber(saleInfo.qty) * toNumber(cost);
    const profit = toNumber(saleInfo.total) - costOfSold;

    // ยอดรวมซื้อของสินค้าแต่ละตัว (ปีนั้น)
    const buyTotalCost = filteredBuyin
      .filter((b) => (b.product_code ?? b.code ?? "") === e.product_code)
      .reduce(
        (sum, b) =>
          sum +
          toNumber(
            b.total ??
              toNumber(b.price ?? b.buy_price) *
                toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)
          ),
        0
      );

    // ยอดรวมขายของสินค้าแต่ละตัว (ปีนั้น)
    const saleTotal = saleInfo.total ?? 0;

    return {
      code: e.product_code,
      name: e.product_name || (e.productObj.product_name ?? "-"),
      qty: toNumber(e.qty),
      cost: toNumber(cost),
      sunk: toNumber(sunk),
      profit: toNumber(profit),
      buyTotalCost: toNumber(buyTotalCost),
      saleTotal: toNumber(saleTotal),
    };
  });

  const filtered = productCode
    ? allEntries.filter((x) => x.code === productCode)
    : allEntries;
  renderInventorySummary(filtered);
}

// สร้าง dropdown สินค้า (เติมเมื่อมีข้อมูล)
async function populateProductSelect() {
  const { products } = await fetchAll();
  // เก็บตัวเลือกเดิม (index 0 = "ทั้งหมด")
  const existingFirst = productSelect.options.length
    ? productSelect.options[0].outerHTML
    : null;
  productSelect.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "ทั้งหมด";
  productSelect.appendChild(optAll);
  (products || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.product_code ?? p.code ?? (p._id ? String(p._id) : "");
    opt.textContent = `${opt.value} - ${p.product_name ?? p.name ?? "-"}`;
    productSelect.appendChild(opt);
  });
}

// เพิ่มเติม: สร้าง dropdown ปี
async function populateYearSelect() {
  const { buyin, sale } = await fetchAll();
  const years = new Set();
  const safeDate = (d) => {
    try {
      return new Date(d);
    } catch {
      return new Date(NaN);
    }
  };
  (buyin || []).forEach((b) => {
    const dt = safeDate(b.buyindate ?? b.date);
    if (!isNaN(dt)) years.add(dt.getFullYear());
  });
  (sale || []).forEach((s) => {
    const dt = safeDate(s.saleoutdate ?? s.date);
    if (!isNaN(dt)) years.add(dt.getFullYear());
  });
  const sorted = Array.from(years).sort((a, b) => b - a);
  yearSelect.innerHTML = "";
  sorted.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
  if (sorted.length) yearSelect.value = sorted[0];
}

async function fetchStats(
  type = "month",
  productCode = "",
  selectedYear = null
) {
  const { products, buyin, sale } = await fetchAll();
  if (productSelect.options.length <= 1) await populateProductSelect();

  const now = new Date();
  let labels = [];
  let buyinSummary = [];
  let saleSummary = [];

  const safeDate = (d) => {
    try {
      return new Date(d);
    } catch {
      return new Date(NaN);
    }
  };

  if (type === "year") {
    // ใช้ปีที่เลือกจาก yearSelect
    const year = Number(selectedYear);
    labels = [year.toString()];
    buyinSummary = [
      buyin
        .filter((b) => {
          const dt = safeDate(b.buyindate ?? b.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            (!productCode || (b.product_code ?? b.code) === productCode)
          );
        })
        .reduce(
          (sum, b) =>
            sum +
            toNumber(
              b.total ??
                toNumber(b.price ?? b.buy_price) *
                  toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)
            ),
          0
        ),
    ];
    saleSummary = [
      sale
        .filter((s) => {
          const dt = safeDate(s.saleoutdate ?? s.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            (!productCode || (s.product_code ?? s.code) === productCode)
          );
        })
        .reduce(
          (sum, s) =>
            sum +
            toNumber(
              s.total ??
                toNumber(s.sale_price ?? s.price) *
                  toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0)
            ),
          0
        ),
    ];
  } else if (type === "quarter") {
    // ใช้ปีที่เลือกจาก yearSelect (ถ้าไม่มีให้ใช้ปีปัจจุบัน)
    const year = Number(yearSelect?.value) || new Date().getFullYear();
    labels = [
      `ไตรมาสที่ 1\nมกราคม - มีนาคม ${year}`,
      `ไตรมาสที่ 2\nเมษายน - มิถุนายน ${year}`,
      `ไตรมาสที่ 3\nกรกฎาคม - กันยายน ${year}`,
      `ไตรมาสที่ 4\nตุลาคม - ธันวาคม ${year}`,
    ];
    buyinSummary = [1, 2, 3, 4].map((q) =>
      buyin
        .filter((b) => {
          const dt = safeDate(b.buyindate ?? b.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            Math.floor(dt.getMonth() / 3) + 1 === q &&
            (!productCode || (b.product_code ?? b.code) === productCode)
          );
        })
        .reduce(
          (sum, b) =>
            sum +
            toNumber(
              b.total ??
                toNumber(b.price ?? b.buy_price) *
                  toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)
            ),
          0
        )
    );
    saleSummary = [1, 2, 3, 4].map((q) =>
      sale
        .filter((s) => {
          const dt = safeDate(s.saleoutdate ?? s.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            Math.floor(dt.getMonth() / 3) + 1 === q &&
            (!productCode || (s.product_code ?? s.code) === productCode)
          );
        })
        .reduce(
          (sum, s) =>
            sum +
            toNumber(
              s.total ??
                toNumber(s.sale_price ?? s.price) *
                  toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0)
            ),
          0
        )
    );
  } else {
    // รายเดือน: ใช้ปีที่เลือกจาก yearSelect
    const year = Number(selectedYear) || now.getFullYear();
    labels = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    buyinSummary = Array.from({ length: 12 }, (_, i) =>
      buyin
        .filter((b) => {
          const dt = safeDate(b.buyindate ?? b.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            dt.getMonth() === i &&
            (!productCode || (b.product_code ?? b.code) === productCode)
          );
        })
        .reduce(
          (sum, b) =>
            sum +
            toNumber(
              b.total ??
                toNumber(b.price ?? b.buy_price) *
                  toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)
            ),
          0
        )
    );
    saleSummary = Array.from({ length: 12 }, (_, i) =>
      sale
        .filter((s) => {
          const dt = safeDate(s.saleoutdate ?? s.date);
          return (
            !isNaN(dt) &&
            dt.getFullYear() === year &&
            dt.getMonth() === i &&
            (!productCode || (s.product_code ?? s.code) === productCode)
          );
        })
        .reduce(
          (sum, s) =>
            sum +
            toNumber(
              s.total ??
                toNumber(s.sale_price ?? s.price) *
                  toNumber(s.salequantity ?? s.quantity ?? s.qty ?? 0)
            ),
          0
        )
    );
  }

  return { labels, buyinSummary, saleSummary };
}

async function renderChart(
  type = "month",
  productCode = "",
  selectedYear = null
) {
  const { labels, buyinSummary, saleSummary } = await fetchStats(
    type,
    productCode,
    selectedYear
  );

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: productCode
            ? `ยอดซื้อสินค้ารหัส ${productCode} (บาท)`
            : "ยอดซื้อ (บาท)",
          data: buyinSummary,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
        },
        {
          label: productCode
            ? `ยอดขายสินค้ารหัส ${productCode} (บาท)`
            : "ยอดขาย (บาท)",
          data: saleSummary,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: { beginAtZero: true },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            callback: function (val) {
              // แยกข้อความตาม \n และคืนค่าเป็น array เพื่อให้แสดงหลายบรรทัด
              const label = this.getLabelForValue(val);
              return label.split("\n");
            },
          },
        },
      },
    },
  });
}

// event listeners
document
  .getElementById("period-type")
  .addEventListener("change", async function () {
    // ให้รายเดือนก็แสดงดรอปดาวน์ปีด้วย
    if (["month", "quarter", "year"].includes(this.value)) {
      await populateYearSelect();
      yearSelect.style.display = "";
      yearLabel.style.display = "";
    } else {
      yearSelect.style.display = "none";
      yearLabel.style.display = "none";
    }
    const selectedYear = yearSelect.value;
    renderChart(this.value, productSelect.value, selectedYear);
    showInventoryInfo(productSelect.value, selectedYear);
  });

productSelect.addEventListener("change", function () {
  const periodType = document.getElementById("period-type").value;
  const selectedYear = yearSelect.value;
  renderChart(periodType, this.value, selectedYear);
  showInventoryInfo(this.value, selectedYear);
});

yearSelect.addEventListener("change", function () {
  const periodType = document.getElementById("period-type").value;
  renderChart(periodType, productSelect.value, yearSelect.value);
  showInventoryInfo(productSelect.value, yearSelect.value);
});

//กดให้sidebarค้างไว้
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");

  // Toggle sidebar
  hamburger?.addEventListener("click", function (e) {
    e.stopPropagation();
    hamburger.classList.toggle("active");
    sidebar.classList.toggle("sidebar-open");
  });

  // ปิด sidebar เมื่อคลิกนอก
  document.addEventListener("click", function (ev) {
    if (!sidebar.contains(ev.target) && !hamburger.contains(ev.target)) {
      sidebar.classList.remove("sidebar-open");
      hamburger.classList.remove("active");
    }
  });
});

//กดให้sidebarค้างไว้
document.addEventListener("DOMContentLoaded", () => {
  const navbarText = document.querySelector(".navbar-text");
  if (navbarText) {
    requestAnimationFrame(() => {
      navbarText.classList.add("slide-in");
    });
  }
});

// init
(async function init() {
  await populateProductSelect();
  await populateYearSelect();
  const periodType = document.getElementById("period-type")?.value || "month";
  const selectedYear = yearSelect.value;
  renderChart(periodType, "", selectedYear);
  showInventoryInfo("", selectedYear);
})();

async function renderProductsTablePage(products, page) {
  const perPage = 10;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedProducts = products.slice(start, end);
}

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".search-product-input");
  const productSelect = document.getElementById("product-select");
  const productLabel = document.querySelector('label[for="product-select"]');

  // ระบบค้นหาแบบ buyin
  searchInput.addEventListener("input", function () {
    const query = this.value.trim();
    document.getElementById("search-result")?.remove();

    if (!query) return;

    fetch(`${BACKEND_URL}/products/search?q=${encodeURIComponent(query)}`)
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
              <span class="product_name">${p.product_name || ""}</span>
              <small class="product_model">
                ${p.model || ""} | 
                <span class="maker">${p.maker || ""}</span> | 
                <span class="category">${p.category || ""}</span>
              </small>
            </div>
          `
            )
            .join("");
        }

        // แทรกผลลัพธ์ใต้ input
        searchInput.parentNode.insertBefore(resultDiv, searchInput.nextSibling);

        // Animation
        requestAnimationFrame(() => {
          resultDiv.classList.add("animate");
        });

        // Event เลือกสินค้า
        resultDiv.querySelectorAll(".search-item").forEach((item) => {
          item.addEventListener("click", function () {
            const product = JSON.parse(this.dataset.product);

            // เติมชื่อสินค้าใน select ถ้ายังไม่มี
            let found = false;
            Array.from(productSelect.options).forEach((opt) => {
              if (opt.value === (product.product_code ?? product.code))
                found = true;
            });
            if (!found) {
              const opt = document.createElement("option");
              opt.value = product.product_code ?? product.code ?? "";
              opt.textContent = product.product_name ?? "-";
              productSelect.appendChild(opt);
            }
            productSelect.value = product.product_code ?? product.code ?? "";

            // ลบผลลัพธ์การค้นหา
            document.getElementById("search-result")?.remove();
            searchInput.value = "";

            // เริ่มคำนวณและแสดงกราฟทันที
            const periodType = document.getElementById("period-type").value;
            const selectedYear = yearSelect.value;
            renderChart(periodType, productSelect.value, selectedYear);
            showInventoryInfo(productSelect.value, selectedYear);
          });
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
});

document
  .getElementById("report-btn")
  .addEventListener("click", async function (e) {
    e.preventDefault();

    // ดึงค่าตัวกรองปัจจุบัน
    const productCode = document.getElementById("product-select").value;
    const periodType = document.getElementById("period-type").value;
    const selectedYear = document.getElementById("year-select").value;

    // คำนวณข้อมูลสรุป
    const { products, buyin, sale } = await fetchAll();
    const map = computeInventory(products, buyin, sale);

    // กรองข้อมูลตามปีที่เลือก (ถ้ามี)
    let filteredBuyin = buyin,
      filteredSale = sale;
    if (selectedYear) {
      filteredBuyin = buyin.filter((b) => {
        const dt = new Date(b.buyindate ?? b.date);
        return dt.getFullYear() === Number(selectedYear);
      });
      filteredSale = sale.filter((s) => {
        const dt = new Date(s.saleoutdate ?? s.date);
        return dt.getFullYear() === Number(selectedYear);
      });
    }

    // สร้างข้อมูลสรุป
    const saleMap = {};
    (filteredSale || []).forEach((s) => {
      const code = s.product_code ?? s.code ?? "";
      if (!code) return;
      const qty = toNumber(
        s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0
      );
      const total = toNumber(
        s.total ?? toNumber(s.sale_price ?? s.price) * qty
      );
      if (!saleMap[code]) saleMap[code] = { qty: 0, total: 0 };
      saleMap[code].qty += qty;
      saleMap[code].total += total;
    });

    const allEntries = Object.values(map).map((e) => {
      const cost = estimateUnitCost(e, filteredBuyin);
      const sunk = toNumber(e.qty) * toNumber(cost);
      const saleInfo = saleMap[e.product_code] || { qty: 0, total: 0 };
      const costOfSold = toNumber(saleInfo.qty) * toNumber(cost);
      const profit = toNumber(saleInfo.total) - costOfSold;
      const buyTotalCost = filteredBuyin
        .filter((b) => (b.product_code ?? b.code ?? "") === e.product_code)
        .reduce(
          (sum, b) =>
            sum +
            toNumber(
              b.total ??
                toNumber(b.price ?? b.buy_price) *
                  toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)
            ),
          0
        );
      const saleTotal = saleInfo.total ?? 0;
      return {
        code: e.product_code,
        name: e.product_name || (e.productObj.product_name ?? "-"),
        qty: toNumber(e.qty),
        cost: toNumber(cost),
        sunk: toNumber(sunk),
        profit: toNumber(profit),
        buyTotalCost: toNumber(buyTotalCost),
        saleTotal: toNumber(saleTotal),
      };
    });

    const filtered = productCode
      ? allEntries.filter((x) => x.code === productCode)
      : allEntries;

    // สรุปยอดรวม
    const totalSale = filtered.reduce((s, e) => s + toNumber(e.saleTotal), 0);
    const totalProfit = filtered.reduce((s, e) => s + toNumber(e.profit), 0);
    const totalSunk = filtered.reduce((s, e) => s + toNumber(e.sunk), 0);

    // สร้าง HTML สำหรับ Report
    const reportHtml = `
<html>
<head>
  <title>รายงานสรุปยอดขาย</title>
  <style>
    body { font-family: "Sarabun", sans-serif; margin: 40px; }
    h2 { color: #e67e22; }
    .summary { font-size: 1.2rem; margin-bottom: 24px; }
    .summary div { margin-bottom: 12px; }
    .filter { margin-bottom: 18px; color: #555; }

    /* ปรับให้ซ่อนเมื่อพิมพ์ (print preview / print) */
    @media print {
      .filter,
      .action-buttons { display: none !important; }
      /* ป้องกัน box หักคอลัมน์ตอนพิมพ์ */
      .summary-totals, .monthly-summary, table { page-break-inside: avoid; }
      body { margin: 8mm; } /* กระดาษขอบเล็กเมื่อพิมพ์ */
      /* รักษาสีเมื่อพิมพ์ (browser support varies) */
      * { -webkit-print-color-adjust: exact; color-adjust: exact; }
    }

    @media screen {
      /* ปรับปุ่มให้ดูดีกว่าในหน้าจอ */
      .action-buttons button { cursor: pointer; }
    }

    @media print { body { margin: 0; } }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
  <h2>รายงานสรุปยอดขาย</h2>
  <div class="filter" style="
  background: #ffffff;
  padding: 20px 25px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  border: 1px solid #e5e7eb;
  margin: 24px 0;
">
  <h3 style="
    color: #374151;
    font-size: 1.1rem;
    margin: 0 0 16px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #ffd336;
  ">ตัวกรองรายงาน</h3>

  <div style="
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  ">
    <div style="
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    ">
      <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">สินค้า</div>
      <div style="color: #111827; font-weight: 500;">
        ${productCode ? filtered[0]?.name || productCode : "ทั้งหมด"}
      </div>
    </div>

    <div style="
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    ">
      <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">ปี</div>
      <div style="color: #111827; font-weight: 500;">
        ${selectedYear || "-"}
      </div>
    </div>

    <div style="
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    ">
      <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">ช่วงเวลา</div>
      <div style="color: #111827; font-weight: 500;">
        ${
          periodType === "month"
            ? "รายเดือน"
            : periodType === "quarter"
            ? "รายไตรมาส"
            : "รายปี"
        }
      </div>
    </div>
  </div>
</div>
  ${
    periodType === "month"
      ? (() => {
          const monthNames = [
            "ม.ค.",
            "ก.พ.",
            "มี.ค.",
            "เม.ย.",
            "พ.ค.",
            "มิ.ย.",
            "ก.ค.",
            "ส.ค.",
            "ก.ย.",
            "ต.ค.",
            "พ.ย.",
            "ธ.ค.",
          ];
          const monthlySales = Array(12).fill(0);
          const monthlyBuyin = Array(12).fill(0);

          filtered.forEach((e) => {
            if (Array.isArray(e.salesByMonth)) {
              e.salesByMonth.forEach((val, idx) => {
                monthlySales[idx] += val;
              });
            }
            if (Array.isArray(e.buyinByMonth)) {
              e.buyinByMonth.forEach((val, idx) => {
                monthlyBuyin[idx] += val;
              });
            }
          });

          if (
            !filtered.some((e) => Array.isArray(e.salesByMonth)) ||
            !filtered.some((e) => Array.isArray(e.buyinByMonth))
          ) {
            const year = Number(selectedYear);
            filteredSale = filteredSale || [];
            filteredBuyin = filteredBuyin || [];
            filtered.forEach((e) => {
              monthlySales.forEach((_, idx) => {
                const sales = filteredSale.filter((s) => {
                  const dt = new Date(s.saleoutdate ?? s.date);
                  return (
                    (s.product_code ?? s.code ?? "") === e.code &&
                    dt.getFullYear() === year &&
                    dt.getMonth() === idx
                  );
                });
                monthlySales[idx] += sales.reduce((sum, s) => {
                  const qty = toNumber(
                    s.salequantity ??
                      s.sale_quantity ??
                      s.quantity ??
                      s.qty ??
                      0
                  );
                  return (
                    sum +
                    toNumber(s.total ?? toNumber(s.sale_price ?? s.price) * qty)
                  );
                }, 0);
              });
              monthlyBuyin.forEach((_, idx) => {
                const buys = filteredBuyin.filter((b) => {
                  const dt = new Date(b.buyindate ?? b.date);
                  return (
                    (b.product_code ?? b.code ?? "") === e.code &&
                    dt.getFullYear() === year &&
                    dt.getMonth() === idx
                  );
                });
                monthlyBuyin[idx] += buys.reduce((sum, b) => {
                  const qty = toNumber(
                    b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0
                  );
                  return (
                    sum +
                    toNumber(b.total ?? toNumber(b.price ?? b.buy_price) * qty)
                  );
                }, 0);
              });
            });
          }

          // สรุปยอดรวม
          const totalBuyin = monthlyBuyin.reduce((a, b) => a + b, 0);
          const totalSales = monthlySales.reduce((a, b) => a + b, 0);

          return `
            <div class="monthly-summary" style="margin-bottom:24px;">
              <b style="font-size:1.1rem;color:#2d7be0;">ยอดซื้อแต่ละเดือน</b>
              <table style="margin-top:8px;border-collapse:collapse;width:100%;background:#f8fafc;">
                <thead>
                  <tr>
                    ${monthNames
                      .map(
                        (m) =>
                          `<th style="padding:6px 8px;border:1px solid #ffd336;background:#ffe9a7;">${m}</th>`
                      )
                      .join("")}
                    <th style="padding:6px 8px;border:1px solid #ffd336;background:#ffd336;">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    ${monthlyBuyin
                      .map(
                        (v) =>
                          `<td style="padding:6px 8px;border:1px solid #ffd336;text-align:right;color:#2d7be0;">${v.toLocaleString(
                            "th-TH"
                          )}</td>`
                      )
                      .join("")}
                    <td style="padding:6px 8px;border:1px solid #ffd336;text-align:right;font-weight:bold;color:#2d7be0;background:#eaf6ff;">${totalBuyin.toLocaleString(
                      "th-TH"
                    )}</td>
                  </tr>
                </tbody>
              </table>
              <b style="font-size:1.1rem;color:#e67e22;display:block;margin-top:18px;">ยอดขายแต่ละเดือน</b>
              <table style="margin-top:8px;border-collapse:collapse;width:100%;background:#f8fafc;">
                <thead>
                  <tr>
                    ${monthNames
                      .map(
                        (m) =>
                          `<th style="padding:6px 8px;border:1px solid #ffd336;background:#ffe9a7;">${m}</th>`
                      )
                      .join("")}
                    <th style="padding:6px 8px;border:1px solid #ffd336;background:#ffd336;">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    ${monthlySales
                      .map(
                        (v) =>
                          `<td style="padding:6px 8px;border:1px solid #ffd336;text-align:right;color:#e67e22;">${v.toLocaleString(
                            "th-TH"
                          )}</td>`
                      )
                      .join("")}
                    <td style="padding:6px 8px;border:1px solid #ffd336;text-align:right;font-weight:bold;color:#e67e22;background:#fff6e9;">${totalSales.toLocaleString(
                      "th-TH"
                    )}</td>
                  </tr>
                </tbody>
              </table>
              </table>
 </table>
  <div class="summary-totals" style="margin-top:24px;padding:16px;background:#f8fafc;border:1px solid #ffd336;box-shadow:0 2px 4px rgba(0,0,0,0.08);border-radius:8px;">
    <div style="color:#e67e22;font-size:1.1rem;margin-bottom:12px;">
      <b>ยอดขายรวม:</b> ${totalSales.toLocaleString("th-TH")} บาท
    </div>
    <div style="color:green;font-size:1.1rem;margin-bottom:12px;">
      <b>กำไรรวม:</b> ${totalProfit.toLocaleString("th-TH")} บาท
    </div>
    <div style="color:#dc3545;font-size:1.1rem;">
      <b>เงินจมรวม:</b> ${totalSunk.toLocaleString("th-TH")} บาท
    </div>
  </div>
    `;
        })()
      : ""
  }
  <div class="action-buttons" style="
  display: flex;
  gap: 16px;
  margin-top: 32px;
  justify-content: center;
">
  <button onclick="window.print()" style="
    padding: 12px 32px;
    font-size: 1rem;
    border-radius: 8px;
    background: #ffd336;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    color: #333;
    font-weight: 500;
    min-width: 160px;
    &:hover {
      background: #ffc107;
      transform: translateY(-1px);
    }
  ">Print</button>

  <button id="download-pdf" style="
    padding: 12px 32px;
    font-size: 1rem;
    border-radius: 8px;
    background: #ffd336;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    color: #333;
    font-weight: 500;
    min-width: 160px;
    &:hover {
      background: #ffc107;
      transform: translateY(-1px);
    }
  ">Download PDF</button>
</div>
  <script>
    // ดูแลการดาวน์โหลด PDF (เดิม)
    document.getElementById("download-pdf").onclick = function() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
      doc.setFont("THSarabunNew");
      doc.setFontSize(18);
      doc.text("รายงานสรุปยอดขาย", 20, 20);
      doc.setFontSize(14);
      let y = 35;
      const filterText = Array.from(document.querySelectorAll(".filter div"))
        .map(div => div.textContent)
        .join("\\n");
      const summaryText = Array.from(document.querySelectorAll(".summary div"))
        .map(div => div.textContent)
        .join("\\n");
      doc.text(filterText, 20, y);
      y += 20;
      doc.text(summaryText, 20, y);
      doc.save("report.pdf");
    };

    // ซ่อน/คืนค่าก่อน-หลังการพิมพ์ (รองรับ beforeprint/afterprint)
    (function() {
      const HIDE_SEL = ".filter, .action-buttons";
      const els = () => Array.from(document.querySelectorAll(HIDE_SEL));

      function hideForPrint() {
        els().forEach(el => {
          // เก็บค่าเดิมไว้ใช้คืน
          el.__displayCache = el.style.display || "";
          el.style.display = "none";
        });
      }
      function restoreAfterPrint() {
        els().forEach(el => {
          if (el.__displayCache !== undefined) el.style.display = el.__displayCache;
          else el.style.display = "";
          delete el.__displayCache;
        });
      }

      // ใช้ event ของ browser (Chrome, Firefox บางเวอร์ชัน)
      if ('onbeforeprint' in window) {
        window.addEventListener('beforeprint', hideForPrint);
        window.addEventListener('afterprint', restoreAfterPrint);
      } else {
        // fallback: ดักปุ่ม Print ในหน้ารายงาน
        const printBtn = document.querySelector('button[onclick="window.print()"]');
        if (printBtn) {
          printBtn.addEventListener('click', function(evt) {
            // hide, call print, restore after a delay
            hideForPrint();
            // ให้ browser เปิด dialog แล้วคืนค่าเมื่อกลับมาจาก dialog
            setTimeout(() => {
              try { window.print(); } catch(e) { console.error(e); }
              // restore เล็กน้อยหลัง print (จำนวน ms ปรับได้)
              setTimeout(restoreAfterPrint, 300);
            }, 50);
            // ป้องกัน default inline onclick เพื่อให้ใช้ flow นี้
            evt.preventDefault();
          });
        }
      }

      // ปลอดภัย: ถ้าผู้ใช้ใช้ Ctrl+P, beforeprint จะทำงานบนบาง browser
    })();
  </script>
</body>
</html>
`;
    const reportWin = window.open("", "_blank", "width=900,height=1200");
    reportWin.document.write(reportHtml);
    reportWin.document.close();
  });
