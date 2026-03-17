import { BACKEND_URL } from "./config.js";

const ctx = document.getElementById("movementChart").getContext("2d");
let chart;

const productSelect = document.getElementById("product-select");
const inventoryInfo = document.getElementById("inventory-info");
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

// ฟังก์ชันกรองสินค้าทั้งหมด (ไม่กรองควบคุม/ไม่ควบคุม)
function filterProductsByControls(products) {
  return products || [];
}

// ✅ กรอง buyin/sale ตาม product_code ที่ผ่านการกรอง
function filterTransactionsByProducts(transactions, productCodes) {
  return (transactions || []).filter((t) => {
    const code = t.product_code ?? t.code ?? "";
    return productCodes.has(code);
  });
}

// คำนวณสต็อกจาก products + ประวัติซื้อ/ขาย
function computeInventory(products, buyin, sale) {
  // ✅ กรองสินค้าตาม checkbox
  const filteredProducts = filterProductsByControls(products);
  const productCodes = new Set(
    filteredProducts.map((p) => p.product_code ?? p.code ?? ""),
  );

  // ✅ กรอง buyin/sale ตามสินค้าที่ผ่านการกรอง
  const filteredBuyin = filterTransactionsByProducts(buyin, productCodes);
  const filteredSale = filterTransactionsByProducts(sale, productCodes);

  const map = {};

  // init จาก filtered products
  filteredProducts.forEach((p) => {
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

  // accumulate buyin
  filteredBuyin.forEach((b) => {
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
      b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
    );
    const price = toNumber(b.price ?? b.buy_price ?? b.unit_price ?? 0);
    const total = toNumber(b.total ?? 0) || q * price;
    map[code].qty += q;
    map[code].buyTotalQty += q;
    map[code].buyTotalCost += total;
  });

  // subtract sale
  filteredSale.forEach((s) => {
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
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
    );
    map[code].qty -= q;
  });

  console.log(
    `📊 คำนวณสต็อกเสร็จ: ${Object.keys(map).length} สินค้า (ไม่กรองควบคุม)`,
  );

  return map;
}

