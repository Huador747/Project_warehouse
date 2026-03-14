const API_URL = "/api/sales-report";
const AUTO_REFRESH_MS = 30000;

let allSalesData = [];
let refreshTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  const btnLoadReport = document.getElementById("btnLoadReport");
  const btnPrintReport = document.getElementById("btnPrintReport");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  setDefaultDates();
  syncDateConstraints();

  if (btnLoadReport) {
    btnLoadReport.addEventListener("click", loadReportRealtime);
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener("click", () => window.print());
  }

  if (startDate) {
    startDate.addEventListener("change", () => {
      syncDateConstraints("start");
    });
  }

  if (endDate) {
    endDate.addEventListener("change", () => {
      syncDateConstraints("end");
    });
  }

  loadReportRealtime();
  startAutoRefresh();
});

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    loadReportRealtime(false);
  }, AUTO_REFRESH_MS);
}

async function loadReportRealtime(showLoading = true) {
  try {
    if (showLoading) {
      renderLoadingState();
    }

    const rawData = await fetchSalesDataFromAPI();
    allSalesData = Array.isArray(rawData) ? rawData : [];

    initializeProductFilter(allSalesData);

    const filteredItems = filterReportItems(allSalesData);
    const documentData = buildDocumentData(filteredItems);

    renderSalesReport({
      document: documentData,
      items: filteredItems
    });
  } catch (error) {
    console.error("โหลดรายงานไม่สำเร็จ", error);
    renderErrorState("ไม่สามารถโหลดข้อมูลรายงานยอดขายได้");
  }
}

async function fetchSalesDataFromAPI() {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = await response.json();

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

function setDefaultDates() {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (!startDate || !endDate) return;

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  startDate.value = formatInputDate(firstDay);
  endDate.value = formatInputDate(today);

  syncDateConstraints();
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

  if (startValue && endValue) {
    if (new Date(startValue) > new Date(endValue)) {
      if (changedField === "start") {
        endDate.value = startValue;
      } else if (changedField === "end") {
        startDate.value = endValue;
      } else {
        endDate.value = startValue;
      }
    }
  }

  updateDocumentDateRange();
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatThaiDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear() + 543;

  return `${day}/${month}/${year}`;
}

function initializeProductFilter(items) {
  const productFilter = document.getElementById("productFilter");
  if (!productFilter) return;

  const currentValue = productFilter.value || "all";
  productFilter.innerHTML = `<option value="all">ทั้งหมด</option>`;

  const uniqueProducts = [...new Set(items.map((item) => item.product_name).filter(Boolean))];

  uniqueProducts.sort((a, b) => a.localeCompare(b, "th"));

  uniqueProducts.forEach((product) => {
    const option = document.createElement("option");
    option.value = product;
    option.textContent = product;
    productFilter.appendChild(option);
  });

  const exists = [...productFilter.options].some((option) => option.value === currentValue);
  productFilter.value = exists ? currentValue : "all";
}

function filterReportItems(items) {
  const productFilter = document.getElementById("productFilter");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  const selectedProduct = productFilter ? productFilter.value : "all";
  const startValue = startDate ? startDate.value : "";
  const endValue = endDate ? endDate.value : "";

  let filtered = [...items];

  if (selectedProduct !== "all") {
    filtered = filtered.filter((item) => item.product_name === selectedProduct);
  }

  if (startValue) {
    const start = new Date(`${startValue}T00:00:00`);
    filtered = filtered.filter((item) => {
      const saleDate = new Date(item.saleoutdate);
      return !Number.isNaN(saleDate.getTime()) && saleDate >= start;
    });
  }

  if (endValue) {
    const end = new Date(`${endValue}T23:59:59.999`);
    filtered = filtered.filter((item) => {
      const saleDate = new Date(item.saleoutdate);
      return !Number.isNaN(saleDate.getTime()) && saleDate <= end;
    });
  }

  return filtered;
}

function buildDocumentData(items) {
  const now = new Date();

  return {
    title: "รายงานยอดขาย",
    subtitle: "รายงานสรุปรายการขายสินค้าแบบเรียลไทม์",
    docNo: generateReportNo(now),
    date: formatThaiDate(now.toISOString()),
    range: getSelectedDateRangeText(),
    reportType: "สรุปรายการขายสินค้า",
    reference: getSelectedProductLabel(),
    preparedBy: "ระบบจัดการคลังสินค้า",
    note: buildReportNote(items)
  };
}

function generateReportNo(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `SR-${year}${month}${day}-${hour}${minute}`;
}

function buildReportNote(items) {
  const customerSet = new Set(
    items.map((item) => item.customerName).filter((name) => typeof name === "string" && name.trim())
  );

  const channels = new Set(
    items.map((item) => item.notesale).filter((note) => typeof note === "string" && note.trim())
  );

  return `เอกสารฉบับนี้จัดทำขึ้นเพื่อสรุปรายการขายสินค้าแบบเรียลไทม์ตามข้อมูลในระบบ โดยแสดงจำนวนที่ขาย ราคาขาย ยอดรวม ภาษี และกำไรเบื้องต้น ปัจจุบันมีลูกค้า ${customerSet.size} ราย และช่องทาง/หมายเหตุการขาย ${channels.size} รายการ`;
}

function getSelectedProductLabel() {
  const productFilter = document.getElementById("productFilter");
  if (!productFilter) return "สินค้าทั้งหมด";

  return productFilter.value === "all"
    ? "สินค้าทั้งหมด"
    : `เฉพาะสินค้า: ${productFilter.value}`;
}

function getSelectedDateRangeText() {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (!startDate || !endDate) return "-";

  const startText = formatThaiDate(startDate.value);
  const endText = formatThaiDate(endDate.value);

  return `${startText} - ${endText}`;
}

function updateDocumentDateRange() {
  setText("docRange", getSelectedDateRangeText());
}

function renderSalesReport(reportData) {
  renderDocumentInfo(reportData.document);
  renderTable(reportData.items);
  renderSummary(reportData.items);
}

function renderDocumentInfo(documentData) {
  setText("reportTitle", documentData.title);
  setText("reportSubtitle", documentData.subtitle);
  setText("docNo", documentData.docNo);
  setText("docDate", documentData.date);
  setText("docRange", documentData.range);
  setText("reportType", documentData.reportType);
  setText("documentReference", documentData.reference);
  setText("preparedBy", documentData.preparedBy);
  setText("documentNote", documentData.note);
}

function renderLoadingState() {
  const tbody = document.getElementById("salesReportTable");
  const grandTotal = document.getElementById("grandTotal");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">กำลังโหลดข้อมูล...</td>
      </tr>
    `;
  }

  if (grandTotal) {
    grandTotal.textContent = formatCurrency(0);
  }

  setText("summaryItems", "0 รายการ");
  setText("summaryQty", "0 ชิ้น");
  setText("summaryNet", formatCurrency(0));
}

function renderErrorState(message) {
  const tbody = document.getElementById("salesReportTable");
  const grandTotal = document.getElementById("grandTotal");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">${escapeHtml(message)}</td>
      </tr>
    `;
  }

  if (grandTotal) {
    grandTotal.textContent = formatCurrency(0);
  }

  setText("summaryItems", "0 รายการ");
  setText("summaryQty", "0 ชิ้น");
  setText("summaryNet", formatCurrency(0));
}

