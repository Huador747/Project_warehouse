import { BACKEND_URL } from "/scripts/config.js";

document.addEventListener("DOMContentLoaded", () => {
    // ฟังก์ชันแสดงวันที่ พ.ศ. ข้าง input date
    function showThaiDateLabel(inputId, labelId) {
      const input = document.getElementById(inputId);
      const label = document.getElementById(labelId);
      if (!input || !label) return;
      if (!input.value) {
        label.textContent = "";
        return;
      }
      const d = new Date(input.value);
      if (Number.isNaN(d.getTime())) {
        label.textContent = "";
        return;
      }
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear() + 543;
      label.textContent = `(${day}/${month}/${year} พ.ศ.)`;
    }

  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const btnLoadReport = document.getElementById("btnLoadReport");
  const btnPrintReport = document.getElementById("btnPrintReport");
  const productFilter = document.getElementById("productFilter");

  setDefaultDates();
  syncDateConstraints();

  // แสดง label พ.ศ. ตอนโหลดหน้า
  showThaiDateLabel("startDate", "startDateThai");
  showThaiDateLabel("endDate", "endDateThai");

  loadProductsToFilter().then(() => {
    updateDocumentFields();
  });

  if (startDate) {
    startDate.addEventListener("change", async () => {
      syncDateConstraints("start");
      showThaiDateLabel("startDate", "startDateThai");
      await updateDocumentFields();
    });
  }

  if (endDate) {
    endDate.addEventListener("change", async () => {
      syncDateConstraints("end");
      showThaiDateLabel("endDate", "endDateThai");
      await updateDocumentFields();
    });
  }

  if (productFilter) {
    productFilter.addEventListener("change", async () => {
      await updateDocumentFields();
    });
  }

  if (btnLoadReport) {
    btnLoadReport.addEventListener("click", async () => {
      await createReport();
    });
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener("click", async () => {
      await createReportAndPrint();
    });
  }
});

async function createReport() {
  await updateDocumentFields();
}

async function createReportAndPrint() {
  await updateDocumentFields();
  setTimeout(() => {
    window.print();
  }, 150);
}

function setDefaultDates() {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (!startDate || !endDate) return;

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  startDate.value = formatInputDate(firstDay);
  endDate.value = formatInputDate(today);
}

function syncDateConstraints(changedField = "") {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (!startDate || !endDate) return;

  const startValue = startDate.value;
  const endValue = endDate.value;

  if (startValue) {
    endDate.min = startValue;
  } else {
    endDate.removeAttribute("min");
  }

  if (endValue) {
    startDate.max = endValue;
  } else {
    startDate.removeAttribute("max");
  }

  if (startValue && endValue && startValue > endValue) {
    if (changedField === "start") {
      endDate.value = startValue;
    } else if (changedField === "end") {
      startDate.value = endValue;
    } else {
      endDate.value = startValue;
    }
  }
}

async function updateDocumentFields() {
  const now = new Date();

  setText("docNo", generateReportNo(now));
  setText("docDate", formatThaiDate(now)); // พ.ศ.
  setText("docDateAD", formatADDate(now)); // ค.ศ.
// แปลงวันที่เป็น ค.ศ. (AD) dd/mm/yyyy
function formatADDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

  const startValue = document.getElementById("startDate")?.value || "";
  const endValue = document.getElementById("endDate")?.value || "";

  let rangeText = "-";
  if (startValue && endValue) {
    rangeText = `${formatThaiDate(startValue)} - ${formatThaiDate(endValue)}`;
  } else if (startValue) {
    rangeText = formatThaiDate(startValue);
  } else if (endValue) {
    rangeText = formatThaiDate(endValue);
  }

  setText("docRange", rangeText);
  setText("documentReference", getSelectedProductLabel());

  try {
    const { items } = await fetchSalesReportData();
    renderSalesReportTable(items);
    renderSummary(items);
  } catch (error) {
    console.error("โหลดข้อมูลรายงานไม่สำเร็จ:", error);
    renderSalesReportTable([]);
    renderSummary([]);
  }
}