// ประเมินต้นทุนต่อหน่วย
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
  if (mapEntry.buyTotalQty && mapEntry.buyTotalQty > 0) {
    return mapEntry.buyTotalCost / mapEntry.buyTotalQty;
  }
  if (buyinList && buyinList.length) {
    const buys = buyinList.filter(
      (b) => (b.product_code ?? b.code ?? "") === mapEntry.product_code,
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

function renderInventorySummary(entries, selectedYear, periodType = "year") {
  // คำนวณ KPI
  let totalBuyin = 0,
    totalSale = 0,
    totalProfit = 0,
    totalSunk = 0,
    totalQty = 0,
    totalBuyinQty = 0,
    totalSaleQty = 0;

  if (periodType === "month" || periodType === "quarter") {
    // กรอง buyin/sale ตามช่วงเวลา
    const now = new Date();
    const year = Number(selectedYear) || now.getFullYear();

    // สร้าง array สำหรับแต่ละเดือน/ไตรมาส
    let buyinQtyArr = Array(periodType === "month" ? 12 : 4).fill(0);
    let saleQtyArr = Array(periodType === "month" ? 12 : 4).fill(0);

    entries.forEach((e) => {
      if (Array.isArray(e.buyinByMonth)) {
        e.buyinByMonth.forEach((qty, idx) => (buyinQtyArr[idx] += qty));
      }
      if (Array.isArray(e.salesByMonth)) {
        e.salesByMonth.forEach((qty, idx) => (saleQtyArr[idx] += qty));
      }
    });

    totalBuyinQty = buyinQtyArr.reduce((a, b) => a + b, 0);
    totalSaleQty = saleQtyArr.reduce((a, b) => a + b, 0);

    // รวมยอดเงิน
    totalBuyin = entries.reduce((s, e) => s + toNumber(e.buyTotalCost), 0);
    totalSale = entries.reduce((s, e) => s + toNumber(e.saleTotal), 0);
    totalProfit = entries.reduce((s, e) => s + toNumber(e.profit), 0);
    totalSunk = entries.reduce((s, e) => s + toNumber(e.sunk), 0);
    totalQty = entries.reduce((s, e) => s + toNumber(e.qty), 0);
  } else {
    // รายปีหรือทั้งหมด
    totalBuyin = entries.reduce((s, e) => s + toNumber(e.buyTotalCost), 0);
    totalSale = entries.reduce((s, e) => s + toNumber(e.saleTotal), 0);
    totalProfit = entries.reduce((s, e) => s + toNumber(e.profit), 0);
    totalSunk = entries.reduce((s, e) => s + toNumber(e.sunk), 0);
    totalQty = entries.reduce((s, e) => s + toNumber(e.qty), 0);
    totalBuyinQty = entries.reduce((s, e) => s + toNumber(e.buyTotalQty), 0);
    totalSaleQty = entries.reduce((s, e) => s + toNumber(e.saleQty), 0);
  }

  // สร้าง KPI cards
  inventoryInfo.innerHTML = `
    <div class="kpi-cards" style="display: flex; gap: 18px; margin-bottom: 24px; flex-wrap: wrap;">
      <div class="kpi-card" style="flex:1; min-width:180px; background:#eaf6ff; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(54,162,235,0.08); border:1px solid #b3e0ff;">
        <div style="color:#2563eb; font-size:1.05rem; font-weight:700;">ยอดซื้อรวม (${selectedYear === "all" || !selectedYear ? "ทุกปี" : selectedYear})</div>
        <div style="font-size:1.35rem; font-weight:800; color:#2563eb;">${totalBuyin.toLocaleString("th-TH")} บาท</div>
        <div style="color:#2563eb; font-size:1rem; margin-top:8px;">ซื้อทั้งหมด <b>${totalBuyinQty.toLocaleString("th-TH")}</b> ชิ้น</div>
      </div>
      <div class="kpi-card" style="flex:1; min-width:180px; background:#fff6e9; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(230,126,34,0.08); border:1px solid #ffd336;">
        <div style="color:#e67e22; font-size:1.05rem; font-weight:700;">ยอดขายรวม</div>
        <div style="font-size:1.35rem; font-weight:800; color:#e67e22;">${totalSale.toLocaleString("th-TH")} บาท</div>
        <div style="color:#e67e22; font-size:1rem; margin-top:8px;">ขายทั้งหมด <b>${totalSaleQty.toLocaleString("th-TH")}</b> ชิ้น</div>
      </div>
      <div class="kpi-card" style="flex:1; min-width:180px; background:#eaffea; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(46,204,113,0.08); border:1px solid #b3ffc7;">
        <div style="color:#27ae60; font-size:1.05rem; font-weight:700;">กำไรรวม</div>
        <div style="font-size:1.35rem; font-weight:800; color:#27ae60;">${totalProfit.toLocaleString("th-TH")} บาท</div>
      </div>
      <div class="kpi-card" style="flex:1; min-width:180px; background:#ffeaea; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(220,53,69,0.08); border:1px solid #ffb3b3;">
        <div style="color:#dc3545; font-size:1.05rem; font-weight:700;">เงินทุนรวม</div>
        <div style="font-size:1.35rem; font-weight:800; color:#dc3545;">${totalSunk.toLocaleString("th-TH")} บาท</div>
      </div>
      <div class="kpi-card" style="flex:1; min-width:180px; background:#f8fafc; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(107,114,128,0.08); border:1px solid #e5e7eb;">
        <div style="color:#374151; font-size:1.05rem; font-weight:700;">สินค้าคงเหลือทั้งหมด (qty)</div>
        <div style="font-size:1.35rem; font-weight:800; color:#374151;">${totalQty.toLocaleString("th-TH")}</div>
      </div>
    </div>
  `;
}

// เพิ่ม selectedYear argument
async function showInventoryInfo(
  productCode = "",
  selectedYear = null,
  periodType = "year",
) {
  const { products, buyin, sale } = await fetchAll();
  const map = computeInventory(products, buyin, sale);

  const filteredProducts = filterProductsByControls(products);
  const productCodes = new Set(
    filteredProducts.map((p) => p.product_code ?? p.code ?? ""),
  );

  let filteredBuyin = filterTransactionsByProducts(buyin, productCodes);
  let filteredSale = filterTransactionsByProducts(sale, productCodes);

  if (periodType === "month" || periodType === "quarter") {
    // กรองตามปี (ถ้าไม่ใช่ "all")
    if (selectedYear && selectedYear !== "all") {
      filteredBuyin = filteredBuyin.filter((b) => {
        const dt = new Date(b.buyindate ?? b.date);
        return dt.getFullYear() === Number(selectedYear);
      });
      filteredSale = filteredSale.filter((s) => {
        const dt = new Date(s.saleoutdate ?? s.date);
        return dt.getFullYear() === Number(selectedYear);
      });
    }
  } else if (selectedYear && selectedYear !== "all") {
    filteredBuyin = filteredBuyin.filter((b) => {
      const dt = new Date(b.buyindate ?? b.date);
      return dt.getFullYear() === Number(selectedYear);
    });
    filteredSale = filteredSale.filter((s) => {
      const dt = new Date(s.saleoutdate ?? s.date);
      return dt.getFullYear() === Number(selectedYear);
    });
  }

  const saleMap = {};
  (filteredSale || []).forEach((s) => {
    const code = s.product_code ?? s.code ?? "";
    if (!code) return;
    const qty = toNumber(
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
    );
    const total = toNumber(s.total ?? toNumber(s.sale_price ?? s.price) * qty);
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
                toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0),
          ),
        0,
      );
    const buyTotalQty = filteredBuyin
      .filter((b) => (b.product_code ?? b.code ?? "") === e.product_code)
      .reduce(
        (sum, b) =>
          sum +
          toNumber(b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0),
        0,
      );
    const saleQty = saleInfo.qty ?? 0;
    const saleTotal = saleInfo.total ?? 0;

    // สำหรับรายเดือน/ไตรมาส
    let buyinByMonth = null,
      salesByMonth = null;
    if (periodType === "month") {
      buyinByMonth = Array(12).fill(0);
      salesByMonth = Array(12).fill(0);
      filteredBuyin.forEach((b) => {
        const dt = new Date(b.buyindate ?? b.date);
        if ((b.product_code ?? b.code ?? "") === e.product_code && !isNaN(dt)) {
          const idx = dt.getMonth();
          buyinByMonth[idx] += toNumber(
            b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
          );
        }
      });
      filteredSale.forEach((s) => {
        const dt = new Date(s.saleoutdate ?? s.date);
        if ((s.product_code ?? s.code ?? "") === e.product_code && !isNaN(dt)) {
          const idx = dt.getMonth();
          salesByMonth[idx] += toNumber(
            s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
          );
        }
      });
    } else if (periodType === "quarter") {
      buyinByMonth = Array(4).fill(0);
      salesByMonth = Array(4).fill(0);
      filteredBuyin.forEach((b) => {
        const dt = new Date(b.buyindate ?? b.date);
        if ((b.product_code ?? b.code ?? "") === e.product_code && !isNaN(dt)) {
          const idx = Math.floor(dt.getMonth() / 3);
          buyinByMonth[idx] += toNumber(
            b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
          );
        }
      });
      filteredSale.forEach((s) => {
        const dt = new Date(s.saleoutdate ?? s.date);
        if ((s.product_code ?? s.code ?? "") === e.product_code && !isNaN(dt)) {
          const idx = Math.floor(dt.getMonth() / 3);
          salesByMonth[idx] += toNumber(
            s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
          );
        }
      });
    }

    return {
      code: e.product_code,
      name: e.product_name || (e.productObj.product_name ?? "-"),
      qty: toNumber(e.qty),
      cost: toNumber(cost),
      sunk: toNumber(sunk),
      profit: toNumber(profit),
      buyTotalCost: toNumber(buyTotalCost),
      buyTotalQty: toNumber(buyTotalQty),
      saleQty: toNumber(saleQty),
      saleTotal: toNumber(saleTotal),
      buyinByMonth,
      salesByMonth,
    };
  });

  const filtered = productCode
    ? allEntries.filter((x) => x.code === productCode)
    : allEntries;
  renderInventorySummary(filtered, selectedYear, periodType);
}

