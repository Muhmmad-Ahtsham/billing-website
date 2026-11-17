"use strict";

/* =====================================================================
   Smart Billing System - Lab 5 (JavaScript Fundamentals)
   Concepts: variables, objects, arrays, functions, DOM, localStorage
   ===================================================================== */

/* ---------- 1. Data: products are objects, cart is an array ---------- */
const PRODUCTS = [
  { id: 1, name: "Laptop",          price: 120000, stock: 5 },
  { id: 2, name: "Monitor 24\"",    price: 32000,  stock: 8 },
  { id: 3, name: "Printer",         price: 28000,  stock: 4 },
  { id: 4, name: "Headphones",      price: 6500,   stock: 12 },
  { id: 5, name: "Webcam",          price: 4500,   stock: 10 },
  { id: 6, name: "Keyboard",        price: 3500,   stock: 15 },
  { id: 7, name: "Wireless Mouse",  price: 1500,   stock: 25 },
  { id: 8, name: "USB Flash Drive", price: 1200,   stock: 50 }
];

const STORAGE_KEYS = {
  cart: "billing_cart",
  settings: "billing_settings",
  counter: "billing_counter",
  history: "billing_history"
};

// Each line item: { id, name, price, quantity }
let cart = [];

/* ---------- 2. DOM references ---------- */
const el = {
  form: document.getElementById("item-form"),
  product: document.getElementById("product"),
  quantity: document.getElementById("quantity"),
  stockHint: document.getElementById("stock-hint"),
  message: document.getElementById("message"),
  customer: document.getElementById("customer"),
  discount: document.getElementById("discount"),
  tax: document.getElementById("tax"),
  chargeMessage: document.getElementById("charge-message"),
  invoiceNo: document.getElementById("invoice-no"),
  invoiceDate: document.getElementById("invoice-date"),
  invoiceCustomer: document.getElementById("invoice-customer"),
  body: document.getElementById("invoice-body"),
  subtotal: document.getElementById("subtotal"),
  discountOut: document.getElementById("discount-out"),
  taxRateOut: document.getElementById("tax-rate-out"),
  taxOut: document.getElementById("tax-out"),
  grandTotal: document.getElementById("grand-total"),
  printBtn: document.getElementById("print-btn"),
  saveBtn: document.getElementById("save-btn"),
  clearBtn: document.getElementById("clear-btn")
};

/* ---------- 3. Small helpers ---------- */
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value) {
  return "Rs. " + roundMoney(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function findProduct(id) {
  return PRODUCTS.find(function (p) { return p.id === id; });
}

function showMessage(target, text, type) {
  target.textContent = text;
  target.className = "message" + (text ? " " + type : "");
}

/* ---------- 4. localStorage wrappers (never crash if storage is blocked) ---------- */
function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* storage full or blocked: the app still works, just without persistence */
  }
}

function saveCart() {
  storageSet(STORAGE_KEYS.cart, cart);
}

function saveSettings() {
  storageSet(STORAGE_KEYS.settings, {
    customer: el.customer.value,
    discount: el.discount.value,
    tax: el.tax.value
  });
}

/* ---------- 5. Validation ---------- */
// Input values are strings. Convert and check: whole number, at least 1.
function parseQuantity(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return NaN;
  }
  return n;
}

function quantityInCart(productId) {
  const line = cart.find(function (item) { return item.id === productId; });
  return line ? line.quantity : 0;
}

// Returns an error message, or "" when the quantity is acceptable.
function validateQuantity(product, wantedTotal) {
  if (Number.isNaN(wantedTotal)) {
    return "Enter a whole number of 1 or more.";
  }
  if (wantedTotal > product.stock) {
    const left = product.stock - (quantityInCart(product.id));
    return "Stock limit reached: only " + product.stock + " " + product.name +
      " in stock" + (left > 0 ? " (you can add " + left + " more)." : " (already all in the invoice).");
  }
  return "";
}

/* ---------- 6. Cart operations ---------- */
function addItem(productId, quantity) {
  const product = findProduct(productId);
  if (!product) {
    return { ok: false, text: "Please choose a product." };
  }
  const qty = parseQuantity(quantity);
  if (Number.isNaN(qty)) {
    return { ok: false, text: validateQuantity(product, NaN) };
  }

  const existing = cart.find(function (item) { return item.id === productId; });
  const newTotal = (existing ? existing.quantity : 0) + qty;
  const error = validateQuantity(product, newTotal);
  if (error) {
    return { ok: false, text: error };
  }

  if (existing) {
    existing.quantity = newTotal;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, quantity: qty });
  }
  saveCart();
  renderInvoice();
  return { ok: true, text: "Added " + qty + " × " + product.name + " to the invoice." };
}

function removeItem(productId) {
  cart = cart.filter(function (item) { return item.id !== productId; });
  saveCart();
  renderInvoice();
}

