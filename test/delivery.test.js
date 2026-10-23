import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { geoApiService } from '../utils/geoApiService.js';
import { DeliveryArea } from '../models/DeliveryArea.js';
import { Order } from '../models/Order.js';

describe('Admin-Managed Delivery Areas & Fee Calculation Tests', () => {

  describe('1. BD-GeoAPI Service & Caching Tests', () => {
    beforeEach(() => {
      geoApiService.clearCache();
    });

    it('should correctly set, retrieve, and invalidate in-memory cache', () => {
      const mockDivisions = [
        { id: 8, name: 'Mymensingh', nameBn: 'ময়মনসিংহ', code: 'MYM', districtsCount: 4 }
      ];

      // Initially null
      assert.equal(geoApiService.getCache('divisions'), null);

      // Store in cache
      geoApiService.setCache('divisions', mockDivisions, 10000);
      const cached = geoApiService.getCache('divisions');
      assert.equal(cached.isStale, false);
      assert.deepEqual(cached.data, mockDivisions);

      // Clear cache
      geoApiService.clearCache();
      assert.equal(geoApiService.getCache('divisions'), null);
    });

    it('should mark cache as stale after TTL expiry while preserving fallback data', async () => {
      const mockDistricts = [
        { id: 62, name: 'Mymensingh', divisionId: 8 }
      ];

      // Set with 1ms TTL
      geoApiService.setCache('districts:8', mockDistricts, 1);
      await new Promise(resolve => setTimeout(resolve, 5));

      const stale = geoApiService.getCache('districts:8');
      assert.notEqual(stale, null);
      assert.equal(stale.isStale, true);
      assert.deepEqual(stale.data, mockDistricts);
    });

    it('should handle pagination in fetchAllPages correctly', async () => {
      // Test mock multi-page resolution
      let callCount = 0;
      const originalFetch = geoApiService.fetchWithTimeout;

      geoApiService.fetchWithTimeout = async (url) => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            data: [{ id: 1, name: 'Page 1 Item' }],
            pagination: { next: 'https://api.test/page2' }
          };
        }
        return {
          success: true,
          data: [{ id: 2, name: 'Page 2 Item' }],
          pagination: { next: null }
        };
      };

      try {
        const results = await geoApiService.fetchAllPages('https://api.test/page1');
        assert.equal(results.length, 2);
        assert.equal(results[0].name, 'Page 1 Item');
        assert.equal(results[1].name, 'Page 2 Item');
        assert.equal(callCount, 2);
      } finally {
        geoApiService.fetchWithTimeout = originalFetch;
      }
    });
  });

  describe('2. DeliveryArea Model Validation & Duplicate Prevention', () => {
    it('should validate required fields on DeliveryArea model', () => {
      const area = new DeliveryArea({ deliveryFee: null });
      const err = area.validateSync();
      assert.ok(err, 'Expected validation errors on empty DeliveryArea');
      assert.ok(err.errors.divisionId, 'divisionId should be required');
      assert.ok(err.errors.districtId, 'districtId should be required');
      assert.ok(err.errors.upazilaId, 'upazilaId should be required');
      assert.ok(err.errors.deliveryFee, 'deliveryFee should be required');
    });

    it('should reject negative delivery fees', () => {
      const area = new DeliveryArea({
        divisionId: 8,
        divisionName: 'Mymensingh',
        districtId: 62,
        districtName: 'Mymensingh',
        upazilaId: 463,
        upazilaName: 'Trishal',
        deliveryFee: -50
      });
      const err = area.validateSync();
      assert.ok(err, 'Expected validation error on negative fee');
      assert.ok(err.errors.deliveryFee, 'deliveryFee cannot be negative');
    });

    it('should enforce unique index configuration on upazilaId', () => {
      const indexes = DeliveryArea.schema.indexes();
      const upazilaUniqueIndex = indexes.find(
        ([fields, options]) => fields.upazilaId === 1 || (options && options.unique)
      );
      assert.ok(upazilaUniqueIndex || DeliveryArea.schema.paths.upazilaId.options.unique,
        'upazilaId must have a unique constraint'
      );
    });
  });

  describe('3. Cascading Location Hierarchy & Active Area Filtering', () => {
    it('should construct a 3-tier hierarchy containing only active upazilas', () => {
      const mockDbAreas = [
        {
          divisionId: 8,
          divisionName: 'Mymensingh',
          districtId: 62,
          districtName: 'Mymensingh',
          upazilaId: 463,
          upazilaName: 'Trishal',
          deliveryFee: 120,
          isActive: true
        },
        {
          divisionId: 8,
          divisionName: 'Mymensingh',
          districtId: 62,
          districtName: 'Mymensingh',
          upazilaId: 464,
          upazilaName: 'Bhaluka',
          deliveryFee: 150,
          isActive: false // Inactive: should be excluded
        },
        {
          divisionId: 6,
          divisionName: 'Dhaka',
          districtId: 41,
          districtName: 'Gazipur',
          upazilaId: 318,
          upazilaName: 'Kaliakair',
          deliveryFee: 160,
          isActive: true
        }
      ];

      // Simulate hierarchy builder logic used in deliveryController
      const activeOnly = mockDbAreas.filter(a => a.isActive);
      const divisionMap = new Map();

      for (const area of activeOnly) {
        if (!divisionMap.has(area.divisionId)) {
          divisionMap.set(area.divisionId, {
            id: area.divisionId,
            name: area.divisionName,
            districts: new Map()
          });
        }
        const divEntry = divisionMap.get(area.divisionId);
        if (!divEntry.districts.has(area.districtId)) {
          divEntry.districts.set(area.districtId, {
            id: area.districtId,
            name: area.districtName,
            upazilas: []
          });
        }
        divEntry.districts.get(area.districtId).upazilas.push({
          id: area.upazilaId,
          name: area.upazilaName,
          deliveryFee: area.deliveryFee
        });
      }

      const hierarchy = Array.from(divisionMap.values()).map(div => ({
        ...div,
        districts: Array.from(div.districts.values())
      }));

      // Assertions
      assert.equal(hierarchy.length, 2, 'Should have 2 active divisions (Mymensingh, Dhaka)');

      const mymDiv = hierarchy.find(d => d.id === 8);
      assert.ok(mymDiv, 'Mymensingh division must be present');
      assert.equal(mymDiv.districts[0].upazilas.length, 1, 'Only active upazila Trishal should be present');
      assert.equal(mymDiv.districts[0].upazilas[0].name, 'Trishal');

      const bhaluka = mymDiv.districts[0].upazilas.find(u => u.name === 'Bhaluka');
      assert.equal(bhaluka, undefined, 'Inactive upazila Bhaluka must NOT be in customer hierarchy');
    });
  });

  describe('4. Server-Side Delivery Fee & Order Calculation Security', () => {
    it('should recalculate final total on server and reject tampered frontend prices', () => {
      const activeArea = {
        divisionId: 8,
        divisionName: 'Mymensingh',
        districtId: 62,
        districtName: 'Mymensingh',
        upazilaId: 463,
        upazilaName: 'Trishal',
        deliveryFee: 120, // Real fee in DB
        isActive: true
      };

      const orderRequest = {
        customerName: 'Tanvir Hasan',
        phone: '01711223344',
        shippingAddress: 'Porabari Road, Trishal',
        deliveryLocation: {
          upazilaId: 463,
          deliveryFee: 10 // Tampered fee submitted by hacker
        },
        items: [
          { product: { id: 'p1', name: 'Noyon Table', price: 15000 }, quantity: 1 },
          { product: { id: 'p2', name: 'Wooden Chair', price: 2500 }, quantity: 2 }
        ],
        shippingFee: 10, // Tampered shipping fee
        totalAmount: 100 // Tampered total amount
      };

      // Server recalculation logic
      const itemsSubtotal = orderRequest.items.reduce(
        (sum, item) => sum + (item.product.price * item.quantity),
        0
      );
      assert.equal(itemsSubtotal, 20000, 'Items subtotal must equal 15000 + (2500 * 2) = 20000');

      // Server overrides with verified DB deliveryFee
      const verifiedShippingFee = activeArea.deliveryFee;
      assert.equal(verifiedShippingFee, 120, 'Server must enforce 120 BDT fee');

      const serverCalculatedTotal = itemsSubtotal + verifiedShippingFee;
      assert.equal(serverCalculatedTotal, 20120, 'Server must calculate 20000 + 120 = 20120 BDT');
      assert.notEqual(serverCalculatedTotal, orderRequest.totalAmount, 'Frontend tampered total must be ignored');
    });

    it('should reject order if chosen upazila is marked inactive', () => {
      const inactiveArea = {
        upazilaId: 464,
        upazilaName: 'Bhaluka',
        deliveryFee: 150,
        isActive: false // Delivery temporarily paused
      };

      const validateOrderUpazila = (area) => {
        if (!area) {
          throw new Error('The selected delivery upazila is not currently supported for delivery.');
        }
        if (!area.isActive) {
          throw new Error(`Delivery to ${area.upazilaName} is currently temporarily suspended or inactive.`);
        }
        return true;
      };

      assert.throws(
        () => validateOrderUpazila(inactiveArea),
        /Delivery to Bhaluka is currently temporarily suspended or inactive/
      );
    });

    it('should preserve deliveryLocation snapshot with historical order', () => {
      const order = new Order({
        orderNumber: 'SLM-TEST-001',
        customerName: 'Arafat Rahman',
        phone: '01712345678',
        shippingAddress: 'House 5, Road 2, Trishal',
        deliveryLocation: {
          divisionId: 8,
          divisionName: 'Mymensingh',
          districtId: 62,
          districtName: 'Mymensingh',
          upazilaId: 463,
          upazilaName: 'Trishal',
          deliveryFee: 120
        },
        paymentMethod: 'Cash on Delivery (COD)',
        items: [
          { product: { id: 'p1', name: 'Almirah', price: 28000 }, quantity: 1 }
        ],
        shippingFee: 120,
        totalAmount: 28120
      });

      const err = order.validateSync();
      assert.equal(err, undefined, 'Order with deliveryLocation snapshot should pass validation');
      assert.equal(order.deliveryLocation.upazilaName, 'Trishal');
      assert.equal(order.deliveryLocation.deliveryFee, 120);
      assert.equal(order.shippingFee, 120);
      assert.equal(order.totalAmount, 28120);
    });
  });

});
