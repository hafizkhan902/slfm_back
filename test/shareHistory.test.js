import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ShareHistory } from '../models/ShareHistory.js';
import {
  recordShare,
  getShareHistory,
  deleteShareItem,
  clearShareHistory
} from '../controllers/shareController.js';

describe('Product Link Sharing & Copy History Tests', () => {

  describe('1. ShareHistory Mongoose Schema & Validation', () => {
    it('should validate and create a valid share history document with defaults', () => {
      const doc = new ShareHistory({
        productId: 'prod-modern-sofa-101',
        productName: 'Minimalist Oak Sofa',
        sharedUrl: 'https://shahlajuk.com/?product=prod-modern-sofa-101'
      });

      const validationError = doc.validateSync();
      assert.equal(validationError, undefined, 'ShareHistory document should validate without errors');
      assert.equal(doc.productId, 'prod-modern-sofa-101');
      assert.equal(doc.productName, 'Minimalist Oak Sofa');
      assert.equal(doc.sharedUrl, 'https://shahlajuk.com/?product=prod-modern-sofa-101');
      assert.equal(doc.shareType, 'copy_link', 'Default shareType should be "copy_link"');
      assert.equal(doc.userName, 'Guest Customer', 'Default userName should be "Guest Customer"');
      assert.equal(doc.productPrice, 0, 'Default productPrice should be 0');
    });

    it('should reject documents missing required fields (productId, productName, sharedUrl)', () => {
      const doc = new ShareHistory({});
      const validationError = doc.validateSync();
      assert.ok(validationError, 'Document should fail validation');
      assert.ok(validationError.errors.productId, 'productId is required');
      assert.ok(validationError.errors.productName, 'productName is required');
      assert.ok(validationError.errors.sharedUrl, 'sharedUrl is required');
    });

    it('should reject invalid shareType enum values', () => {
      const doc = new ShareHistory({
        productId: 'p1',
        productName: 'Chair',
        sharedUrl: 'https://shahlajuk.com/?product=p1',
        shareType: 'invalid_share_platform'
      });

      const validationError = doc.validateSync();
      assert.ok(validationError, 'Document should fail enum validation');
      assert.ok(validationError.errors.shareType, 'shareType must match schema enum');
    });

    it('should accept supported shareType values (whatsapp, facebook, native_share, etc.)', () => {
      for (const st of ['copy_link', 'whatsapp', 'facebook', 'native_share', 'twitter', 'other']) {
        const doc = new ShareHistory({
          productId: 'p1',
          productName: 'Chair',
          sharedUrl: 'https://shahlajuk.com/?product=p1',
          shareType: st
        });
        const err = doc.validateSync();
        assert.equal(err, undefined, `shareType "${st}" should be valid`);
      }
    });
  });

  describe('2. Controller Logic: recordShare', () => {
    it('should return 400 when required fields are missing', async () => {
      const req = {
        body: { productId: 'p1' },
        headers: {},
        ip: '127.0.0.1'
      };
      let statusCode = 0;
      let jsonPayload = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (payload) => { jsonPayload = payload; }
          };
        }
      };

      await recordShare(req, res, () => {});
      assert.equal(statusCode, 400);
      assert.ok(jsonPayload.error);
    });

    it('should record a share event successfully with IP, device, and 201 status', async () => {
      const origCreate = ShareHistory.create;
      let createdDoc = null;
      ShareHistory.create = async (data) => {
        createdDoc = { _id: 'fake-share-id-123', ...data, createdAt: new Date() };
        return createdDoc;
      };

      try {
        const req = {
          body: {
            productId: 'dining-table-401',
            productName: 'Solid Teak Dining Table',
            productPrice: 48500,
            productImage: 'https://example.com/teak-table.jpg',
            category: 'Dining',
            room: 'Dining Room',
            sharedUrl: 'https://shahlajuk.com/?product=dining-table-401',
            shareType: 'whatsapp'
          },
          headers: {
            'x-forwarded-for': '103.145.10.2, 10.0.0.1',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
          },
          user: {
            _id: 'user-789',
            name: 'Hafizur Rahman',
            email: 'hafiz@shahlajuk.com',
            phone: '01712345678'
          }
        };

        let statusCode = 0;
        let responseJson = null;
        const res = {
          status: (code) => {
            statusCode = code;
            return {
              json: (data) => { responseJson = data; }
            };
          }
        };

        await recordShare(req, res, () => {});

        assert.equal(statusCode, 201);
        assert.equal(responseJson.success, true);
        assert.equal(createdDoc.productId, 'dining-table-401');
        assert.equal(createdDoc.productName, 'Solid Teak Dining Table');
        assert.equal(createdDoc.productPrice, 48500);
        assert.equal(createdDoc.shareType, 'whatsapp');
        assert.equal(createdDoc.ip, '103.145.10.2', 'Should correctly extract the first client IP');
        assert.equal(createdDoc.device, 'Mobile Device', 'Should detect mobile device from user agent');
        assert.equal(createdDoc.userName, 'Hafizur Rahman', 'Should prioritize authenticated user name');
        assert.equal(createdDoc.userEmail, 'hafiz@shahlajuk.com');
      } finally {
        ShareHistory.create = origCreate;
      }
    });
  });

  describe('3. Controller Logic: getShareHistory & Metrics Aggregation', () => {
    it('should aggregate metrics and return share list', async () => {
      const origFind = ShareHistory.find;
      const origCount = ShareHistory.countDocuments;
      const origDistinct = ShareHistory.distinct;
      const origAggregate = ShareHistory.aggregate;

      const mockShares = [
        {
          _id: 's1',
          productId: 'p101',
          productName: 'Oak Chair',
          shareType: 'copy_link',
          sharedUrl: 'https://shahlajuk.com/?product=p101',
          createdAt: new Date()
        },
        {
          _id: 's2',
          productId: 'p102',
          productName: 'Teak Bed',
          shareType: 'whatsapp',
          sharedUrl: 'https://shahlajuk.com/?product=p102',
          createdAt: new Date()
        }
      ];

      ShareHistory.find = () => ({
        sort: () => ({
          limit: async () => mockShares
        })
      });
      ShareHistory.countDocuments = async () => 2;
      ShareHistory.distinct = async () => ['p101', 'p102'];
      ShareHistory.aggregate = async () => [
        { _id: 'p101', productName: 'Oak Chair', count: 1 }
      ];

      try {
        const req = { query: { limit: '50' } };
        let responseJson = null;
        const res = {
          json: (data) => { responseJson = data; }
        };

        await getShareHistory(req, res, () => {});

        assert.equal(responseJson.success, true);
        assert.equal(responseJson.count, 2);
        assert.equal(responseJson.metrics.totalShares, 2);
        assert.equal(responseJson.metrics.uniqueProductsShared, 2);
        assert.equal(responseJson.metrics.topSharedProducts.length, 1);
        assert.equal(responseJson.shares.length, 2);
      } finally {
        ShareHistory.find = origFind;
        ShareHistory.countDocuments = origCount;
        ShareHistory.distinct = origDistinct;
        ShareHistory.aggregate = origAggregate;
      }
    });
  });

  describe('4. Controller Logic: deleteShareItem & clearShareHistory', () => {
    it('should delete a single item or return 404 if item does not exist', async () => {
      const origFindByIdAndDelete = ShareHistory.findByIdAndDelete;

      ShareHistory.findByIdAndDelete = async (id) => {
        if (id === 'existing-id') return { _id: 'existing-id' };
        return null;
      };

      try {
        // Test 404 when item not found
        let status404 = 0;
        let payload404 = null;
        await deleteShareItem(
          { params: { id: 'non-existing' } },
          {
            status: (code) => {
              status404 = code;
              return { json: (p) => { payload404 = p; } };
            }
          },
          () => {}
        );
        assert.equal(status404, 404);
        assert.ok(payload404.error);

        // Test success
        let payload200 = null;
        await deleteShareItem(
          { params: { id: 'existing-id' } },
          {
            json: (p) => { payload200 = p; }
          },
          () => {}
        );
        assert.equal(payload200.success, true);
      } finally {
        ShareHistory.findByIdAndDelete = origFindByIdAndDelete;
      }
    });

    it('should clear all history records and return deleted count', async () => {
      const origDeleteMany = ShareHistory.deleteMany;
      ShareHistory.deleteMany = async () => ({ deletedCount: 15 });

      try {
        let payload = null;
        await clearShareHistory(
          {},
          {
            json: (p) => { payload = p; }
          },
          () => {}
        );
        assert.equal(payload.success, true);
        assert.match(payload.message, /15 records deleted/);
      } finally {
        ShareHistory.deleteMany = origDeleteMany;
      }
    });
  });

});