function updateQuantity(productId, quantity) {
  const product = findProduct(productId);
  const line = cart.find(function (item) { return item.id === productId; });
  if (!product || !line) {
    return { ok: false, text: "Item not found." };
  }
  const qty = parseQuantity(quantity);
  const error = validateQuantity(product, qty);
  if (error) {
    return { ok: false, text: error };   // caller restores the previous valid quantity
  }
  line.quantity = qty;
  saveCart();
  return { ok: true, text: "" };
}

function clearCart() {
  cart = [];
  saveCart();
  renderInvoice();
}

/* ---------- 7. Calculations (separate, reusable functions) ---------- */
function calculateSubtotal() {
  return cart.reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
}

// A discount can never be negative or bigger than the subtotal.
function calculateDiscount(subtotal, discount) {
  return Math.min(Math.max(0, discount), subtotal);
}

function calculateTax(amount, taxRate) {
  return amount * (taxRate / 100);
}

// Returns every figure the invoice needs.
function calculateTotals(discount, taxRate) {
  const subtotal = calculateSubtotal();
  const appliedDiscount = calculateDiscount(subtotal, discount);
  const afterDiscount = subtotal - appliedDiscount;
  const tax = calculateTax(afterDiscount, taxRate);
  return {
    subtotal: roundMoney(subtotal),
    discount: roundMoney(appliedDiscount),
    tax: roundMoney(tax),
    total: roundMoney(afterDiscount + tax)
  };
}

/* ---------- 8. Charges input (discount + tax) ---------- */
// Invalid or empty values fall back to a safe number so NaN never reaches the invoice.
function readCharges() {
  let discount = Number(el.discount.value);
  let taxRate = Number(el.tax.value);
  const problems = [];

  if (el.discount.value.trim() === "" || !Number.isFinite(discount) || discount < 0) {
    discount = 0;
    problems.push("Discount must be 0 or more.");
  }
  if (el.tax.value.trim() === "" || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    taxRate = 0;
    problems.push("Tax rate must be between 0 and 100.");
  }

  el.discount.setAttribute("aria-invalid", problems.some(function (p) { return p.startsWith("Discount"); }));
  el.tax.setAttribute("aria-invalid", problems.some(function (p) { return p.startsWith("Tax"); }));
  showMessage(el.chargeMessage, problems.join(" "), "error");
  return { discount: discount, taxRate: taxRate };
}

/* ---------- 9. Invoice number and date ---------- */
function nextInvoiceCounter() {
  return Number(storageGet(STORAGE_KEYS.counter, 0)) + 1;
}

function generateInvoiceNumber(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return "INV-" + y + m + d + "-" + String(nextInvoiceCounter()).padStart(4, "0");
}

/* ---------- 10. Rendering ---------- */
function makeCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) { td.className = className; }
  return td;
}

function renderRows() {
  el.body.textContent = "";

  if (cart.length === 0) {
    const tr = document.createElement("tr");
    const td = makeCell("Your invoice is empty. Add an item to begin.", "empty");
    td.colSpan = 6;
    tr.appendChild(td);
    el.body.appendChild(tr);
    return;
  }

  cart.forEach(function (item, index) {
    const tr = document.createElement("tr");
    tr.appendChild(makeCell(String(index + 1)));
    tr.appendChild(makeCell(item.name));
    tr.appendChild(makeCell(formatMoney(item.price), "num"));

    // Quantity: editable box on screen, plain number when printed
    const qtyCell = document.createElement("td");
    qtyCell.className = "num";
    const printQty = document.createElement("span");
    printQty.className = "print-only";
    printQty.textContent = String(item.quantity);
    const input = document.createElement("input");
    input.type = "number";
    input.className = "qty-input no-print";
    input.min = "1";
    input.step = "1";
    input.value = String(item.quantity);
    input.dataset.id = String(item.id);
    input.setAttribute("aria-label", "Quantity for " + item.name);
    qtyCell.appendChild(printQty);
    qtyCell.appendChild(input);
    tr.appendChild(qtyCell);

    tr.appendChild(makeCell(formatMoney(item.price * item.quantity), "num line-total"));

    const actionCell = document.createElement("td");
    actionCell.className = "no-print";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "link-danger";
    remove.dataset.remove = String(item.id);
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + item.name);
    actionCell.appendChild(remove);
    tr.appendChild(actionCell);

    el.body.appendChild(tr);
  });
}

function updateStockHint() {
  const product = findProduct(Number(el.product.value));
  if (!product) {
    el.stockHint.textContent = "";
    return;
  }
  const left = product.stock - quantityInCart(product.id);
  el.stockHint.textContent = formatMoney(product.price) + " each • " + left + " of " + product.stock + " available";
}