// สร้าง dropdown สินค้า (เติมเมื่อมีข้อมูล)
async function populateProductSelect() {
  const { products } = await fetchAll();
  const filteredProducts = filterProductsByControls(products);

  productSelect.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "ทั้งหมด";
  productSelect.appendChild(optAll);

  filteredProducts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.product_code ?? p.code ?? (p._id ? String(p._id) : "");
    opt.textContent = `${opt.value} - ${p.product_name ?? p.name ?? "-"}`;
    productSelect.appendChild(opt);
  });

  console.log(`📦 โหลด dropdown: ${filteredProducts.length} สินค้า`);
}

// เพิ่มเติม: สร้าง dropdown ปี
async function populateYearSelect() {
  const { products, buyin, sale } = await fetchAll();

  const filteredProducts = filterProductsByControls(products);
  const productCodes = new Set(
    filteredProducts.map((p) => p.product_code ?? p.code ?? ""),
  );

  const filteredBuyin = filterTransactionsByProducts(buyin, productCodes);
  const filteredSale = filterTransactionsByProducts(sale, productCodes);

  const years = new Set();
  const safeDate = (d) => {
    try {
      return new Date(d);
    } catch {
      return new Date(NaN);
    }
  };

  filteredBuyin.forEach((b) => {
    const dt = safeDate(b.buyindate ?? b.date);
    if (!isNaN(dt)) years.add(dt.getFullYear());
  });

  filteredSale.forEach((s) => {
    const dt = safeDate(s.saleoutdate ?? s.date);
    if (!isNaN(dt)) years.add(dt.getFullYear());
  });

  const sorted = Array.from(years).sort((a, b) => b - a);

  yearSelect.innerHTML = "";

  // ✅ เพิ่ม "ทุกปี"
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "ทุกปี";
  yearSelect.appendChild(optAll);

  sorted.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  // ค่าเริ่มต้น: ทุกปี (หรือจะเลือกปีล่าสุดก็ได้)
  yearSelect.value = "all";
}