function renderTable(items) {
  const tbody = document.getElementById("salesReportTable");
  const grandTotal = document.getElementById("grandTotal");

  if (!tbody || !grandTotal) return;

  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">ไม่พบข้อมูลรายการขาย</td>
      </tr>
    `;
    grandTotal.textContent = formatCurrency(0);
    return;
  }

  let total = 0;

  items.forEach((item, index) => {
    const qty = Number(item.salequantity) || 0;
    const unitPrice = Number(item.sale_price) || 0;
    const rowTotal = Number(item.total) || qty * unitPrice;

    total += rowTotal;

    const descriptionParts = [
      item.product_code ? `รหัส: ${item.product_code}` : "",
      item.condition ? `สภาพ: ${item.condition}` : "",
      item.customerName ? `ลูกค้า: ${item.customerName}` : "",
      item.notesale ? `หมายเหตุ: ${item.notesale}` : "",
      item.saleoutdate ? `วันที่ขาย: ${formatThaiDate(item.saleoutdate)}` : ""
    ].filter(Boolean);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td>${escapeHtml(item.product_name || "-")}</td>
      <td>${escapeHtml(descriptionParts.join(" | "))}</td>
      <td class="text-center">${qty}</td>
      <td class="text-right">${formatCurrency(unitPrice)}</td>
      <td class="text-right">${formatCurrency(rowTotal)}</td>
    `;
    tbody.appendChild(tr);
  });

  grandTotal.textContent = formatCurrency(total);
}

function renderSummary(items) {
  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + (Number(item.salequantity) || 0), 0);
  const netTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  setText("summaryItems", `${totalItems} รายการ`);
  setText("summaryQty", `${totalQty} ชิ้น`);
  setText("summaryNet", formatCurrency(netTotal));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value ?? "";
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function logout() {
  alert("ออกจากระบบสำเร็จ");
}