function getSelectedProductLabel() {
  const productFilter = document.getElementById("productFilter");
  if (!productFilter) return "สินค้าทั้งหมด";

  return productFilter.value === "all"
    ? "สินค้าทั้งหมด"
    : `เฉพาะสินค้า: ${productFilter.options[productFilter.selectedIndex].text}`;
}

async function loadProductsToFilter() {
  const productFilter = document.getElementById("productFilter");
  if (!productFilter) return;

  try {
    const res = await fetch(`${BACKEND_URL}/products`);
    const products = await res.json();

    productFilter.innerHTML = '<option value="all">ทั้งหมด</option>';

    products.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.product_code || p._id || p.product_name;
      option.textContent = p.product_name;
      productFilter.appendChild(option);
    });
  } catch (error) {
    console.error("โหลดรายการสินค้าไม่สำเร็จ:", error);
  }
}

async function fetchSalesReportData() {
  const [products, sale] = await Promise.all([
    fetch(`${BACKEND_URL}/products`).then((r) => r.json()),
    fetch(`${BACKEND_URL}/sale_product`).then((r) => r.json())
  ]);

  const productsMap = {};
  products.forEach((p) => {
    productsMap[p.product_code] = p;
  });

  const startValue = document.getElementById("startDate")?.value || "";
  const endValue = document.getElementById("endDate")?.value || "";
  const selectedProduct = document.getElementById("productFilter")?.value || "all";

  const start = startValue ? toStartOfDay(startValue) : null;
  const end = endValue ? toEndOfDay(endValue) : null;

  const filteredSale = sale.filter((item) => {
    const rawDate = item.saleoutdate || item.date;
    if (!rawDate) return false;

    const saleDate = new Date(rawDate);
    if (Number.isNaN(saleDate.getTime())) return false;

    if (start && saleDate < start) return false;
    if (end && saleDate > end) return false;
    if (selectedProduct !== "all" && item.product_code !== selectedProduct) return false;

    return true;
  });

  const items = filteredSale.map((item, idx) => {
    const p = productsMap[item.product_code] || {};
    const qty = Number(item.salequantity || item.quantity || 0);
    const unitPrice = Number(item.sale_price || item.price || 0);

    return {
      id: idx + 1,
      productName: p.product_name || item.product_name || "-",
      description: [
        item.product_code ? `รหัส: ${item.product_code}` : "",
        item.customerName ? `ลูกค้า: ${item.customerName}` : "",
        item.notesale ? `หมายเหตุ: ${item.notesale}` : "",
        item.saleoutdate ? `วันที่ขาย: ${formatThaiDate(item.saleoutdate)}` : ""
      ]
        .filter(Boolean)
        .join(" | "),
      qty,
      unitPrice,
      total: Number(item.total) || qty * unitPrice
    };
  });

  return { items };
}

function toStartOfDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toEndOfDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function renderSalesReportTable(items) {
  const tbody = document.getElementById("salesReportTable");
  const grandTotal = document.getElementById("grandTotal");

  if (!tbody || !grandTotal) return;

  tbody.innerHTML = "";
  let total = 0;

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">ไม่พบข้อมูลรายการขาย</td>
      </tr>
    `;
    grandTotal.textContent = formatCurrency(0);
    return;
  }

  items.forEach((item, index) => {
    const rowTotal = Number(item.total) || Number(item.qty) * Number(item.unitPrice);
    total += rowTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${formatCurrency(rowTotal)}</td>
    `;
    tbody.appendChild(tr);
  });

  grandTotal.textContent = formatCurrency(total);
}

function renderSummary(items) {
  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const netTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  setText("summaryItems", `${totalItems} รายการ`);
  setText("summaryQty", `${totalQty} ชิ้น`);
  setText("summaryNet", formatCurrency(netTotal));
}

function generateReportNo(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `SR-${year}${month}${day}-${hour}${minute}`;
}

function formatInputDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatThaiDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;

  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function logout() {
  alert("ออกจากระบบสำเร็จ");
} 