async function fetchStats(
  type = "month",
  productCode = "",
  selectedYear = null,
) {
  const { products, buyin, sale } = await fetchAll();

  const filteredProducts = filterProductsByControls(products);
  const productCodes = new Set(
    filteredProducts.map((p) => p.product_code ?? p.code ?? ""),
  );

  const filteredBuyin = filterTransactionsByProducts(buyin, productCodes);
  const filteredSale = filterTransactionsByProducts(sale, productCodes);

  if (productSelect.options.length <= 1) await populateProductSelect();

  const safeDate = (d) => {
    try {
      return new Date(d);
    } catch {
      return new Date(NaN);
    }
  };

  // ✅ โหมดคำนวณ: line = จำนวน, bar = ยอดเงิน (ของเดิมคุณ)
  const useQty = currentChartType === "line";

  const getBuyValue = (b) => {
    const qty = toNumber(
      b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
    );
    if (useQty) return qty;
    const price = toNumber(b.price ?? b.buy_price ?? b.unit_price ?? 0);
    return toNumber(b.total ?? qty * price);
  };

  const getSaleValue = (s) => {
    const qty = toNumber(
      s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
    );
    if (useQty) return qty;
    const price = toNumber(s.sale_price ?? s.price ?? 0);
    return toNumber(s.total ?? qty * price);
  };

  // ✅ ปีทั้งหมดในฐานข้อมูล
  const yearsSet = new Set();
  filteredBuyin.forEach((b) => {
    const dt = safeDate(b.buyindate ?? b.date);
    if (!isNaN(dt)) yearsSet.add(dt.getFullYear());
  });
  filteredSale.forEach((s) => {
    const dt = safeDate(s.saleoutdate ?? s.date);
    if (!isNaN(dt)) yearsSet.add(dt.getFullYear());
  });
  const allYearsAsc = Array.from(yearsSet).sort((a, b) => a - b);

  const isAllYears =
    selectedYear === "all" || selectedYear == null || selectedYear === "";

  let labels = [];
  let buyinSummary = [];
  let saleSummary = [];

  // ====== type === "year" ======
  // ถ้าเลือก "ทุกปี" และเป็นรายปี -> labels เป็น list ปีทั้งหมด
  if (type === "year") {
    if (isAllYears) {
      labels = allYearsAsc.map((y) => String(y));

      buyinSummary = allYearsAsc.map((y) =>
        filteredBuyin
          .filter((b) => {
            const dt = safeDate(b.buyindate ?? b.date);
            return (
              !isNaN(dt) &&
              dt.getFullYear() === y &&
              (!productCode || (b.product_code ?? b.code) === productCode)
            );
          })
          .reduce((sum, b) => sum + getBuyValue(b), 0),
      );

      saleSummary = allYearsAsc.map((y) =>
        filteredSale
          .filter((s) => {
            const dt = safeDate(s.saleoutdate ?? s.date);
            return (
              !isNaN(dt) &&
              dt.getFullYear() === y &&
              (!productCode || (s.product_code ?? s.code) === productCode)
            );
          })
          .reduce((sum, s) => sum + getSaleValue(s), 0),
      );
    } else {
      const year = Number(selectedYear);
      labels = [String(year)];

      buyinSummary = [
        filteredBuyin
          .filter((b) => {
            const dt = safeDate(b.buyindate ?? b.date);
            return (
              !isNaN(dt) &&
              dt.getFullYear() === year &&
              (!productCode || (b.product_code ?? b.code) === productCode)
            );
          })
          .reduce((sum, b) => sum + getBuyValue(b), 0),
      ];

      saleSummary = [
        filteredSale
          .filter((s) => {
            const dt = safeDate(s.saleoutdate ?? s.date);
            return (
              !isNaN(dt) &&
              dt.getFullYear() === year &&
              (!productCode || (s.product_code ?? s.code) === productCode)
            );
          })
          .reduce((sum, s) => sum + getSaleValue(s), 0),
      ];
    }

    return { labels, buyinSummary, saleSummary };
  }

  // ====== type === "quarter" ======
  // ถ้าเลือก "ทุกปี" -> รวม Q1..Q4 ของทุกปี
  if (type === "quarter") {
    labels = [
      "ไตรมาสที่ 1\nม.ค. - มี.ค.",
      "ไตรมาสที่ 2\nเม.ย. - มิ.ย.",
      "ไตรมาสที่ 3\nก.ค. - ก.ย.",
      "ไตรมาสที่ 4\nต.ค. - ธ.ค.",
    ];

    buyinSummary = [0, 0, 0, 0];
    saleSummary = [0, 0, 0, 0];

    filteredBuyin.forEach((b) => {
      const dt = safeDate(b.buyindate ?? b.date);
      if (isNaN(dt)) return;
      if (!isAllYears && dt.getFullYear() !== Number(selectedYear)) return;
      if (productCode && (b.product_code ?? b.code) !== productCode) return;

      const qIdx = Math.floor(dt.getMonth() / 3); // 0..3
      buyinSummary[qIdx] += getBuyValue(b);
    });

    filteredSale.forEach((s) => {
      const dt = safeDate(s.saleoutdate ?? s.date);
      if (isNaN(dt)) return;
      if (!isAllYears && dt.getFullYear() !== Number(selectedYear)) return;
      if (productCode && (s.product_code ?? s.code) !== productCode) return;

      const qIdx = Math.floor(dt.getMonth() / 3);
      saleSummary[qIdx] += getSaleValue(s);
    });

    return { labels, buyinSummary, saleSummary };
  }

  // ====== type === "month" ======
  // ถ้าเลือก "ทุกปี" -> รวมเดือนเดียวกันทุกปี
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

  buyinSummary = Array(12).fill(0);
  saleSummary = Array(12).fill(0);

  filteredBuyin.forEach((b) => {
    const dt = safeDate(b.buyindate ?? b.date);
    if (isNaN(dt)) return;
    if (!isAllYears && dt.getFullYear() !== Number(selectedYear)) return;
    if (productCode && (b.product_code ?? b.code) !== productCode) return;

    buyinSummary[dt.getMonth()] += getBuyValue(b);
  });

  filteredSale.forEach((s) => {
    const dt = safeDate(s.saleoutdate ?? s.date);
    if (isNaN(dt)) return;
    if (!isAllYears && dt.getFullYear() !== Number(selectedYear)) return;
    if (productCode && (s.product_code ?? s.code) !== productCode) return;

    saleSummary[dt.getMonth()] += getSaleValue(s);
  });

  return { labels, buyinSummary, saleSummary };
}

// เพิ่มปุ่มสลับกราฟ
const chartTypeToggle = document.createElement("button");
chartTypeToggle.id = "chart-type-toggle";
chartTypeToggle.textContent = "สลับกราฟ (แท่ง/เส้น)";
chartTypeToggle.style =
  "margin-bottom: 16px; padding: 8px 18px; border-radius: 8px; background: #ffd336; border: none; cursor: pointer; font-size: 1rem; font-weight: 500; color: #333;";
const chartContainer = ctx.canvas.parentNode;
chartContainer.insertBefore(chartTypeToggle, ctx.canvas);

let currentChartType = "bar";
chartTypeToggle.addEventListener("click", function () {
  currentChartType = currentChartType === "bar" ? "line" : "bar";
  // trigger redraw
  const periodType = document.getElementById("period-type")?.value || "month";
  const productCode = document.getElementById("product-select").value;
  const selectedYear = document.getElementById("year-select").value;
  renderChart(periodType, productCode, selectedYear);
});