// Updates numbers, header and buttons only. It does NOT rebuild the table rows,
// so a click that is in progress on a Remove/quantity control is never lost.
function renderTotals() {
  const now = new Date();
  const charges = readCharges();
  const totals = calculateTotals(charges.discount, charges.taxRate);

  el.invoiceNo.textContent = generateInvoiceNumber(now);
  el.invoiceDate.textContent = formatDate(now);
  el.invoiceCustomer.textContent = el.customer.value.trim() || "Walk-in customer";

  el.subtotal.textContent = formatMoney(totals.subtotal);
  el.discountOut.textContent = "- " + formatMoney(totals.discount);
  el.taxRateOut.textContent = String(charges.taxRate);
  el.taxOut.textContent = formatMoney(totals.tax);
  el.grandTotal.textContent = formatMoney(totals.total);

  const empty = cart.length === 0;
  el.printBtn.disabled = empty;
  el.saveBtn.disabled = empty;
  el.clearBtn.disabled = empty;

  updateStockHint();
}

// Full redraw: used when items are added, removed or the cart is cleared.
function renderInvoice() {
  renderRows();
  renderTotals();
}

// Refresh one row in place after its quantity changes.
function refreshRow(row, item) {
  row.querySelector(".print-only").textContent = String(item.quantity);
  row.querySelector(".qty-input").value = String(item.quantity);
  row.querySelector(".line-total").textContent = formatMoney(item.price * item.quantity);
}

/* ---------- 11. Actions: save, print, clear ---------- */
function saveInvoice() {
  if (cart.length === 0) {
    showMessage(el.message, "Add at least one item before saving.", "error");
    return;
  }
  const now = new Date();
  const charges = readCharges();
  const totals = calculateTotals(charges.discount, charges.taxRate);

  const record = {
    number: generateInvoiceNumber(now),
    date: now.toISOString(),
    customer: el.customer.value.trim() || "Walk-in customer",
    items: cart.map(function (item) { return Object.assign({}, item); }),
    taxRate: charges.taxRate,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  };

  const history = storageGet(STORAGE_KEYS.history, []);
  history.unshift(record);
  storageSet(STORAGE_KEYS.history, history);
  storageSet(STORAGE_KEYS.counter, nextInvoiceCounter());

  clearCart();
  el.customer.value = "";
  saveSettings();
  renderInvoice();
  showMessage(el.message, "Invoice " + record.number + " saved. See Invoice History.", "success");
}

function printInvoice() {
  if (cart.length === 0) {
    showMessage(el.message, "Nothing to print yet. Add an item first.", "error");
    return;
  }
  window.print();
}

function confirmAndClear() {
  if (window.confirm("Remove all items from this invoice?")) {
    clearCart();
    showMessage(el.message, "Invoice cleared.", "success");
  }
}

/* ---------- 12. Events ---------- */
el.form.addEventListener("submit", function (event) {
  event.preventDefault();
  const result = addItem(Number(el.product.value), el.quantity.value);
  showMessage(el.message, result.text, result.ok ? "success" : "error");
  if (result.ok) {
    el.quantity.value = "1";
    el.product.focus();
  } else {
    el.quantity.focus();
  }
});

el.product.addEventListener("change", updateStockHint);

// Event delegation: one listener handles every Remove button and quantity box
el.body.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-remove]");
  if (button) {
    removeItem(Number(button.dataset.remove));
    showMessage(el.message, "Item removed.", "success");
  }
});

el.body.addEventListener("change", function (event) {
  const input = event.target.closest("input.qty-input");
  if (input) {
    const id = Number(input.dataset.id);
    const result = updateQuantity(id, input.value);
    const line = cart.find(function (item) { return item.id === id; });
    if (line) {
      refreshRow(input.closest("tr"), line);   // shows the new value, or restores the old one
    }
    renderTotals();
    showMessage(el.message, result.text, result.ok ? "success" : "error");
  }
});

// Charges and customer only change the numbers, so only the totals are redrawn.
[el.discount, el.tax, el.customer].forEach(function (field) {
  field.addEventListener("input", function () { saveSettings(); renderTotals(); });
});

el.printBtn.addEventListener("click", printInvoice);
el.saveBtn.addEventListener("click", saveInvoice);
el.clearBtn.addEventListener("click", confirmAndClear);

/* ---------- 13. Start-up ---------- */
function init() {
  PRODUCTS.forEach(function (p) {
    const option = document.createElement("option");
    option.value = String(p.id);
    option.textContent = p.name + " – " + formatMoney(p.price);
    el.product.appendChild(option);
  });

  // Restore the saved cart, keeping only valid lines (guards against edited storage)
  const saved = storageGet(STORAGE_KEYS.cart, []);
  if (Array.isArray(saved)) {
    saved.forEach(function (line) {
      const product = findProduct(Number(line && line.id));
      const qty = parseQuantity(line && line.quantity);
      if (product && !Number.isNaN(qty) && qty <= product.stock) {
        cart.push({ id: product.id, name: product.name, price: product.price, quantity: qty });
      }
    });
  }

  const settings = storageGet(STORAGE_KEYS.settings, null);
  if (settings && typeof settings === "object") {
    el.customer.value = String(settings.customer || "");
    if (settings.discount !== undefined) { el.discount.value = String(settings.discount); }
    if (settings.tax !== undefined) { el.tax.value = String(settings.tax); }
  }

  renderInvoice();
}

init();
