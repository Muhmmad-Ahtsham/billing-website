![alt text](1.png)
 ![alt text](2.png) 
 ![alt text](3.png)
# Smart Billing System (JavaScript Fundamentals)

Browser-based invoice generator. HTML + CSS + vanilla JavaScript (ES6+), no libraries.

## Run it
1. Copy the `billing` folder into `C:\xampp\htdocs\`
2. Start Apache in XAMPP
3. Open http://localhost/billing/

## Files
```
billing/
├── index.html        billing page (add items, invoice, print)
├── history.html      saved invoices (advanced task)
├── css/style.css     layout, responsive rules and @media print rules
└── js/
    ├── app.js        billing logic
    └── history.js    invoice history page
```

## Lab requirements covered
| Requirement | Where in `js/app.js` |
|---|---|
| Products represented as objects | `PRODUCTS` array of `{ id, name, price, stock }` |
| Multiple line items stored in an array | `cart` array of `{ id, name, price, quantity }` |
| Totals calculated with functions | `calculateSubtotal()`, `calculateDiscount()`, `calculateTax()`, `calculateTotals()` |
| Invoice summary generated dynamically | `renderInvoice()`, `renderRows()`, `renderTotals()` |
| Add / remove item functions | `addItem()`, `removeItem()`, `updateQuantity()` |
| Convert input strings to numbers | `parseQuantity()`, `readCharges()` use `Number()` and check the result |
| Invoice number and date | `generateInvoiceNumber()`, `formatDate()` |
| Print invoice | Print button calls `window.print()`; `@media print` shows only the invoice |
| Quantity validation and stock limits | `validateQuantity()` |
| Advanced: persistent cart + invoice history (localStorage) | `saveCart()`, `saveInvoice()`, `history.html` |

## How totals are calculated
```
subtotal  = sum(price x quantity)
discount  = flat Rs. amount, never below 0 and never above the subtotal
tax       = (subtotal - discount) x taxRate / 100
total     = subtotal - discount + tax
```
Example: 1 Laptop + 2 Headphones + 3 Wireless Mouse, discount Rs. 2,500, tax 17%
= 137,500 - 2,500 = 135,000 + 22,950 = **Rs. 157,950.00**

## Test cases (fill in Actual Result and Status for your report)
| ID | Input | Expected |
|----|-------|----------|
| TC-01 | Open page with nothing added | Totals Rs. 0.00, buttons disabled, no NaN |
| TC-02 | Add 1 Laptop | Subtotal 120,000.00, total 140,400.00 (17% tax) |
| TC-03 | Laptop x1, Headphones x2, Mouse x3, discount 2500 | Total Rs. 157,950.00 |
| TC-04 | Quantity 0, -1, 1.5 or empty | Error message, item not added |
| TC-05 | Add Laptop beyond stock (5) | "Stock limit reached" message |
| TC-06 | Discount larger than subtotal | Discount capped, total Rs. 0.00 |
| TC-07 | Tax rate 150 or empty | Error message, tax treated as 0, no NaN |
| TC-08 | Click Remove on a line | Row removed, totals update |
| TC-09 | Reload the page | Cart, customer, discount and tax are restored |
| TC-10 | Save Invoice | Appears in Invoice History, next invoice number increases |
| TC-11 | Print Invoice (Ctrl+P preview) | Only the invoice is shown, no form or buttons |

## Screenshots to take for submission
1. Empty invoice (just opened the page)
2. Invoice with multiple items showing the correct total
3. Print preview (click Print Invoice, screenshot the browser print dialog)
4. Optional extras: a validation error, the Invoice History page, DevTools > Application > Local Storage

## Troubleshooting (from the lab manual)
- **NaN appears:** input values are strings; check number conversion in `parseQuantity()` / `readCharges()`.
- **Totals are wrong:** use `console.log` on subtotal, discount and tax.
- **Click does nothing:** open the Console (F12) and look for errors.