async function renderChart(
  type = "month",
  productCode = "",
  selectedYear = null,
) {
  const { labels, buyinSummary, saleSummary } = await fetchStats(
    type,
    productCode,
    selectedYear,
  );

  if (chart) chart.destroy();
  let datasets = [];
  if (currentChartType === "line") {
    // กราฟเส้น: กรองตาม chartFilterType
    if (chartFilterType === "buyin") {
      datasets = [
        {
          label: productCode
            ? `จำนวนซื้อสินค้ารหัส ${productCode}`
            : "จำนวนซื้อ (ชิ้น)",
          data: buyinSummary,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.15)",
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "rgba(54, 162, 235, 1)",
        },
      ];
    } else if (chartFilterType === "sale") {
      datasets = [
        {
          label: productCode
            ? `จำนวนขายสินค้ารหัส ${productCode}`
            : "จำนวนขาย (ชิ้น)",
          data: saleSummary,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.15)",
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "rgba(255, 99, 132, 1)",
        },
      ];
    } else {
      datasets = [
        {
          label: productCode
            ? `จำนวนซื้อสินค้ารหัส ${productCode}`
            : "จำนวนซื้อ (ชิ้น)",
          data: buyinSummary,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.15)",
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "rgba(54, 162, 235, 1)",
        },
        {
          label: productCode
            ? `จำนวนขายสินค้ารหัส ${productCode}`
            : "จำนวนขาย (ชิ้น)",
          data: saleSummary,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.15)",
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "rgba(255, 99, 132, 1)",
        },
      ];
    }
  } else {
    // กราฟแท่ง: ใช้ datasets ตาม filter
    if (chartFilterType === "buyin") {
      datasets = [
        {
          label: productCode
            ? `ยอดซื้อสินค้ารหัส ${productCode} (จำนวน)`
            : "ยอดซื้อ (จำนวน)",
          data: buyinSummary,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          fill: true,
          tension: 0.3,
        },
      ];
    } else if (chartFilterType === "sale") {
      datasets = [
        {
          label: productCode
            ? `ยอดขายสินค้ารหัส ${productCode} (จำนวน)`
            : "ยอดขาย (จำนวน)",
          data: saleSummary,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          fill: true,
          tension: 0.3,
        },
      ];
    } else {
      datasets = [
        {
          label: productCode
            ? `ยอดซื้อสินค้ารหัส ${productCode} (จำนวน)`
            : "ยอดซื้อ (จำนวน)",
          data: buyinSummary,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: productCode
            ? `ยอดขายสินค้ารหัส ${productCode} (จำนวน)`
            : "ยอดขาย (จำนวน)",
          data: saleSummary,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          fill: true,
          tension: 0.3,
        },
      ];
    }
  }
  chart = new Chart(ctx, {
    type: currentChartType,
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: currentChartType === "line",
            text: currentChartType === "line" ? "จำนวน (ชิ้น)" : "",
            font: { size: 16 },
          },
        },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            callback: function (val) {
              const label = this.getLabelForValue(val);
              return label.split("\n");
            },
          },
        },
      },
    },
  });
}

// เพิ่มปุ่มกรองซื้อ/ขาย
const filterTypeContainer = document.createElement("div");
filterTypeContainer.style = "margin-bottom: 12px; display: flex; gap: 12px;";
const buyinFilterBtn = document.createElement("button");
buyinFilterBtn.textContent = "แสดงเฉพาะยอดซื้อ";
buyinFilterBtn.style =
  "padding: 8px 18px; border-radius: 8px; background: #eaf6ff; border: none; cursor: pointer; font-size: 1rem; font-weight: 500; color: #2563eb;";
const saleFilterBtn = document.createElement("button");
saleFilterBtn.textContent = "แสดงเฉพาะยอดขาย";
saleFilterBtn.style =
  "padding: 8px 18px; border-radius: 8px; background: #fff6e9; border: none; cursor: pointer; font-size: 1rem; font-weight: 500; color: #e67e22;";
const bothFilterBtn = document.createElement("button");
bothFilterBtn.textContent = "แสดงทั้งซื้อและขาย";
bothFilterBtn.style =
  "padding: 8px 18px; border-radius: 8px; background: #f8fafc; border: none; cursor: pointer; font-size: 1rem; font-weight: 500; color: #374151;";
filterTypeContainer.appendChild(buyinFilterBtn);
filterTypeContainer.appendChild(saleFilterBtn);
filterTypeContainer.appendChild(bothFilterBtn);
chartContainer.insertBefore(filterTypeContainer, chartTypeToggle);

let chartFilterType = "both";
buyinFilterBtn.onclick = () => {
  chartFilterType = "buyin";
  redrawChart();
};
saleFilterBtn.onclick = () => {
  chartFilterType = "sale";
  redrawChart();
};
bothFilterBtn.onclick = () => {
  chartFilterType = "both";
  redrawChart();
};

function redrawChart() {
  const periodType = document.getElementById("period-type")?.value || "month";
  const productCode = document.getElementById("product-select").value;
  const selectedYear = document.getElementById("year-select").value;
  renderChart(periodType, productCode, selectedYear);
}

// กดให้sidebarค้างไว้
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

