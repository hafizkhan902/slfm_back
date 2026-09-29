import PDFDocument from 'pdfkit';

/**
 * Generates a clean, professional PDF order receipt using PDFKit
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

  const orderNum = order.orderNumber || order.id || 'SLM-ORDER';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Stream headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Receipt-${orderNum}.pdf"`);

  doc.pipe(res);

  // Primary Color Palette
  const WALNUT = '#4A2C19';
  const GOLD = '#C9A876';
  const TEXT_DARK = '#231D18';
  const TEXT_MUTED = '#666666';
  const BG_LIGHT = '#F8F6F2';

  // 1. Header Banner
  doc.rect(40, 40, 515, 65).fill(WALNUT);

  doc
    .fillColor('#FFFFFF')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('SHAHLAJUK FURNITURE MART', 55, 52);

  doc
    .fillColor(GOLD)
    .fontSize(9)
    .font('Helvetica')
    .text('Artisanal Timber & Modern Interior Design', 55, 78);

  doc
    .fillColor('#FFFFFF')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('OFFICIAL RECEIPT', 400, 62, { align: 'right', width: 140 });

  // 2. Receipt & Order Metadata Box
  doc.rect(40, 115, 515, 65).fill(BG_LIGHT);

  doc
    .fillColor(TEXT_DARK)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Order ID: `, 55, 127)
    .font('Helvetica')
    .text(orderNum, 110, 127);

  doc
    .font('Helvetica-Bold')
    .text(`Order Date: `, 55, 143)
    .font('Helvetica')
    .text(orderDate, 120, 143);

  doc
    .font('Helvetica-Bold')
    .text(`Order Status: `, 55, 159)
    .font('Helvetica-Bold')
    .fillColor(order.status === 'Delivered' || order.status === 'Confirmed' ? '#2e7d32' : WALNUT)
    .text(order.status || 'Placed', 130, 159);

  // Right Metadata
  doc
    .fillColor(TEXT_DARK)
    .font('Helvetica-Bold')
    .text(`Payment Method: `, 300, 127)
    .font('Helvetica')
    .text(order.paymentMethod || 'Cash on Delivery (COD)', 400, 127);

  if (order.trxId) {
    doc
      .font('Helvetica-Bold')
      .text(`TrxID: `, 300, 143)
      .font('Helvetica')
      .text(order.trxId, 345, 143);
  }

  // 3. Customer & Shipping Info Box
  doc.rect(40, 190, 515, 75).strokeColor('#E0D6C8').stroke();

  doc
    .fillColor(WALNUT)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('CUSTOMER & DELIVERY DETAILS', 55, 202);

  doc
    .fillColor(TEXT_DARK)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Customer Name:', 55, 222)
    .font('Helvetica')
    .text(order.name || 'Valued Customer', 145, 222);

  doc
    .font('Helvetica-Bold')
    .text('Phone Number:', 55, 237)
    .font('Helvetica')
    .text(order.phone || 'N/A', 145, 237);

  doc
    .font('Helvetica-Bold')
    .text('Delivery Address:', 300, 222)
    .font('Helvetica')
    .text(order.address || 'Standard Delivery Location', 390, 222, { width: 155 });

  // 4. Itemized Order Table Header
  const tableTop = 280;
  doc.rect(40, tableTop, 515, 24).fill(WALNUT);

  doc
    .fillColor('#FFFFFF')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('SL', 50, tableTop + 7)
    .text('ITEM OVERVIEW', 80, tableTop + 7)
    .text('QTY', 330, tableTop + 7, { width: 40, align: 'center' })
    .text('UNIT PRICE', 380, tableTop + 7, { width: 75, align: 'right' })
    .text('TOTAL', 465, tableTop + 7, { width: 75, align: 'right' });

  // Items Rows
  let yPosition = tableTop + 24;
  const items = Array.isArray(order.items) ? order.items : [];

  items.forEach((item, index) => {
    const itemName = item.product?.name || item.name || 'Furniture Item';
    const itemQty = item.quantity || 1;
    const itemPrice = item.product?.price || item.price || 0;
    const itemTotal = itemQty * itemPrice;

    // Row zebra background
    if (index % 2 === 0) {
      doc.rect(40, yPosition, 515, 24).fill('#FAF8F5');
    }

    doc
      .fillColor(TEXT_DARK)
      .fontSize(9)
      .font('Helvetica')
      .text(`${index + 1}`, 50, yPosition + 7)
      .text(itemName, 80, yPosition + 7, { width: 240 })
      .text(`${itemQty}`, 330, yPosition + 7, { width: 40, align: 'center' })
      .text(`BDT ${itemPrice.toLocaleString()}`, 380, yPosition + 7, { width: 75, align: 'right' })
      .font('Helvetica-Bold')
      .text(`BDT ${itemTotal.toLocaleString()}`, 465, yPosition + 7, { width: 75, align: 'right' });

    yPosition += 24;
  });

  // Table Bottom Border
  doc.rect(40, yPosition, 515, 1).fill('#D7D0C0');
  yPosition += 10;

  // 5. Total Summary Box
  const totalAmount = order.totalAmount || 0;

  doc.rect(330, yPosition, 225, 40).fill(BG_LIGHT).strokeColor('#E0D6C8').stroke();

  doc
    .fillColor(TEXT_DARK)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('GRAND TOTAL:', 340, yPosition + 13);

  doc
    .fillColor(WALNUT)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(`BDT ${totalAmount.toLocaleString()}`, 430, yPosition + 12, { width: 115, align: 'right' });

  // 6. Footer Notes
  const footerY = 740;

  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#D7D0C0').stroke();

  doc
    .fillColor(TEXT_DARK)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('Thank you for choosing ShahLajuk Furniture Mart!', 40, footerY + 10, { align: 'center', width: 515 });

  doc
    .fillColor(TEXT_MUTED)
    .fontSize(8)
    .font('Helvetica')
    .text('For queries or delivery tracking, contact our customer hotline or visit our Banani showroom.', 40, footerY + 24, { align: 'center', width: 515 });

  doc
    .fillColor(TEXT_MUTED)
    .fontSize(7)
    .text(`Computer generated receipt — ${new Date().toISOString()}`, 40, footerY + 38, { align: 'center', width: 515 });

  // Finalize PDF
  doc.end();
};
