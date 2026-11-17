"use strict";

/* Invoice History page: reads the invoices saved by app.js from localStorage */

const HISTORY_KEY = "billing_history";
const body = document.getElementById("history-body");
const summary = document.getElementById("hist-summary");
const clearAll = document.getElementById("clear-history");

function formatMoney(value) {
  return "Rs. " + (Math.round((value + Number.EPSILON) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (error) { /* ignore */ }
}

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) { td.className = className; }
  return td;
}

function detailRow(record) {
  const tr = document.createElement("tr");
  tr.className = "detail-row";
  tr.hidden = true;
  const td = document.createElement("td");
  td.colSpan = 6;

  const list = document.createElement("ul");
  list.className = "detail-list";
  record.items.forEach(function (item) {
    const li = document.createElement("li");
    li.textContent = item.quantity + " × " + item.name + " @ " + formatMoney(item.price) +
      " = " + formatMoney(item.price * item.quantity);
    list.appendChild(li);
  });
  const totals = document.createElement("p");
  totals.textContent = "Subtotal " + formatMoney(record.subtotal) +
    " | Discount " + formatMoney(record.discount) +
    " | Tax (" + record.taxRate + "%) " + formatMoney(record.tax) +
    " | Total " + formatMoney(record.total);

  td.appendChild(list);
  td.appendChild(totals);
  tr.appendChild(td);
  return tr;
}

function render() {
  const history = loadHistory();
  body.textContent = "";

  if (history.length === 0) {
    const tr = document.createElement("tr");
    const td = cell("No saved invoices yet. Create one on the Billing page.", "empty");
    td.colSpan = 6;
    tr.appendChild(td);
    body.appendChild(tr);
    summary.textContent = "0 invoices";
    clearAll.disabled = true;
    return;
  }

  clearAll.disabled = false;
  const revenue = history.reduce(function (sum, r) { return sum + r.total; }, 0);
  summary.textContent = history.length + (history.length === 1 ? " invoice" : " invoices") +
    " • Total billed: " + formatMoney(revenue);

  history.forEach(function (record, index) {
    const tr = document.createElement("tr");
    const itemCount = record.items.reduce(function (n, i) { return n + i.quantity; }, 0);

    tr.appendChild(cell(record.number));
    tr.appendChild(cell(new Date(record.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })));
    tr.appendChild(cell(record.customer));
    tr.appendChild(cell(String(itemCount), "num"));
    tr.appendChild(cell(formatMoney(record.total), "num"));

    const actions = document.createElement("td");
    const view = document.createElement("button");
    view.type = "button";
    view.className = "link";
    view.textContent = "View";
    view.setAttribute("aria-expanded", "false");
    view.dataset.view = String(index);
    const del = document.createElement("button");
    del.type = "button";
    del.className = "link-danger";
    del.textContent = "Delete";
    del.dataset.del = String(index);
    del.setAttribute("aria-label", "Delete invoice " + record.number);
    actions.appendChild(view);
    actions.appendChild(document.createTextNode(" "));
    actions.appendChild(del);
    tr.appendChild(actions);

    body.appendChild(tr);
    body.appendChild(detailRow(record));
  });
}

body.addEventListener("click", function (event) {
  const viewBtn = event.target.closest("button[data-view]");
  if (viewBtn) {
    const details = viewBtn.closest("tr").nextElementSibling;
    details.hidden = !details.hidden;
    viewBtn.setAttribute("aria-expanded", String(!details.hidden));
    viewBtn.textContent = details.hidden ? "View" : "Hide";
    return;
  }
  const delBtn = event.target.closest("button[data-del]");
  if (delBtn && window.confirm("Delete this saved invoice?")) {
    const history = loadHistory();
    history.splice(Number(delBtn.dataset.del), 1);
    saveHistory(history);
    render();
  }
});

clearAll.addEventListener("click", function () {
  if (window.confirm("Delete ALL saved invoices?")) {
    saveHistory([]);
    render();
  }
});

render();