// เพิ่ม event listener ให้ product-select
document.addEventListener("DOMContentLoaded", function () {
  const productSelect = document.getElementById("product-select");
  const yearSelect = document.getElementById("year-select");
  const periodTypeSelect = document.getElementById("period-type");

  productSelect?.addEventListener("change", function () {
    const productCode = productSelect.value;
    const selectedYear = yearSelect.value;
    const periodType = periodTypeSelect?.value || "month";
    renderChart(periodType, productCode, selectedYear);
    showInventoryInfo(productCode, selectedYear, periodType);
  });

  // เพิ่ม event listener ให้ year-select และ period-type เพื่อให้เปลี่ยนกราฟตามปี/ช่วงเวลา
  yearSelect?.addEventListener("change", function () {
    const productCode = productSelect.value;
    const selectedYear = yearSelect.value;
    const periodType = periodTypeSelect?.value || "month";
    renderChart(periodType, productCode, selectedYear);
    showInventoryInfo(productCode, selectedYear, periodType);
  });

  periodTypeSelect?.addEventListener("change", function () {
    const productCode = productSelect.value;
    const selectedYear = yearSelect.value;
    const periodType = periodTypeSelect?.value || "month";
    renderChart(periodType, productCode, selectedYear);
    showInventoryInfo(productCode, selectedYear, periodType);
  });
});

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
              p,
            )}'>
              <b class="product_code">${p.product_code || ""}</b>
              <span class="product_name">${p.product_name || ""}</span>
              <small class="product_model">
                ${p.model || ""} | 
                <span class="maker">${p.maker || ""}</span> | 
                <span class="category">${p.category || ""}</span>
              </small>
            </div>
          `,
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
        s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
      );
      const total = toNumber(
        s.total ?? toNumber(s.sale_price ?? s.price) * qty,
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
                  toNumber(b.quantity ?? b.buyquantity ?? b.qty ?? 0),
            ),
          0,
        );
      const buyTotalQty = filteredBuyin
        .filter((b) => (b.product_code ?? b.code ?? "") === e.product_code)
        .reduce(
          (sum, b) =>
            sum +
            toNumber(
              b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
            ),
          0,
        );
      const saleQty = saleInfo.qty ?? 0;
      const saleTotal = saleInfo.total ?? 0;

      // เพิ่มเติม: สร้าง buyinByMonth/salesByMonth สำหรับรายไตรมาส
      let buyinByMonth = null,
        salesByMonth = null;
      if (periodType === "month") {
        buyinByMonth = Array(12).fill(0);
        salesByMonth = Array(12).fill(0);
        filteredBuyin.forEach((b) => {
          const dt = new Date(b.buyindate ?? b.date);
          if (
            (b.product_code ?? b.code ?? "") === e.product_code &&
            !isNaN(dt)
          ) {
            const idx = dt.getMonth();
            buyinByMonth[idx] += toNumber(
              b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
            );
          }
        });
        filteredSale.forEach((s) => {
          const dt = new Date(s.saleoutdate ?? s.date);
          if (
            (s.product_code ?? s.code ?? "") === e.product_code &&
            !isNaN(dt)
          ) {
            const idx = dt.getMonth();
            salesByMonth[idx] += toNumber(
              s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
            );
          }
        });
      } else if (periodType === "quarter") {
        buyinByMonth = Array(4).fill(0);
        salesByMonth = Array(4).fill(0);
        filteredBuyin.forEach((b) => {
          const dt = new Date(b.buyindate ?? b.date);
          if (
            (b.product_code ?? b.code ?? "") === e.product_code &&
            !isNaN(dt)
          ) {
            const idx = Math.floor(dt.getMonth() / 3);
            buyinByMonth[idx] += toNumber(
              b.quantity ?? b.buyquantity ?? b.buy_quantity ?? b.qty ?? 0,
            );
          }
        });
        filteredSale.forEach((s) => {
          const dt = new Date(s.saleoutdate ?? s.date);
          if (
            (s.product_code ?? s.code ?? "") === e.product_code &&
            !isNaN(dt)
          ) {
            const idx = Math.floor(dt.getMonth() / 3);
            salesByMonth[idx] += toNumber(
              s.salequantity ?? s.sale_quantity ?? s.quantity ?? s.qty ?? 0,
            );
          }
        });
      }

      return {
        code: e.product_code,
        name: e.product_name || (e.productObj.product_name ?? "-"),
        qty: toNumber(e.qty),
        cost: toNumber(cost),
        sunk: toNumber(sunk),
        profit: toNumber(profit),
        buyTotalCost: toNumber(buyTotalCost),
        buyTotalQty: toNumber(buyTotalQty),
        saleQty: toNumber(saleQty),
        saleTotal: toNumber(saleTotal),
        buyinByMonth,
        salesByMonth,
      };
    });

    const filtered = productCode
      ? allEntries.filter((x) => x.code === productCode)
      : allEntries;

    // สรุปยอดรวม
    const totalSale = filtered.reduce((s, e) => s + toNumber(e.saleTotal), 0);
    const totalProfit = filtered.reduce((s, e) => s + toNumber(e.profit), 0);
    const totalSunk = filtered.reduce((s, e) => s + toNumber(e.sunk), 0);

    // สร้าง HTML สำหรับ Report (ปรับปรุงใหม่)
    const totalBuyin = filtered.reduce(
      (s, e) => s + toNumber(e.buyTotalCost),
      0,
    );
    const totalBuyinQty = filtered.reduce(
      (s, e) => s + toNumber(e.buyTotalQty),
      0,
    );
    const totalSaleQty = filtered.reduce((s, e) => s + toNumber(e.saleQty), 0);
    const totalQty = filtered.reduce((s, e) => s + toNumber(e.qty), 0);

    const reportHtml = `
  <html>
  <head>
    <style>
      body { font-family: "Sarabun", sans-serif; margin: 40px; position: relative; }
      h2 { color: #e67e22; }
      .kpi-cards { display: flex; gap: 18px; margin-bottom: 24px; flex-wrap: wrap; }
      .kpi-card { flex:1; min-width:180px; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(54,162,235,0.08); border:1px solid #e5e7eb; background:#f8fafc; }
      .kpi-buyin { background:#eaf6ff; border-color:#b3e0ff; color:#2563eb; }
      .kpi-sale { background:#fff6e9; border-color:#ffd336; color:#e67e22; }
      .kpi-profit { background:#eaffea; border-color:#b3ffc7; color:#27ae60; }
      .kpi-sunk { background:#ffeaea; border-color:#ffb3b3; color:#dc3545; }
      .kpi-qty { background:#f8fafc; border-color:#e5e7eb; color:#374151; }
      .kpi-label { font-size:1.05rem; font-weight:700; margin-bottom:8px; }
      .kpi-value { font-size:1.35rem; font-weight:800; margin-bottom:4px; }
      .kpi-meta { font-size:1rem; margin-top:8px; }
      .filter { margin-bottom: 18px; color: #555; }
      table { border-collapse: collapse; width: 100%; background: #f8fafc; }
      th, td { padding: 6px 8px; border: 1px solid #ffd336; }
      thead th { background: #ffe9a7; }
      .total-cell { background: #ffd336; }
      .buyin-sum { color: #2d7be0; background:#eaf6ff; }
      .sale-sum { color: #e67e22; background:#fff6e9; }
      @media print {
        .action-buttons { display: none !important; }
        .world-clock { position: absolute !important; top: 20px !important; right: 20px !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 0.5cm; size: A4; }
        body { margin: 1cm; }
      }
      @media screen { .action-buttons button { cursor: pointer; } }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  </head>
  <body>
    <div class="world-clock" id="bangkok-clock">
      <div class="city">🇹🇭 Bangkok</div>
      <div class="date" id="clock-date">-</div>
      <div class="time" id="clock-time">--:--:--</div>
    </div>
    <div style="display:flex; justify-content:center; align-items:center; margin: 0 0 8px;">
      <img src="${location.origin}/assets/logo.png" alt="Logo" onerror="this.style.display='none'" style="width:250px; height:250px; display:block; object-fit:contain;" />
    </div>
    <h2>รายงานสรุปยอดขาย</h2>
    <div class="kpi-cards">
      <div class="kpi-card kpi-buyin">
        <div class="kpi-label">ยอดซื้อรวม</div>
        <div class="kpi-value">${totalBuyin.toLocaleString("th-TH")} บาท</div>
        <div class="kpi-meta">ซื้อทั้งหมด <b>${totalBuyinQty.toLocaleString("th-TH")}</b> ชิ้น</div>
      </div>
      <div class="kpi-card kpi-sale">
        <div class="kpi-label">ยอดขายรวม</div>
        <div class="kpi-value">${totalSale.toLocaleString("th-TH")} บาท</div>
        <div class="kpi-meta">ขายทั้งหมด <b>${totalSaleQty.toLocaleString("th-TH")}</b> ชิ้น</div>
      </div>
      <div class="kpi-card kpi-profit">
        <div class="kpi-label">กำไรรวม</div>
        <div class="kpi-value">${totalProfit.toLocaleString("th-TH")} บาท</div>
      </div>
      <div class="kpi-card kpi-sunk">
        <div class="kpi-label">เงินทุนรวม</div>
        <div class="kpi-value">${totalSunk.toLocaleString("th-TH")} บาท</div>
      </div>
      <div class="kpi-card kpi-qty">
        <div class="kpi-label">คงเหลือรวม (qty)</div>
        <div class="kpi-value">${totalQty.toLocaleString("th-TH")}</div>
      </div>
    </div>
    <div class="filter" style="background: #ffdc50ff; padding: 20px 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; margin: 24px 0;">
      <h3 style="color: #374151; font-size: 1.1rem; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #ffd336;">ตัวกรองรายงาน</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div style="padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">สินค้า</div>
          <div style="color: #111827; font-weight: 500;">${productCode ? filtered[0]?.name || productCode : "ทั้งหมด"}</div>
        </div>
        <div style="padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">ช่วงเวลา</div>
          <div style="color: #111827; font-weight: 500;">${periodType === "month" ? "รายเดือน" : periodType === "quarter" ? "รายไตรมาส" : "รายปี"}</div>
        </div>
        <div style="padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="color: #6b7280; font-size: 0.9rem; margin-bottom: 4px;">ปี</div>
          <div style="color: #111827; font-weight: 500;">${selectedYear || "-"}</div>
        </div>
      </div>
    </div>
    <!-- สรุปยอดรวม -->
    <div class="summary-totals" style="margin-bottom:24px;padding:16px;background:#f8fafc;border:1px solid #ffd336;box-shadow:0 2px 4px rgba(0,0,0,0.08);border-radius:8px;">
      <div style="color:#e67e22;font-size:1.1rem;margin-bottom:12px;"><b>ยอดขายรวม:</b> ${totalSale.toLocaleString("th-TH")} บาท</div>
      <div style="color:green;font-size:1.1rem;margin-bottom:12px;"><b>กำไรรวม:</b> ${totalProfit.toLocaleString("th-TH")} บาท</div>
      <div style="color:#dc3545;font-size:1.1rem;"><b>เงินทุนรวม:</b> ${totalSunk.toLocaleString("th-TH")} บาท</div>
    </div>
    <!-- ตารางรายเดือน/รายไตรมาส/รายปี -->
    ${(() => {
      if (periodType === "month") {
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
          if (Array.isArray(e.salesByMonth))
            e.salesByMonth.forEach((val, idx) => {
              monthlySales[idx] += val;
            });
          if (Array.isArray(e.buyinByMonth))
            e.buyinByMonth.forEach((val, idx) => {
              monthlyBuyin[idx] += val;
            });
        });
        const totalBuyin = monthlyBuyin.reduce((a, b) => a + b, 0);
        const totalSales = monthlySales.reduce((a, b) => a + b, 0);
        return `<div class='monthly-summary' style='margin-bottom:24px;'><b style='font-size:1.1rem;color:#2d7be0;'>ยอดซื้อแต่ละเดือน</b><table style='margin-top:8px;'><thead><tr>${monthNames.map((m) => `<th>${m}</th>`).join("")}<th class='total-cell'>รวม</th></tr></thead><tbody><tr>${monthlyBuyin.map((v) => `<td style='text-align:right;color:#2d7be0;'>${v.toLocaleString("th-TH")}</td>`).join("")}<td class='buyin-sum' style='text-align:right;font-weight:bold;'>${totalBuyin.toLocaleString("th-TH")}</td></tr></tbody></table><b style='font-size:1.1rem;color:#e67e22;display:block;margin-top:18px;'>ยอดขายแต่ละเดือน</b><table style='margin-top:8px;'><thead><tr>${monthNames.map((m) => `<th>${m}</th>`).join("")}<th class='total-cell'>รวม</th></tr></thead><tbody><tr>${monthlySales.map((v) => `<td style='text-align:right;color:#e67e22;'>${v.toLocaleString("th-TH")}</td>`).join("")}<td class='sale-sum' style='text-align:right;font-weight:bold;'>${totalSales.toLocaleString("th-TH")}</td></tr></tbody></table></div>`;
      } else if (periodType === "quarter") {
        const quarterNames = [
          "Q1 (ม.ค.-มี.ค.)",
          "Q2 (เม.ย.-มิ.ย.)",
          "Q3 (ก.ค.-ก.ย.)",
          "Q4 (ต.ค.-ธ.ค.)",
        ];
        const quarterlySales = Array(4).fill(0);
        const quarterlyBuyin = Array(4).fill(0);
        filtered.forEach((e) => {
          if (Array.isArray(e.salesByMonth))
            e.salesByMonth.forEach((val, idx) => {
              quarterlySales[idx] += val;
            });
          if (Array.isArray(e.buyinByMonth))
            e.buyinByMonth.forEach((val, idx) => {
              quarterlyBuyin[idx] += val;
            });
        });
        const totalBuyin = quarterlyBuyin.reduce((a, b) => a + b, 0);
        const totalSales = quarterlySales.reduce((a, b) => a + b, 0);
        return `<div class='quarterly-summary' style='margin-bottom:24px;'><b style='font-size:1.1rem;color:#2d7be0;'>ยอดซื้อแต่ละไตรมาส</b><table style='margin-top:8px;'><thead><tr>${quarterNames.map((m) => `<th>${m}</th>`).join("")}<th class='total-cell'>รวม</th></tr></thead><tbody><tr>${quarterlyBuyin.map((v) => `<td style='text-align:right;color:#2d7be0;'>${v.toLocaleString("th-TH")}</td>`).join("")}<td class='buyin-sum' style='text-align:right;font-weight:bold;'>${totalBuyin.toLocaleString("th-TH")}</td></tr></tbody></table><b style='font-size:1.1rem;color:#e67e22;display:block;margin-top:18px;'>ยอดขายแต่ละไตรมาส</b><table style='margin-top:8px;'><thead><tr>${quarterNames.map((m) => `<th>${m}</th>`).join("")}<th class='total-cell'>รวม</th></tr></thead><tbody><tr>${quarterlySales.map((v) => `<td style='text-align:right;color:#e67e22;'>${v.toLocaleString("th-TH")}</td>`).join("")}<td class='sale-sum' style='text-align:right;font-weight:bold;'>${totalSales.toLocaleString("th-TH")}</td></tr></tbody></table></div>`;
      } else {
        // รายปี
        return `<div class='yearly-summary' style='margin-bottom:24px;'><b style='font-size:1.1rem;color:#2d7be0;'>ยอดซื้อรวมปี ${selectedYear}</b><div style='font-size:1.2rem;color:#2d7be0;'>${totalBuyin.toLocaleString("th-TH")} บาท</div><b style='font-size:1.1rem;color:#e67e22;display:block;margin-top:18px;'>ยอดขายรวมปี ${selectedYear}</b><div style='font-size:1.2rem;color:#e67e22;'>${totalSale.toLocaleString("th-TH")} บาท</div></div>`;
      }
    })()}
    <div class="action-buttons" style="display: flex; gap: 16px; margin-top: 32px; justify-content: flex-end;">
      <button onclick="window.print()" style="padding: 12px 32px; font-size: 1rem; border-radius: 8px; background: #ffd336; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: #333; font-weight: 500; min-width: 160px;">Print</button>
    </div>
    <script>
      function updateBangkokClock() {
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const thaiYear = bangkokTime.getFullYear() + 543;
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dateStr = bangkokTime.getDate() + ' ' + thaiMonths[bangkokTime.getMonth()] + ' ' + thaiYear;
        const hours = String(bangkokTime.getHours()).padStart(2, '0');
        const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
        const timeStr = hours + ':' + minutes;
        document.getElementById('clock-date').textContent = dateStr;
        document.getElementById('clock-time').textContent = timeStr;
      }
      updateBangkokClock();
      setInterval(updateBangkokClock, 1000);
    </script>
  </body>
  </html>
  `;
    const reportWin = window.open("", "_blank", "width=900,height=1200");
    reportWin.document.write(reportHtml);
    reportWin.document.title = "รายงานสรุปยอดขาย";
    reportWin.document.close();
  });
