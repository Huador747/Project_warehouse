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
  const totalProfit = (entries || []).reduce((s, e) => s + toNumber(e.profit), 0);
  // คำนวณยอดขายรวม
  const totalSale = (entries || []).reduce((s, e) => s + toNumber(e.saleTotal), 0);

  // แสดงผลรวม
  inventoryInfo.innerHTML = `
    <div style="color:orange;">ยอดขายรวม: ${totalSale.toLocaleString("th-TH")} บาท</div>
    <div style="color:green;">กำไรรวม: ${totalProfit.toLocaleString("th-TH")} บาท</div>
    <div style="color:red;">เงินจมรวม: ${totalSunk.toLocaleString("th-TH")} บาท</div>
  `;
}

// เพิ่มการคำนวณกำไรใน showInventoryInfo
async function showInventoryInfo(productCode = "", selectedYear = null) {
  const { products, buyin, sale } = await fetchAll();
  const map = computeInventory(products, buyin, sale);

  // กรองข้อมูลตามปีที่เลือก (ถ้ามี)
  let filteredBuyin = buyin, filteredSale = sale;
  if (selectedYear) {
    filteredBuyin = buyin.filter(b => {
      const dt = new Date(b.buyindate ?? b.date);
      return dt.getFullYear() === Number(selectedYear);
    });
    filteredSale = sale.filter(s => {
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
      .filter(b => (b.product_code ?? b.code ?? "") === e.product_code)
      .reduce((sum, b) =>
        sum + toNumber(b.total ?? toNumber(b.price ?? b.buy_price) * toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0)), 0);

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
  const safeDate = (d) => { try { return new Date(d); } catch { return new Date(NaN); } };
  (buyin || []).forEach(b => { const dt = safeDate(b.buyindate ?? b.date); if (!isNaN(dt)) years.add(dt.getFullYear()); });
  (sale || []).forEach(s => { const dt = safeDate(s.saleoutdate ?? s.date); if (!isNaN(dt)) years.add(dt.getFullYear()); });
  const sorted = Array.from(years).sort((a, b) => b - a);
  yearSelect.innerHTML = '';
  sorted.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
  if (sorted.length) yearSelect.value = sorted[0];
}

async function fetchStats(type = "month", productCode = "", selectedYear = null) {
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

async function renderChart(type = "month", productCode = "", selectedYear = null) {
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
document.getElementById("period-type").addEventListener("change", async function () {
  // ให้รายเดือนก็แสดงดรอปดาวน์ปีด้วย
  if (["month", "quarter", "year"].includes(this.value)) {
    await populateYearSelect();
    yearSelect.style.display = '';
    yearLabel.style.display = '';
  } else {
    yearSelect.style.display = 'none';
    yearLabel.style.display = 'none';
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

yearSelect.addEventListener('change', function() {
  const periodType = document.getElementById('period-type').value;
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

document.addEventListener('DOMContentLoaded', () => {
    const navbarText = document.querySelector('.navbar-text');
    if (navbarText) {
        requestAnimationFrame(() => {
            navbarText.classList.add('slide-in');
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

    // ...existing code for rendering products table...

    // อัพเดท pagination (สร้างใหม่ทุกครั้ง)
    const totalPages = Math.ceil(products.length / perPage);
    const paginationControls = `
        <button id="prev-page" ${page === 1 ? "disabled" : ""}>ย้อนกลับ</button>
        <span id="page-info">หน้า ${page} / ${totalPages}</span>
        <button id="next-page" ${page === totalPages ? "disabled" : ""}>ถัดไป</button>
    `;
    document.querySelector(".pagination-controls").innerHTML = paginationControls;

    // เพิ่ม event listeners ใหม่ทุกครั้ง
    document.getElementById("prev-page")?.addEventListener("click", () => {
      if (page > 1) {
        renderProductsTablePage(products, page - 1);
      }
    });

    document.getElementById("next-page")?.addEventListener("click", () => {
      if (page < totalPages) {
        renderProductsTablePage(products, page + 1);
      }
    });
}
