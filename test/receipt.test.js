import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateServerReceiptHtml } from '../utils/htmlReceiptGenerator.js';
import { renderOrderReceiptHTML } from '../controllers/orderController.js';
import { Order } from '../models/Order.js';

describe('Server-Side Rendered (SSR) HTML Receipt Tests', () => {

  const sampleOrder = {
    _id: '671abc1234567890abcdef12',
    orderNumber: 'SLM-98421',
    createdAt: new Date('2026-10-20T10:00:00Z'),
    status: 'Confirmed',
    customerName: 'Arafat Hossain',
    phone: '01712345678',
    shippingAddress: 'House 14, Road 5, Block B, Banani',
    deliveryLocation: {
      upazilaName: 'Trishal',
      districtName: 'Mymensingh',
      divisionName: 'Mymensingh',
      deliveryFee: 150
    },
    paymentMethod: 'bKash (MFS)',
    trxId: 'BKASH987654',
    shippingFee: 150,
    totalAmount: 32650,
    items: [
      {
        product: {
          name: 'Solid Teak Bed',
          price: 28000
        },
        quantity: 1
      },
      {
        product: {
          name: 'Oak Side Table',
          price: 4500
        },
        quantity: 1
      }
    ]
  };

  describe('1. HTML Receipt Generator', () => {
    it('should generate complete HTML document with correct metadata and branding', () => {
      const html = generateServerReceiptHtml(sampleOrder);

      assert.ok(html.includes('<!DOCTYPE html>'), 'Should contain HTML doctype');
      assert.ok(html.includes('SHAHLAJUK FURNITURE MART'), 'Should contain company name');
      assert.ok(html.includes('SLM-98421'), 'Should contain order number');
      assert.ok(html.includes('Arafat Hossain'), 'Should contain customer name');
      assert.ok(html.includes('01712345678'), 'Should contain customer phone');
      assert.ok(html.includes('House 14, Road 5'), 'Should contain shipping address');
      assert.ok(html.includes('Trishal, Mymensingh'), 'Should contain delivery region');
      assert.ok(html.includes('bKash (MFS)'), 'Should contain payment method');
      assert.ok(html.includes('BKASH987654'), 'Should contain transaction ID');
      assert.ok(html.includes('Solid Teak Bed'), 'Should contain first product name');
      assert.ok(html.includes('Oak Side Table'), 'Should contain second product name');
      assert.ok(html.includes('32,650'), 'Should contain formatted total amount');
      assert.ok(html.includes('@media print'), 'Should include print media styles');
    });

    it('should inject auto-print script when autoPrint is true', () => {
      const htmlWithAutoPrint = generateServerReceiptHtml(sampleOrder, true);
      assert.ok(htmlWithAutoPrint.includes('window.print()'), 'Should contain window.print() call');

      const htmlWithoutAutoPrint = generateServerReceiptHtml(sampleOrder, false);
      assert.ok(!htmlWithoutAutoPrint.includes('window.addEventListener(\'DOMContentLoaded\', function() {\n      setTimeout(function() {\n        window.print();'), 'Should not auto-trigger window.print');
    });
  });

  describe('2. Controller Logic: renderOrderReceiptHTML', () => {
    it('should return 404 HTML when order is not found', async () => {
      const origFindOne = Order.findOne;
      Order.findOne = async () => null;

      try {
        let statusCode = 0;
        let responseBody = '';
        const req = {
          params: { orderNumber: 'NON-EXISTENT-ORDER' },
          query: {}
        };
        const res = {
          status: (code) => {
            statusCode = code;
            return {
              send: (body) => { responseBody = body; }
            };
          }
        };

        await renderOrderReceiptHTML(req, res, () => {});
        assert.equal(statusCode, 404);
        assert.ok(responseBody.includes('Order Not Found'));
      } finally {
        Order.findOne = origFindOne;
      }
    });

    it('should return 200 and text/html when order is found', async () => {
      const origFindOne = Order.findOne;
      Order.findOne = async () => sampleOrder;

      try {
        let contentType = '';
        let responseBody = '';
        const req = {
          params: { orderNumber: 'SLM-98421' },
          query: { print: 'true' }
        };
        const res = {
          setHeader: (name, val) => {
            if (name.toLowerCase() === 'content-type') contentType = val;
          },
          send: (body) => { responseBody = body; }
        };

        await renderOrderReceiptHTML(req, res, () => {});
        assert.ok(contentType.includes('text/html'), 'Content-Type should be text/html');
        assert.ok(responseBody.includes('SLM-98421'), 'Response should contain order details');
        assert.ok(responseBody.includes('window.print()'), 'Response should include autoPrint script when requested');
      } finally {
        Order.findOne = origFindOne;
      }
    });
  });

});
