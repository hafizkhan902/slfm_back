import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates official ShahLajuk Furniture Mart PDF receipt matching the redesigned layout.
 *
 * @param {Object} order - Order object from MongoDB
 * @param {Object} res - Express response stream
 */
export const generateOrderReceiptPDF = (order, res) => {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    info: {
      Title: `Order Receipt - ${order.orderNumber || order.id || 'Order'}`,
      Author: 'ShahLajuk Furniture Mart',
      Subject: 'Official Purchase Invoice & Order Receipt'
    }
  });

  const orderNum = order.orderNumber || order.id || 'SLM-12282';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Stream headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Receipt-${orderNum}.pdf"`);

  doc.pipe(res);

  // Background Fill (Warm Linen #F5F3EC)
  doc.rect(0, 0, 595.28, 841.89).fill('#F5F3EC');

  // Palette
  const DARK = '#181614';
  const MUTED = '#736E65';
  const SUBTEXT = '#55524C';
  const BORDER_COLOR = '#D8D4CA';

  // 1. Top Header
  doc
    .fillColor(DARK)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('SHAHLAJUK FURNITURE MART', 45, 45);

  doc
    .fillColor(SUBTEXT)
    .fontSize(8.5)
    .font('Helvetica')
    .text('Trishal ,Mymensingh', 45, 62)
    .text('Phone: +880 1609-335129', 45, 74);

  // Online Receipt Tag
  doc.rect(435, 45, 115, 22).strokeColor(DARK).lineWidth(1).stroke();
  doc
    .fillColor(DARK)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text('ONLINE RECEIPT', 435, 52, { width: 115, align: 'center', characterSpacing: 1 });

  // 2. Amount Due & Status
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

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('AMOUNT DUE ON DELIVERY', 45, 115, { characterSpacing: 1 });

  // BDT + Huge Amount
  doc
    .fillColor(DARK)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('BDT', 45, 142);

  doc
    .fontSize(38)
    .font('Helvetica-Bold')
    .text(totalAmount.toLocaleString(), 76, 126);

  // Status (bullet + text)
  const statusText = String(order.status || 'PLACED').toUpperCase();
  doc.circle(460, 148, 3.5).fill('#96482B');
  doc
    .fillColor(DARK)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(statusText, 470, 144, { characterSpacing: 1.2 });

  // Divider Line
  doc.rect(45, 178, 505, 1.2).fill(DARK);

  // 3. Metadata 3 Columns
  const yMeta = 194;
  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('ORDER ID', 45, yMeta, { characterSpacing: 1 })
    .fillColor(DARK)
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(orderNum, 45, yMeta + 12);

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('ORDER DATE', 215, yMeta, { characterSpacing: 1 })
    .fillColor(DARK)
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(orderDate, 215, yMeta + 12);

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('PAYMENT', 385, yMeta, { characterSpacing: 1 })
    .fillColor(DARK)
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(order.paymentMethod || 'Cash on Delivery', 385, yMeta + 12);

  if (order.trxId || order.isCustomOrder) {
    doc
      .fillColor(SUBTEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(order.trxId ? `TrxID: ${order.trxId}` : 'Custom order', 385, yMeta + 25);
  }

  // 4. Customer & Delivery 2 Columns
  const yCust = 244;
  const customerName = order.customerName || order.name || 'Valued Customer';
  const phone = order.phone || '+8801700000000';
  const deliveryAddress = order.shippingAddress || order.address || 'Standard Delivery Location';

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('CUSTOMER', 45, yCust, { characterSpacing: 1 })
    .fillColor(DARK)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(customerName, 45, yCust + 12)
    .fillColor(SUBTEXT)
    .fontSize(8.5)
    .font('Helvetica')
    .text(phone, 45, yCust + 27);

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('DELIVER TO', 285, yCust, { characterSpacing: 1 })
    .fillColor(DARK)
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(deliveryAddress, 285, yCust + 12, { width: 265, lineGap: 2 });

  // 5. Watermark Logo (Centered, text removed, high-resolution)
  const watermarkPath = path.join(__dirname, 'watermark-logo.png');
  if (fs.existsSync(watermarkPath)) {
    try {
      doc.save();
      doc.opacity(0.08);
      doc.image(watermarkPath, 145, 340, { width: 300 });
      doc.restore();
    } catch (err) {
      console.warn('PDFKit watermark image render warning:', err.message);
    }
  }

  // 6. Items Table
  const yTable = 330;
  doc.rect(45, yTable, 505, 1).fill(BORDER_COLOR);
  doc.rect(45, yTable + 20, 505, 1).fill(BORDER_COLOR);

  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text('NO.', 48, yTable + 6)
    .text('ITEM', 80, yTable + 6)
    .text('QTY', 340, yTable + 6, { width: 40, align: 'center' })
    .text('UNIT', 400, yTable + 6, { width: 65, align: 'right' })
    .text('TOTAL', 485, yTable + 6, { width: 65, align: 'right' });

  let yRow = yTable + 28;
  items.forEach((item, index) => {
    const itemName = item.product?.name || item.name || 'Furniture Item';
    const itemQty = Number(item.quantity || 1);
    const itemPrice = Number(item.product?.price || item.price || 0);
    const itemTotal = itemQty * itemPrice;
    const seq = String(index + 1).padStart(2, '0');

    doc
      .fillColor(SUBTEXT)
      .fontSize(8.5)
      .font('Helvetica')
      .text(seq, 48, yRow);

    doc
      .fillColor(DARK)
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(itemName, 80, yRow, { width: 240, lineGap: 2 });

    doc
      .fillColor(DARK)
      .fontSize(9)
      .font('Helvetica')
      .text(String(itemQty), 340, yRow, { width: 40, align: 'center' })
      .text(itemPrice.toLocaleString(), 400, yRow, { width: 65, align: 'right' })
      .font('Helvetica-Bold')
      .text(itemTotal.toLocaleString(), 485, yRow, { width: 65, align: 'right' });

    yRow += 28;
    doc.rect(45, yRow - 6, 505, 0.5).fill('#E6E2D8');
  });

  // 7. Financial Summary (Right-aligned)
  const ySum = Math.max(yRow + 10, 480);
  const xSumLabel = 320;
  const xSumVal = 460;
  const wSumVal = 90;

  doc
    .fillColor(SUBTEXT)
    .fontSize(8.5)
    .font('Helvetica')
    .text('Items subtotal', xSumLabel, ySum)
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .text(`BDT  ${itemsSubtotal.toLocaleString()}`, xSumVal, ySum, { width: wSumVal, align: 'right' });

  doc
    .fillColor(SUBTEXT)
    .fontSize(8.5)
    .font('Helvetica')
    .text('Delivery charge', xSumLabel, ySum + 16)
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .text(`BDT  ${shippingFee.toLocaleString()}`, xSumVal, ySum + 16, { width: wSumVal, align: 'right' });

  doc.rect(xSumLabel, ySum + 33, 230, 1.2).fill(DARK);

  doc
    .fillColor(DARK)
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text('GRAND TOTAL', xSumLabel, ySum + 42, { characterSpacing: 1 })
    .fontSize(14)
    .text(`BDT  ${totalAmount.toLocaleString()}`, xSumVal - 30, ySum + 39, { width: wSumVal + 30, align: 'right' });

  // 8. Footer (Single-Page Fit)
  const yFoot = 735;
  doc
    .save()
    .strokeColor('#C8C4B8')
    .lineWidth(0.8)
    .dash(3, { space: 3 })
    .moveTo(45, yFoot)
    .lineTo(550, yFoot)
    .stroke()
    .undash()
    .restore();

  doc
    .fillColor(DARK)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('Thank you for your order.', 45, yFoot + 14);

  doc
    .fillColor(SUBTEXT)
    .fontSize(8)
    .font('Helvetica')
    .text('Good furniture is the soul of a well-designed space.', 45, yFoot + 27);

  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(orderNum, 470, yFoot + 27, { width: 80, align: 'right' });

  doc.end();
};
