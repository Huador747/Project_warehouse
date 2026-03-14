import { BACKEND_URL } from "./config.js";

async function fetchHistory() {
  try {
    const [buyinRes, saleRes, productsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/buyin_product`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/sale_product`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/products`).then((r) => r.json()),
    ]);
    return {
      buyin: Array.isArray(buyinRes) ? buyinRes : [],
      sale: Array.isArray(saleRes) ? saleRes : [],
      products: Array.isArray(productsRes) ? productsRes : [],
    };
  } catch (err) {
    console.error("Error fetching history:", err);
    return { buyin: [], sale: [], products: [] };
  }
}

function formatDateToAD(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear(); // ค.ศ.
    // แสดงในรูปแบบ dd/mm/yyyy หรือปรับตามต้องการ
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatNumber(num) {
  if (num === null || num === undefined) return "-";
  return Number(num).toLocaleString("th-TH");
}

// เพิ่มฟังก์ชันสำหรับชื่อเดือนภาษาไทย
const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function generateYearAndMonthOptions(transactions) {
  const years = new Set();
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");

  // เก็บค่าที่เลือกไว้
  const currentYear = yearSelect.value;
  const currentMonth = monthSelect.value;

  // รวบรวมปีที่มีในข้อมูล
  transactions.forEach((item) => {
    if (item.date) {
      const date = new Date(item.date);
      if (!isNaN(date)) {
        years.add(date.getFullYear());
      }
    }
  });

  // สร้างตัวเลือกปี
  yearSelect.innerHTML = '<option value="all">ทุกปี</option>';
  [...years]
    .sort((a, b) => b - a)
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = `${year}`;
      yearSelect.appendChild(option);
    });

  // สร้างตัวเลือกเดือน
  monthSelect.innerHTML = '<option value="all">ทุกเดือน</option>';
  thaiMonths.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  // คืนค่าที่เลือกไว้
  yearSelect.value = currentYear;
  monthSelect.value = currentMonth;
}

const rowsPerPage = 10;
let currentPage = 1;
let currentTransactions = [];

// ปรับความกว้างคอลัมน์เป็น % ได้ โดยตั้งค่า window.HISTORY_TABLE_COL_WIDTHS = [..10 ค่า..]
// ถ้าผลรวม > 100% ตารางจะกว้างเกินหน้าจอและเลื่อนแนวนอนได้
// ✅ แก้จาก 10 ค่า เป็น 11 ค่า (เพิ่มคอลัมน์ "หมายเหตุ")
const DEFAULT_COL_WIDTHS = [7, 4, 10, 25, 25, 6, 8, 8, 12, 15, 15, 12, 12, 15]; // 11 คอลัมน์

// ตั้งค่าสำหรับบังคับให้กว้างเกินหน้าจอ
const FORCE_OVERFLOW =
  typeof window.HISTORY_TABLE_FORCE_OVERFLOW === "boolean"
    ? window.HISTORY_TABLE_FORCE_OVERFLOW
    : true;
const OVERFLOW_EXTRA_PERCENT = Number(
  window.HISTORY_TABLE_OVERFLOW_EXTRA_PERCENT ?? 40,
);

function ensureColumnLayout() {
  const table = document.getElementById("history-table");
  if (!table) return;

  const widths =
    Array.isArray(window.HISTORY_TABLE_COL_WIDTHS) &&
    window.HISTORY_TABLE_COL_WIDTHS.length === 11 // ✅ แก้จาก 10 เป็น 11
      ? window.HISTORY_TABLE_COL_WIDTHS
      : DEFAULT_COL_WIDTHS;

  // สร้าง/อัปเดต colgroup สำหรับกำหนดความกว้างเป็น %
  table.querySelector("colgroup")?.remove();
  const colgroup = document.createElement("colgroup");
  widths.forEach((w) => {
    const col = document.createElement("col");
    col.style.width = `${w}%`;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, table.firstChild);

  // ถ้าผลรวม > 100% ให้ตารางกว้างเกินและเลื่อนได้
  const total = widths.reduce((a, b) => a + b, 0);
  let widthPercent = Math.max(250, total);

  // บังคับให้กว้างเกินหน้าจอเสมอ
  if (FORCE_OVERFLOW) {
    widthPercent = Math.max(widthPercent, 100 + OVERFLOW_EXTRA_PERCENT);
  }

  table.style.tableLayout = "fixed";
  table.style.minWidth = "100%";
  table.style.width = `${widthPercent}%`;

  // ทำให้ container เลื่อนแกน X ได้
  const wrapper = document.querySelector(".history-table-wrapper");
  if (wrapper) {
    wrapper.style.overflowX = "auto";
    wrapper.style.webkitOverflowScrolling = "touch";
  }
}

function renderHistoryTablePaged(transactions, page = 1) {
  const tbody = document.querySelector("#history-table tbody");
  if (!tbody) return;

  ensureColumnLayout();

  tbody.innerHTML = "";
  const startIdx = (page - 1) * rowsPerPage;
  const pagedTransactions = transactions.slice(
    startIdx,
    startIdx + rowsPerPage,
  );

  pagedTransactions.forEach((item) => {
    const tr = document.createElement("tr");

    // ✅ แสดงค่าขนส่งเฉพาะรายการขาย (null แสดง "-")
    const shippingDisplay =
      item.shipping_cost !== null && item.shipping_cost !== undefined
        ? formatNumber(item.shipping_cost)
        : "-";

    // ✅ แสดงภาษีเฉพาะรายการขาย (null แสดง "-")
    const taxDisplay =
      item.tax !== null && item.tax !== undefined
        ? formatNumber(item.tax)
        : "-";

    const grandTotalVal = (Number(item.total) || 0) + (Number(item.tax) || 0);
    tr.innerHTML = `
      <td>${formatDateToAD(item.date)}</td>
      <td>${item.type}</td>
      <td>${item.product_code || "-"}</td>
      <td style="text-align: left;">${item.product_name}</td>
      <td style="text-align: left;">${item.model}</td>
      <td>${item.unit || "-"}</td>
      <td>${formatNumber(item.price)}</td>
      <td>${formatNumber(item.quantity)}</td>
      <td>${shippingDisplay}</td>
      <td>${taxDisplay}</td>
      <td>${formatNumber(item.total)}</td>
      <td>${formatNumber(grandTotalVal)}</td>
      <td style="text-align: left;">${item.partner}</td>
      <td style="text-align: left;">${item.note}</td>
      `;
    tbody.appendChild(tr);
  });

  // แสดงข้อความเมื่อไม่มีข้อมูล
  if (pagedTransactions.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="13" style="text-align: center;">ไม่พบข้อมูล</td>'; // ✅ 13 คอลัมน์
    tbody.appendChild(tr);
  }

  // เพิ่มแถวว่างให้ครบ 10 แถว
  const emptyRows = rowsPerPage - pagedTransactions.length;
  if (emptyRows > 0) {
    for (let i = 0; i < emptyRows; i++) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      tr.innerHTML = `
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td></td><td></td><td></td><td> </td>
      `; // ✅ 13 คอลัมน์
      tbody.appendChild(tr);
    }
  }

  centerTableIfEmpty();
}

function renderHistoryTable(
  buyin,
  sale,
  productsMap = {},
  search = "",
  type = "all",
  yearFilter = "all",
  monthFilter = "all",
) {
  const tbody = document.querySelector("#history-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let transactions = [];

  // แปลงข้อมูลการซื้อ
  if (type === "all" || type === "buyin") {
    transactions.push(
      ...buyin.map((item) => {
        const product = productsMap[item.product_code] || {};
        return {
          date: item.buyindate || item.date,
          type: "ซื้อ",
          product_code: item.product_code,
          product_name: product.product_name || item.product_name || "-",
          model: product.model || item.model || "-",
          unit: product.unit || item.unit || "-",
          quantity: item.quantity || 0,
          price: item.price || 0,
          shipping_cost: null, // ✅ ซื้อไม่มีค่าขนส่ง
          tax: null, // ✅ ซื้อไม่มีภาษี
          total: item.total || item.quantity * item.price || 0,
          partner: item.supplier || "-",
          note: item.note || "-",
        };
      }),
    );
  }

  // แปลงข้อมูลการขาย
  if (type === "all" || type === "sale") {
    transactions.push(
      ...sale.map((item) => {
        const product = productsMap[item.product_code] || {};
        return {
          date: item.saleoutdate || item.date,
          type: "ขาย",
          product_code: item.product_code,
          product_name: product.product_name || item.product_name || "-",
          model: product.model || item.model || "-",
          unit: product.unit || item.unit || "-",
          quantity: item.salequantity || 0,
          price: item.sale_price || 0,
          shipping_cost: item.shipping_cost || 0, // ✅ ดึงจาก sale_product.shipping_cost
          tax: item.vat || 0, // ✅ ดึงภาษี 7% จาก sale_product
          total: item.total || item.salequantity * item.sale_price || 0,
          partner: item.customerName || "-",
          note: item.notesale || "-",
        };
      }),
    );
  }

  // เรียงตามวันที่ล่าสุด
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // กรองด้วยคำค้นหา
  const searchLower = search.toLowerCase();
  transactions = transactions.filter((item) => {
    if (!search) return true;
    return (
      (item.product_code || "").toLowerCase().includes(searchLower) ||
      (item.product_name || "").toLowerCase().includes(searchLower) ||
      (item.model || "").toLowerCase().includes(searchLower)
    );
  });

  // กรองตามปีและเดือน
  if (yearFilter !== "all" || monthFilter !== "all") {
    transactions = transactions.filter((item) => {
      if (!item.date) return false;
      const date = new Date(item.date);
      if (isNaN(date)) return false;

      const itemYear = date.getFullYear().toString();
      const itemMonth = String(date.getMonth() + 1).padStart(2, "0");

      if (yearFilter !== "all" && itemYear !== yearFilter) return false;
      if (monthFilter !== "all" && itemMonth !== monthFilter) return false;

      return true;
    });
  }

  // Save filtered transactions for pagination
  currentTransactions = transactions;

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("login.html");
  });

  // คำนวณสรุปยอด
  const summary = {
    buyinTotal: 0,
    saleTotal: 0,
    buyinCount: 0,
    saleCount: 0,
  };

  transactions.forEach((item) => {
    if (item.type === "ซื้อ") {
      summary.buyinTotal += Number(item.total) || 0;
      summary.buyinCount++;
    } else if (item.type === "ขาย") {
      summary.saleTotal += Number(item.total) || 0;
      summary.saleCount++;
    }
  });

  // อัพเดทสรุปยอดในหน้าเว็บ
  document.getElementById("total-buyin").textContent =
    formatNumber(summary.buyinTotal) + " บาท";
  document.getElementById("total-sale").textContent =
    formatNumber(summary.saleTotal) + " บาท";
  document.getElementById("count-buyin").textContent =
    formatNumber(summary.buyinCount) + " รายการ";
  document.getElementById("count-sale").textContent =
    formatNumber(summary.saleCount) + " รายการ";

  // Render paged table
  renderHistoryTablePaged(transactions, currentPage);

  // Render pagination controls
  renderPagination(transactions, currentPage);
}

function centerTableIfEmpty() {
  const wrapper = document.querySelector(".history-table-wrapper");
  const tbody = document.querySelector("#history-table tbody");
  if (!wrapper || !tbody) return;

  // ตรวจสอบว่ามีแต่แถว "ไม่พบข้อมูล" หรือแถวว่าง
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const onlyEmpty =
    rows.length === 1 && rows[0].textContent.includes("ไม่พบข้อมูล");
  const allEmpty =
    rows.every((tr) => tr.classList.contains("empty-row")) || onlyEmpty;

  if (allEmpty) {
    wrapper.classList.add("center-when-empty");
  } else {
    wrapper.classList.remove("center-when-empty");
  }
}

main();

document.addEventListener("DOMContentLoaded", () => {
  const navbarText = document.querySelector(".navbar-text");
  if (navbarText) {
    requestAnimationFrame(() => {
      navbarText.classList.add("slide-in");
    });
  }

  const wrapper = document.querySelector(".history-table-wrapper");
  if (wrapper) {
    wrapper.addEventListener(
      "wheel",
      function (e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          wrapper.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );
  }
});

//000000000000000000000000000000000000000000
function renderPagination(transactions, page = 1) {
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  let paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "pagination";
    paginationDiv.className = "pagination-controls";
    document.querySelector(".history-list").appendChild(paginationDiv);
  }
  let html = "";
  if (totalPages > 1) {
    html += `<button ${
      page === 1 ? "disabled" : ""
    } id="prev-page">ก่อนหน้า</button>`;
    html += `<span style="margin:0 8px;">หน้า ${page} / ${totalPages}</span>`;
    html += `<button ${
      page === totalPages ? "disabled" : ""
    } id="next-page">ถัดไป</button>`;
  }
  paginationDiv.innerHTML = html;

  if (totalPages > 1) {
    document.getElementById("prev-page")?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderHistoryTablePaged(currentTransactions, currentPage);
        renderPagination(currentTransactions, currentPage);
      }
    });
    document.getElementById("next-page")?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderHistoryTablePaged(currentTransactions, currentPage);
        renderPagination(currentTransactions, currentPage);
      }
    });
  }
}

async function main() {
  try {
    const { buyin, sale, products } = await fetchHistory();

    const productsMap = {};
    products.forEach((p) => {
      if (p.product_code) {
        productsMap[p.product_code] = p;
      }
    });

    let currentType = "all";
    let currentSearch = "";
    let currentYear = "all";
    let currentMonth = "all";

    // สร้างตัวเลือกปีและเดือน
    const allTransactions = [
      ...buyin.map((item) => ({ ...item, date: item.buyindate || item.date })),
      ...sale.map((item) => ({ ...item, date: item.saleoutdate || item.date })),
    ];
    generateYearAndMonthOptions(allTransactions);

    // ตั้งค่า event listeners
    const typeSelect = document.getElementById("history-type");
    const yearSelect = document.getElementById("year-select");
    const monthSelect = document.getElementById("month-select");

    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        currentType = this.value;
        renderHistoryTable(
          buyin,
          sale,
          productsMap,
          currentSearch,
          currentType,
          currentYear,
          currentMonth,
        );
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        currentYear = this.value;
        renderHistoryTable(
          buyin,
          sale,
          productsMap,
          currentSearch,
          currentType,
          currentYear,
          currentMonth,
        );
      });
    }

    if (monthSelect) {
      monthSelect.addEventListener("change", function () {
        currentMonth = this.value;
        renderHistoryTable(
          buyin,
          sale,
          productsMap,
          currentSearch,
          currentType,
          currentYear,
          currentMonth,
        );
      });
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        currentSearch = this.value.trim();
        renderHistoryTable(
          buyin,
          sale,
          productsMap,
          currentSearch,
          currentType,
          currentYear,
          currentMonth,
        );
      });
    }

    // แสดงข้อมูลครั้งแรก
    renderHistoryTable(
      buyin,
      sale,
      productsMap,
      currentSearch,
      currentType,
      currentYear,
      currentMonth,
    );
  } catch (err) {
    console.error("Error in main:", err);
  }
}

/**
 * สร้างรายงานสรุปเงื่อนไขการกรอง ณ ขณะนั้น
 * @returns {string} HTML รายงาน
 */
function generateReportSummary({ type, year, month, search }) {
  // แปลงชื่อประเภท
  const typeLabel =
    type === "buyin"
      ? "เฉพาะรายการซื้อ"
      : type === "sale"
        ? "เฉพาะรายการขาย"
        : "ทั้งหมด";
  // แปลงปี
  const yearLabel = year === "all" ? "ทุกปี" : `ปี ${Number(year) + 543}`;
  // แปลงเดือน
  const monthLabel =
    month === "all"
      ? "ทุกเดือน"
      : `เดือน ${thaiMonths[Number(month) - 1] || month}`;
  // คำค้นหา
  const searchLabel = search ? `ค้นหา: "${search}"` : "ไม่ระบุคำค้นหา";

  return `
    <div class="report-summary">
      <h3>สรุปเงื่อนไขรายงาน</h3>
      <ul>
        <li>ประเภท: <strong>${typeLabel}</strong></li>
        <li>ปี: <strong>${yearLabel}</strong></li>
        <li>เดือน: <strong>${monthLabel}</strong></li>
        <li>${searchLabel}</li>
      </ul>
    </div>
  `;
}

// ฟังก์ชันแสดงรายงานใน .history-list
function showReport() {
  const type = document.getElementById("history-type")?.value || "all";
  const year = document.getElementById("year-select")?.value || "all";
  const month = document.getElementById("month-select")?.value || "all";
  const search = document.getElementById("search-input")?.value?.trim() || "";

  const summaryHTML = generateReportSummary({ type, year, month, search });

  // แสดงรายงานด้านบนตาราง
  const historyList = document.querySelector(".history-list");
  if (historyList) {
    // ลบรายงานเดิมก่อน
    historyList.querySelector(".report-summary")?.remove();
    historyList.insertAdjacentHTML("afterbegin", summaryHTML);
  }
}

// เพิ่ม event ให้ปุ่ม report
document
  .getElementById("report-btn")
  ?.addEventListener("click", async function (e) {
    e.preventDefault();

    // ดึงค่าตัวกรองปัจจุบัน
    const type = document.getElementById("history-type")?.value || "all";
    const year = document.getElementById("year-select")?.value || "all";
    const month = document.getElementById("month-select")?.value || "all";
    const search = document.getElementById("search-input")?.value?.trim() || "";

    // ดึงข้อมูล
    const { buyin, sale, products } = await fetchHistory();
    const productsMap = {};
    products.forEach((p) => {
      if (p.product_code) productsMap[p.product_code] = p;
    });

    // กรองข้อมูลตามตัวกรอง
    let transactions = [];
    if (type === "all" || type === "buyin") {
      transactions.push(
        ...buyin.map((item) => ({
          date: item.buyindate || item.date,
          type: "ซื้อ",
          product_code: item.product_code,
          product_name:
            productsMap[item.product_code]?.product_name ||
            item.product_name ||
            "-",
          model: productsMap[item.product_code]?.model || item.model || "-",
          unit: productsMap[item.product_code]?.unit || item.unit || "-",
          quantity: item.quantity || 0,
          price: item.price || 0,
          shipping_cost: null,
          tax: null,
          total: item.total || item.quantity * item.price || 0,
          partner: item.supplier || "-",
          note: item.note || "-",
        })),
      );
    }
    if (type === "all" || type === "sale") {
      transactions.push(
        ...sale.map((item) => ({
          date: item.saleoutdate || item.date,
          type: "ขาย",
          product_code: item.product_code,
          product_name:
            productsMap[item.product_code]?.product_name ||
            item.product_name ||
            "-",
          model: productsMap[item.product_code]?.model || item.model || "-",
          unit: productsMap[item.product_code]?.unit || item.unit || "-",
          quantity: item.salequantity || 0,
          price: item.sale_price || 0,
          shipping_cost: item.shipping_cost || 0,
          tax: item.vat || 0,
          total: item.total || item.salequantity * item.sale_price || 0,
          partner: item.customerName || "-",
          note: item.notesale || "-",
        })),
      );
    }

    // กรองด้วยคำค้นหา
    const searchLower = search.toLowerCase();
    transactions = transactions.filter((item) => {
      if (!search) return true;
      return (
        (item.product_code || "").toLowerCase().includes(searchLower) ||
        (item.product_name || "").toLowerCase().includes(searchLower) ||
        (item.model || "").toLowerCase().includes(searchLower)
      );
    });

    // กรองตามปีและเดือน
    if (year !== "all" || month !== "all") {
      transactions = transactions.filter((item) => {
        if (!item.date) return false;
        const date = new Date(item.date);
        if (isNaN(date)) return false;
        const itemYear = date.getFullYear().toString();
        const itemMonth = String(date.getMonth() + 1).padStart(2, "0");
        if (year !== "all" && itemYear !== year) return false;
        if (month !== "all" && itemMonth !== month) return false;
        return true;
      });
    }

    // สรุปยอดรวม
    const buyinTotal = transactions
      .filter((t) => t.type === "ซื้อ")
      .reduce((sum, t) => sum + Number(t.total || 0), 0);
    const saleTotal = transactions
      .filter((t) => t.type === "ขาย")
      .reduce((sum, t) => sum + Number(t.total || 0), 0);
    const buyinCount = transactions.filter((t) => t.type === "ซื้อ").length;
    const saleCount = transactions.filter((t) => t.type === "ขาย").length;

    // สร้าง HTML สำหรับ Report
    const reportHtml = `
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root{
      --bg: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;

      --brand: #fbbf24;     /* amber */
      --brand-2: #f59e0b;   /* darker amber */
      --buy: #2563eb;       /* blue */
      --sale: #ea580c;      /* orange */

      --card: #ffffff;
      --tableHead: #fff7d6;
      --rowAlt: #fafafa;
      --shadow: 0 10px 25px rgba(17,24,39,.08);
      --shadow-sm: 0 2px 10px rgba(17,24,39,.08);
      --radius: 14px;
    }

    * { box-sizing: border-box; }
    body {
      font-family: "Sarabun", sans-serif;
      margin: 0;
      padding: 28px;
      color: var(--text);
      background: #f6f7fb;
    }

    .page {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: var(--shadow);
      padding: 26px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 18px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, #fff7d6 0%, #ffffff 60%);
      border: 1px solid #fde68a;
    }
    .header h2{
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: .2px;
    }
    .header .sub {
      margin-top: 6px;
      color: var(--muted);
      font-size: .95rem;
      line-height: 1.35;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #111827;
      color: #fff;
      font-size: .85rem;
      white-space: nowrap;
      box-shadow: var(--shadow-sm);
    }
    .dot{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--brand-2);
      display: inline-block;
    }

    /* Sections */
    .section {
      margin-top: 18px;
    }

    /* Filter card */
    .filter-card{
      margin-top: 8px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      padding: 10px 10px 8px;
    }
    .filter-title{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 8px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #fde68a;
    }
    .filter-title h3{
      margin: 0;
      font-size: .95rem;
      color: #1f2937;
    }
    .chip{
      padding: 3px 7px;
      border-radius: 999px;
      background: #fff7d6;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: .75rem;
      white-space: nowrap;
    }
    .filter-grid{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .filter-grid li{
      display: flex;
      gap: 6px;
      align-items: baseline;
      color: #374151;
      font-size: .85rem;
      line-height: 1.2;
    }
    .filter-grid strong{
      color: #111827;
      font-weight: 700;
    }

    /* Summary cards */
    .summary-wrap{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .summary-card{
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow-sm);
      padding: 8px 10px;
    }
    .summary-label{
      color: var(--muted);
      font-size: .8rem;
      margin: 0 0 4px 0;
    }
    .summary-value{
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: .2px;
    }
    .summary-meta{
      margin-top: 3px;
      color: #374151;
      font-size: .8rem;
    }
    .buy{ color: var(--buy); }
    .sale{ color: var(--sale); }

    /* Table */
    .table-wrap{
      margin-top: 18px;
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      background: #fff;
    }
    table{
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
    }
    thead th{
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--tableHead);
      border-bottom: 1px solid var(--border);
      color: #1f2937;
      font-size: .9rem;
      text-align: left;
      padding: 10px 10px;
      white-space: nowrap;
    }
    tbody td{
      border-bottom: 1px solid var(--border);
      padding: 9px 10px;
      font-size: .9rem;
      color: #111827;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    tbody tr:nth-child(even){
      background: var(--rowAlt);
    }
    tbody tr:hover{
      background: #fff7d6;
    }

    /* Alignment helpers */
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }

    /* Make some columns nicer if you can add classes in cells */
    .note, .partner, .product-name { white-space: normal; }

    /* Buttons */
    .action-buttons{
      display: flex;
      gap: 12px;
      margin-top: 18px;
      justify-content: flex-end;
    }
    .btn{
      appearance: none;
      border: 1px solid #fcd34d;
      background: linear-gradient(180deg, #ffd336 0%, #fbbf24 100%);
      padding: 10px 18px;
      border-radius: 10px;
      cursor: pointer;
      font-size: .95rem;
      font-weight: 700;
      color: #111827;
      box-shadow: var(--shadow-sm);
      transition: transform .12s ease, box-shadow .12s ease;
      min-width: 150px;
    }
    .btn:hover{
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgba(17,24,39,.10);
    }

    /* Print */
    @media print{
      body{ background: #fff; padding: 0; }
      .page{ box-shadow: none; border: none; padding: 0; }
      .action-buttons{ display: none !important; }
      thead th{ position: static; } /* sticky not needed in print */
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0.6cm; size: A4 landscape; }
    }

    /* Responsive for small width */
    @media (max-width: 920px){
      body{ padding: 14px; }
      .summary-wrap{ grid-template-columns: 1fr; }
      .filter-grid{ grid-template-columns: 1fr; }
      thead th, tbody td{ font-size: .85rem; }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div>
        <h2>รายงานประวัติซื้อ-ขาย</h2>
        <div class="sub">สรุปยอดและรายละเอียดรายการตามตัวกรองรายงาน</div>
      </div>
      <div class="badge"><span class="dot"></span> Report</div>
    </div>

    <div class="filter-card">
      <div class="filter-title">
        <h3>ตัวกรองรายงาน</h3>
        <div class="chip">${type === "buyin" ? "เฉพาะซื้อ" : type === "sale" ? "เฉพาะขาย" : "ทั้งหมด"}</div>
      </div>
      <ul class="filter-grid">
        <li>ประเภท: <strong>${type === "buyin" ? "เฉพาะรายการซื้อ" : type === "sale" ? "เฉพาะรายการขาย" : "ทั้งหมด"}</strong></li>
        <li>ปี: <strong>${year === "all" ? "ทุกปี" : `ปี ${Number(year) + 543}`}</strong></li>
        <li>เดือน: <strong>${month === "all" ? "ทุกเดือน" : `เดือน ${thaiMonths[Number(month) - 1] || month}`}</strong></li>
        <li>${search ? `ค้นหา: <strong>"${search}"</strong>` : "ไม่ระบุคำค้นหา"}</li>
      </ul>
    </div>

    <div class="summary-wrap">
      <div class="summary-card">
        <div class="summary-label">ยอดซื้อรวม</div>
        <div class="summary-value buy">${buyinTotal.toLocaleString("th-TH")} บาท</div>
        <div class="summary-meta">(${buyinCount} รายการ)</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">ยอดขายรวม</div>
        <div class="summary-value sale">${saleTotal.toLocaleString("th-TH")} บาท</div>
        <div class="summary-meta">(${saleCount} รายการ)</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
  <tr>
    <th style="width:90px;">วันที่</th>
    <th style="width:75px;">ประเภท</th>
    <th style="width:90px;">รหัสสินค้า</th>
    <th style="width:180px; text-align: center;">ชื่อสินค้า</th>
    <th style="width:50px;">หน่วย</th>
    <th style="width:95px;" class="num">ราคา<br>ต่อหน่วย</th>
    <th style="width:65px;" class="num">จำนวน</th>
    <th style="width:85px;" class="num">ค่าขนส่ง</th>
    <th style="width:75px;" class="num">ภาษี 7%</th>
    <th style="width:95px;" class="num">รวม</th>
    <th style="width:120px;">ลูกค้า/ผู้ขาย</th>
  </tr>
</thead>
        <tbody>
          ${transactions
            .map(
              (item) => `
            <tr>
              <td>${item.date ? new Date(item.date).getDate() + "/" + (new Date(item.date).getMonth() + 1) + "/" + (new Date(item.date).getFullYear() + 543) : "-"}</td>
              <td>${item.type}</td>
              <td>${item.product_code || "-"}</td>
              <td class="product-name">${item.product_name}</td>
              <td>${item.unit || "-"}</td>
              <td class="num">${Number(item.price).toLocaleString("th-TH")}</td>
              <td class="num">${Number(item.quantity).toLocaleString("th-TH")}</td>
              <td class="num">${item.shipping_cost !== null && item.shipping_cost !== undefined ? Number(item.shipping_cost).toLocaleString("th-TH") : "-"}</td>
              <td class="num">${item.tax !== null && item.tax !== undefined ? Number(item.tax).toLocaleString("th-TH") : "-"}</td>
              <td class="num"><b>${Number(item.total).toLocaleString("th-TH")}</b></td>
              <td class="partner">${item.partner}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="action-buttons">
      <button class="btn" onclick="window.print()">Print</button>
    </div>
  </div>
</body>
</html>
`;

    // เปิดหน้าต่างใหม่แสดงรายงาน
    const reportWin = window.open("", "_blank", "width=900,height=1200");
    reportWin.document.write(reportHtml);
    reportWin.document.title = "รายงานประวัติซื้อ-ขาย";
    reportWin.document.close();
  });

// ...existing code...
