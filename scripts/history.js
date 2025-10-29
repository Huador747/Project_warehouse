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

function renderHistoryTablePaged(transactions, page = 1) {
  const tbody = document.querySelector("#history-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const startIdx = (page - 1) * rowsPerPage;
  const pagedTransactions = transactions.slice(
    startIdx,
    startIdx + rowsPerPage
  );

  pagedTransactions.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${formatDateToAD(item.date)}</td>
            <td>${item.type}</td>
            <td>${item.product_code || "-"}</td>
            <td>${item.product_name}</td>
            <td>${item.model}</td>
            <td>${formatNumber(item.quantity)}</td>
            <td>${formatNumber(item.price)}</td>
            <td>${formatNumber(item.total)}</td>
            <td>${item.partner}</td>
            <td>${item.note}</td>
        `;
    tbody.appendChild(tr);
  });

  // แสดงข้อความเมื่อไม่มีข้อมูล
  if (pagedTransactions.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="10" style="text-align: center;">ไม่พบข้อมูล</td>';
    tbody.appendChild(tr);
  }

  // เพิ่มแถวว่างให้ครบ 10 แถว
  const emptyRows = rowsPerPage - pagedTransactions.length;
  if (emptyRows > 0) {
    for (let i = 0; i < emptyRows; i++) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      tr.innerHTML = `
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
      `;
      tbody.appendChild(tr);
    }
  }

  // เพิ่มบรรทัดนี้
  centerTableIfEmpty();
}

function renderHistoryTable(
  buyin,
  sale,
  productsMap = {},
  search = "",
  type = "all",
  yearFilter = "all",
  monthFilter = "all"
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
          quantity: item.quantity || 0,
          price: item.price || 0,
          total: item.total || item.quantity * item.price || 0,
          partner: item.supplier || "-",
          note: item.note || "-",
        };
      })
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
          quantity: item.salequantity || 0,
          price: item.sale_price || 0,
          total: item.total || item.salequantity * item.sale_price || 0,
          partner: item.customerName || "-",
          note: item.notesale || "-",
        };
      })
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
      { passive: false }
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
          currentMonth
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
          currentMonth
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
          currentMonth
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
          currentMonth
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
      currentMonth
    );
  } catch (err) {
    console.error("Error in main:", err);
  }
}
