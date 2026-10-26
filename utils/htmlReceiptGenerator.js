/**
 * Server-Side HTML Receipt Generator for ShahLajuk Furniture Mart
 *
 * Re-designed to match the ShahLajuk official invoice design:
 * - Warm linen aesthetic (#F5F3EC)
 * - Clean modern typography & letter-spaced labels
 * - High-resolution SLFM watermark logo with watermark text removed
 * - Bold Amount Due & status indicator
 * - Single-page A4 print optimization with seamless SSR
 */

import { WATERMARK_LOGO_BASE64 } from './watermarkBase64.js';

export function generateServerReceiptHtml(order, autoPrint = false) {
  const orderNum = order.orderNumber || order.id || order._id || 'SLM-12282';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const customerName = order.customerName || order.name || 'Valued Customer';
  const phone = order.phone || '+8801700000000';
  const deliveryAddress = order.shippingAddress || order.address || 'Standard Delivery Location';
  const deliveryAreaText = order.deliveryLocation?.upazilaName
    ? `${order.deliveryLocation.upazilaName}, ${order.deliveryLocation.districtName}`
    : '';

  const totalAmount = Number(order.totalAmount || 0);
  const shippingFee = Number(order.shippingFee || order.deliveryLocation?.deliveryFee || 0);
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
    {
      name: 'Custom Furniture Commission',
      quantity: 1,
      price: totalAmount > 0 ? totalAmount : 3500
    }
  ];

  const computedSubtotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity || 1);
    const prc = Number(it.product?.price || it.price || 0);
    return sum + (qty * prc);
  }, 0);

  const itemsSubtotal = computedSubtotal > 0 ? computedSubtotal : Math.max(0, totalAmount - shippingFee);

  const itemsRows = items.map((item, index) => {
    const itemName = item.product?.name || item.name || 'Furniture Item';
    const itemQty = Number(item.quantity || 1);
    const itemPrice = Number(item.product?.price || item.price || 0);
    const itemTotal = itemQty * itemPrice;
    const seq = String(index + 1).padStart(2, '0');

    return `
      <tr>
        <td style="padding: 14px 6px; font-size: 13px; font-weight: 600; color: #3A3732; vertical-align: top;">${seq}</td>
        <td style="padding: 14px 12px; font-size: 14px; font-weight: 700; color: #181614; line-height: 1.4; vertical-align: top;">${itemName}</td>
        <td style="padding: 14px 6px; font-size: 14px; font-weight: 600; text-align: center; color: #181614; vertical-align: top;">${itemQty}</td>
        <td style="padding: 14px 6px; font-size: 14px; font-weight: 600; text-align: right; color: #181614; vertical-align: top;">${itemPrice.toLocaleString()}</td>
        <td style="padding: 14px 6px; font-size: 14px; font-weight: 700; text-align: right; color: #181614; vertical-align: top;">${itemTotal.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const statusText = String(order.status || 'PLACED').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${orderNum} | ShahLajuk Furniture Mart</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #F5F3EC;
      color: #181614;
      padding: 32px 20px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .receipt-page {
      max-width: 780px;
      margin: 0 auto;
      background: #F5F3EC;
      padding: 40px 48px;
      position: relative;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
    }
    .store-brand-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #181614;
      margin-bottom: 4px;
    }
    .store-brand-sub {
      font-size: 12.5px;
      color: #55524C;
      line-height: 1.4;
    }
    .receipt-tag-box {
      border: 1px solid #181614;
      padding: 7px 18px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #181614;
      background: transparent;
    }
    .due-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #736E65;
      margin-bottom: 6px;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 12px;
    }
    .amount-display {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .currency-label {
      font-size: 18px;
      font-weight: 600;
      color: #181614;
    }
    .amount-number {
      font-size: 56px;
      font-weight: 800;
      line-height: 0.95;
      letter-spacing: -1.5px;
      color: #181614;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: #181614;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #96482B;
      display: inline-block;
    }
    .divider-strong {
      border: none;
      border-top: 1.5px solid #181614;
      margin: 26px 0 22px 0;
    }
    .meta-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 26px;
    }
    .meta-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 30px;
    }
    .col-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #736E65;
      margin-bottom: 5px;
    }
    .col-value-bold {
      font-size: 14px;
      font-weight: 700;
      color: #181614;
    }
    .col-value-lg {
      font-size: 18px;
      font-weight: 800;
      color: #181614;
      margin-bottom: 3px;
    }
    .col-subtext {
      font-size: 12.5px;
      color: #55524C;
    }
    .table-section-wrapper {
      position: relative;
      margin-top: 24px;
      min-height: 180px;
    }
    .watermark-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      max-width: 80%;
      opacity: 0.085;
      pointer-events: none;
      z-index: 0;
    }
    .receipt-items-table {
      position: relative;
      z-index: 1;
      width: 100%;
      border-collapse: collapse;
    }
    .receipt-items-table th {
      border-top: 1px solid #D8D4CA;
      border-bottom: 1px solid #D8D4CA;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #736E65;
      padding: 10px 6px;
    }
    .receipt-items-table td {
      border-bottom: 1px solid #E6E2D8;
    }
    .summary-container {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .summary-box {
      width: 320px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      margin-bottom: 6px;
      color: #55524C;
    }
    .summary-line .sum-val {
      font-weight: 600;
      color: #181614;
      text-align: right;
    }
    .grand-total-divider {
      border: none;
      border-top: 1.5px solid #181614;
      margin: 10px 0;
    }
    .grand-total-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-top: 4px;
    }
    .grand-total-label {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #181614;
    }
    .grand-total-val {
      font-size: 24px;
      font-weight: 800;
      color: #181614;
      letter-spacing: -0.5px;
    }
    .grand-total-val span {
      font-size: 14px;
      font-weight: 700;
      margin-right: 4px;
    }
    .footer-divider {
      border: none;
      border-top: 1px dashed #C8C4B8;
      margin-top: 44px;
      padding-top: 20px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-thanks {
      font-size: 13.5px;
      font-weight: 800;
      color: #181614;
      margin-bottom: 3px;
    }
    .footer-motto {
      font-size: 12px;
      color: #55524C;
    }
    .footer-order-id {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #736E65;
    }
    .print-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 28px;
    }
    .btn-print {
      background: #181614;
      color: #FFFFFF;
      border: none;
      padding: 10px 24px;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #333;
    }

    /* Print Specific Formatting */
    @page {
      size: A4 portrait;
      margin: 10mm 15mm;
    }
    @media print {
      body {
        background: #F5F3EC !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-page {
        width: 100% !important;
        max-width: 100% !important;
        padding: 16px 20px !important;
      }
      .no-print, .print-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-page">
    <!-- Top Header -->
    <div class="header-row">
      <div>
        <div class="store-brand-title">SHAHLAJUK FURNITURE MART</div>
        <div class="store-brand-sub">Trishal ,Mymensingh</div>
        <div class="store-brand-sub">Phone: +880 1609-335129</div>
      </div>
      <div>
        <div class="receipt-tag-box">ONLINE RECEIPT</div>
      </div>
    </div>

    <!-- Amount Due & Status -->
    <div>
      <div class="due-label">AMOUNT DUE ON DELIVERY</div>
      <div class="amount-row">
        <div class="amount-display">
          <span class="currency-label">BDT</span>
          <span class="amount-number">${totalAmount.toLocaleString()}</span>
        </div>
        <div class="status-badge">
          <span class="status-dot"></span>
          <span>${statusText}</span>
        </div>
      </div>
    </div>

    <hr class="divider-strong" />

    <!-- Metadata 3-Column -->
    <div class="meta-3col">
      <div>
        <div class="col-label">ORDER ID</div>
        <div class="col-value-bold">${orderNum}</div>
      </div>
      <div>
        <div class="col-label">ORDER DATE</div>
        <div class="col-value-bold">${orderDate}</div>
      </div>
      <div>
        <div class="col-label">PAYMENT</div>
        <div class="col-value-bold">${order.paymentMethod || 'Cash on Delivery'}</div>
        <div class="col-subtext">${order.trxId ? `TrxID: ${order.trxId}` : (order.isCustomOrder ? 'Custom order' : '')}</div>
      </div>
    </div>

    <!-- Customer & Delivery 2-Column -->
    <div class="meta-2col">
      <div>
        <div class="col-label">CUSTOMER</div>
        <div class="col-value-lg">${customerName}</div>
        <div class="col-subtext">${phone}</div>
      </div>
      <div>
        <div class="col-label">DELIVER TO</div>
        <div class="col-value-bold" style="line-height: 1.45;">${deliveryAddress}</div>
        ${deliveryAreaText ? `<div class="col-subtext" style="margin-top: 2px;">${deliveryAreaText}</div>` : ''}
      </div>
    </div>

    <!-- Items Section with Centered High-Resolution Watermark (Text Removed) -->
    <div class="table-section-wrapper">
      <img
        src="${WATERMARK_LOGO_BASE64}"
        alt="SLFM Watermark"
        class="watermark-overlay"
      />

      <table class="receipt-items-table">
        <thead>
          <tr>
            <th style="text-align: left; width: 45px;">NO.</th>
            <th style="text-align: left;">ITEM</th>
            <th style="text-align: center; width: 60px;">QTY</th>
            <th style="text-align: right; width: 100px;">UNIT</th>
            <th style="text-align: right; width: 100px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Financial Summary -->
    <div class="summary-container">
      <div class="summary-box">
        <div class="summary-line">
          <span>Items subtotal</span>
          <span class="sum-val">BDT ${itemsSubtotal.toLocaleString()}</span>
        </div>
        <div class="summary-line">
          <span>Delivery charge</span>
          <span class="sum-val">BDT ${shippingFee.toLocaleString()}</span>
        </div>
        <hr class="grand-total-divider" />
        <div class="grand-total-line">
          <span class="grand-total-label">GRAND TOTAL</span>
          <span class="grand-total-val"><span>BDT</span>${totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- Footer with Motto & Order ID -->
    <div class="footer-divider">
      <div class="footer-row">
        <div>
          <div class="footer-thanks">Thank you for your order.</div>
          <div class="footer-motto">Good furniture is the soul of a well-designed space.</div>
        </div>
        <div class="footer-order-id">
          ${orderNum}
        </div>
      </div>
    </div>

    <div class="print-actions no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
    </div>
  </div>

  ${autoPrint ? `
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        window.print();
      }, 300);
    });
  </script>
  ` : ''}
</body>
</html>`;
}
