import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { CustomInquiry } from '../models/CustomInquiry.js';
import { Order } from '../models/Order.js';
import { createCustomInquiry, confirmInquiryToOrder, updateInquiryStatus } from '../controllers/inquiryController.js';
import { updateOrderStatus } from '../controllers/orderController.js';

describe('Custom Furniture Inquiry & Reference Upload Tests', () => {

  describe('1. CustomInquiry Mongoose Schema Validation', () => {

    it('should validate and create a valid custom inquiry document with default status "Pending Review"', () => {
      const validData = {
        productType: 'Scandinavian Minimalist Dining Table',
        dimensions: {
          height: 30,
          width: 72,
          depth: 36,
          unit: 'inch'
        },
        materials: {
          woodType: 'Solid Chittagong Teak',
          finish: 'Natural Matte',
          hardware: 'Concealed Steel Brackets'
        },
        customDetails: {
          description: 'Beveled chamfer edge on tabletop, tapered solid legs, wire management channel underneath.',
          referenceImages: [
            'https://res.cloudinary.com/shahlajuk/image/upload/v1/ref1.jpg',
            'https://res.cloudinary.com/shahlajuk/image/upload/v1/ref2.jpg'
          ]
        },
        customerName: 'Sarah Khan',
        phone: '01712345678',
        email: 'sarah@example.com'
      };

      const doc = new CustomInquiry(validData);
      const validationError = doc.validateSync();

      assert.equal(validationError, undefined, 'Valid inquiry should not produce validation errors');
      assert.equal(doc.status, 'Pending Review', 'Default status should be "Pending Review"');
      assert.equal(doc.dimensions.unit, 'inch');
      assert.equal(doc.dimensions.height, 30);
      assert.equal(doc.materials.woodType, 'Solid Chittagong Teak');
      assert.equal(doc.customDetails.referenceImages.length, 2);
    });

    it('should support "cm" as a valid dimension unit', () => {
      const doc = new CustomInquiry({
        productType: 'Japandi Low Platform Bed',
        dimensions: {
          height: 45,
          width: 180,
          depth: 200,
          unit: 'cm'
        }
      });

      const validationError = doc.validateSync();
      assert.equal(validationError, undefined);
      assert.equal(doc.dimensions.unit, 'cm');
    });

    it('should reject invalid dimension units', () => {
      const doc = new CustomInquiry({
        productType: 'Bookshelf',
        dimensions: {
          height: 200,
          width: 100,
          depth: 35,
          unit: 'meter' // Invalid unit
        }
      });

      const validationError = doc.validateSync();
      assert.ok(validationError);
      assert.ok(validationError.errors['dimensions.unit']);
    });

    it('should reject missing productType or dimensions', () => {
      const doc = new CustomInquiry({
        // productType missing
        dimensions: {
          height: 30,
          width: 60
          // depth missing
        }
      });

      const validationError = doc.validateSync();
      assert.ok(validationError);
      assert.ok(validationError.errors.productType);
      assert.ok(validationError.errors['dimensions.depth']);
    });

    it('should reject non-positive dimensions', () => {
      const doc = new CustomInquiry({
        productType: 'Coffee Table',
        dimensions: {
          height: -5,
          width: 0,
          depth: 20,
          unit: 'inch'
        }
      });

      const validationError = doc.validateSync();
      assert.ok(validationError);
      assert.ok(validationError.errors['dimensions.height']);
      assert.ok(validationError.errors['dimensions.width']);
    });

    it('should reject descriptions exceeding 1000 characters', () => {
      const longDescription = 'A'.repeat(1005);
      const doc = new CustomInquiry({
        productType: 'Custom Wardrobe',
        dimensions: { height: 80, width: 60, depth: 24, unit: 'inch' },
        customDetails: {
          description: longDescription
        }
      });

      const validationError = doc.validateSync();
      assert.ok(validationError);
      assert.ok(validationError.errors['customDetails.description']);
    });

    it('should enforce status enum values strictly', () => {
      const validStatuses = ['Pending Review', 'Contacted', 'Confirmed', 'Cancelled'];

      for (const st of validStatuses) {
        const doc = new CustomInquiry({
          productType: 'Sofa',
          dimensions: { height: 32, width: 84, depth: 36, unit: 'inch' },
          status: st
        });
        const err = doc.validateSync();
        assert.equal(err, undefined, `Status "${st}" should be accepted`);
      }

      // Invalid status
      const invalidDoc = new CustomInquiry({
        productType: 'Sofa',
        dimensions: { height: 32, width: 84, depth: 36, unit: 'inch' },
        status: 'In Progress' // Not in enum
      });
      const invalidErr = invalidDoc.validateSync();
      assert.ok(invalidErr);
      assert.ok(invalidErr.errors.status);
    });

    it('CRITICAL CONSTRAINT: Model must NOT include pricing fields', () => {
      const schemaPaths = Object.keys(CustomInquiry.schema.paths);
      assert.equal(schemaPaths.includes('price'), false, 'Schema must not have a "price" field');
      assert.equal(schemaPaths.includes('totalPrice'), false, 'Schema must not have a "totalPrice" field');
      assert.equal(schemaPaths.includes('estimatedPrice'), false, 'Schema must not have an "estimatedPrice" field');
      assert.equal(schemaPaths.includes('pricing'), false, 'Schema must not have a "pricing" field');
    });

  });

  describe('2. Payload & Image Reference Handling', () => {

    it('should accept up to 5 reference images in customDetails', () => {
      const fiveImages = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
        'https://example.com/img4.jpg',
        'https://example.com/img5.jpg'
      ];

      const doc = new CustomInquiry({
        productType: 'Credenza',
        dimensions: { height: 30, width: 70, depth: 18, unit: 'inch' },
        customDetails: {
          referenceImages: fiveImages
        }
      });

      const err = doc.validateSync();
      assert.equal(err, undefined);
      assert.equal(doc.customDetails.referenceImages.length, 5);
    });

    it('should support linking an authenticated userId or null for guest inquiry', () => {
      const fakeUserId = new mongoose.Types.ObjectId();

      const memberInquiry = new CustomInquiry({
        userId: fakeUserId,
        productType: 'Executive Desk',
        dimensions: { height: 30, width: 60, depth: 30, unit: 'inch' }
      });
      assert.equal(memberInquiry.userId.toString(), fakeUserId.toString());

      const guestInquiry = new CustomInquiry({
        userId: null,
        productType: 'Executive Desk',
        dimensions: { height: 30, width: 60, depth: 30, unit: 'inch' }
      });
      assert.equal(guestInquiry.userId, null);
    });

  });

  describe('3. Controller Logic & Input Parsing', () => {

    it('should reject missing productType with 400 status', async () => {
      let statusCode = null;
      let responseBody = null;

      const mockReq = {
        body: {
          dimensions: JSON.stringify({ height: 30, width: 60, depth: 30, unit: 'inch' })
        },
        files: []
      };

      const mockRes = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { responseBody = data; }
          };
        }
      };

      await createCustomInquiry(mockReq, mockRes, (err) => { throw err; });

      assert.equal(statusCode, 400);
      assert.ok(responseBody.error.includes('Product type is required'));
    });

    it('should reject non-positive dimensions with 400 status', async () => {
      let statusCode = null;
      let responseBody = null;

      const mockReq = {
        body: {
          productType: 'Bed Frame',
          dimensions: JSON.stringify({ height: 0, width: -10, depth: 75, unit: 'inch' })
        },
        files: []
      };

      const mockRes = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { responseBody = data; }
          };
        }
      };

      await createCustomInquiry(mockReq, mockRes, (err) => { throw err; });

      assert.equal(statusCode, 400);
      assert.ok(responseBody.error.includes('Dimensions (Height, Width, Depth) must be valid numbers greater than 0'));
    });

    it('should reject requests with more than 5 uploaded files with 400 status', async () => {
      let statusCode = null;
      let responseBody = null;

      const mockReq = {
        body: {
          productType: 'Dining Table',
          dimensions: JSON.stringify({ height: 30, width: 60, depth: 30, unit: 'inch' })
        },
        files: [
          { originalname: '1.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') },
          { originalname: '2.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') },
          { originalname: '3.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') },
          { originalname: '4.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') },
          { originalname: '5.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') },
          { originalname: '6.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') }
        ]
      };

      const mockRes = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { responseBody = data; }
          };
        }
      };

      await createCustomInquiry(mockReq, mockRes, (err) => { throw err; });

      assert.equal(statusCode, 400);
      assert.ok(responseBody.error.includes('maximum of 5 reference images'));
    });

    it('should verify exact required confirmation string in response', async () => {
      // Mock CustomInquiry.create
      const originalCreate = CustomInquiry.create;
      try {
        let createdInquiryPayload = null;
        CustomInquiry.create = async (payload) => {
          createdInquiryPayload = payload;
          return {
            _id: new mongoose.Types.ObjectId(),
            ...payload
          };
        };

        let statusCode = null;
        let responseBody = null;

        const mockReq = {
          body: {
            productType: 'Minimalist Credenza',
            customerName: 'Arafat Rahman',
            phone: '01812345678',
            email: 'arafat@example.com',
            dimensions: JSON.stringify({ height: 32, width: 64, depth: 18, unit: 'inch' }),
            materials: JSON.stringify({ woodType: 'Solid Chittagong Teak', finish: 'Natural Matte', hardware: 'Brass' }),
            customDetails: JSON.stringify({ description: 'Three push-to-open doors with internal shelving' })
          },
          files: []
        };

        const mockRes = {
          status: (code) => {
            statusCode = code;
            return {
              json: (data) => { responseBody = data; }
            };
          }
        };

        await createCustomInquiry(mockReq, mockRes, (err) => { throw err; });

        assert.equal(statusCode, 201);
        assert.equal(
          responseBody.message,
          'Inquiry submitted successfully! Our team will review your specifications and contact you shortly with a quote and confirmation.'
        );
        assert.equal(createdInquiryPayload.status, 'Pending Review');
        assert.equal(createdInquiryPayload.dimensions.height, 32);
        assert.equal(createdInquiryPayload.materials.woodType, 'Solid Chittagong Teak');
        assert.equal(responseBody.inquiry.price, undefined, 'Must not return pricing');
      } finally {
        CustomInquiry.create = originalCreate;
      }
    });

    it('should submit successfully and default materials to empty when materials are omitted', async () => {
      const originalCreate = CustomInquiry.create;
      try {
        let createdInquiryPayload = null;
        CustomInquiry.create = async (payload) => {
          createdInquiryPayload = payload;
          return {
            _id: new mongoose.Types.ObjectId(),
            ...payload
          };
        };

        let statusCode = null;
        let responseBody = null;

        const mockReq = {
          body: {
            productType: 'Minimalist Dining Table',
            customerName: 'Arafat Rahman',
            phone: '01812345678',
            dimensions: JSON.stringify({ height: 30, width: 72, depth: 36, unit: 'inch' }),
            customDetails: JSON.stringify({ description: 'Custom legs' })
          },
          files: []
        };

        const mockRes = {
          status: (code) => {
            statusCode = code;
            return {
              json: (data) => { responseBody = data; }
            };
          }
        };

        await createCustomInquiry(mockReq, mockRes, (err) => { throw err; });

        assert.equal(statusCode, 201);
        assert.equal(createdInquiryPayload.materials.woodType, '');
        assert.equal(createdInquiryPayload.materials.finish, '');
        assert.equal(createdInquiryPayload.materials.hardware, '');
      } finally {
        CustomInquiry.create = originalCreate;
      }
    });

  });

  describe('4. Custom Inquiry Confirmation & Conversion to Pending Order', () => {

    it('should validate Order schema with status "Pending" and custom item properties', () => {
      const order = new Order({
        orderNumber: 'SLM-99112',
        customerName: 'Tanvir Hossain',
        phone: '01712345678',
        shippingAddress: 'House 5, Road 2, Dhanmondi, Dhaka',
        paymentMethod: 'Cash on Delivery (Custom Order)',
        totalAmount: 28500,
        status: 'Pending',
        items: [
          {
            product: {
              id: 'custom-67890',
              name: 'Custom Commission: Solid Oak Study Table',
              price: 28500,
              iconType: 'table',
              bg: 'var(--surface)',
              image: 'https://example.com/study-table.jpg',
              dimensions: '30 (H) × 48 (W) × 24 (D) inch',
              isCustom: true
            },
            quantity: 1
          }
        ]
      });

      const validationErr = order.validateSync();
      assert.equal(validationErr, undefined, 'Order document with status "Pending" and custom properties should be valid');
      assert.equal(order.status, 'Pending');
      assert.equal(order.items[0].product.isCustom, true);
      assert.equal(order.items[0].product.dimensions, '30 (H) × 48 (W) × 24 (D) inch');
    });

    it('should confirm inquiry, calculate confirmed price, create Order with Pending status and link IDs', async () => {
      const mockInquiryId = new mongoose.Types.ObjectId();
      const mockInquiryDoc = {
        _id: mockInquiryId,
        productType: 'Minimalist Walnut Bed Frame',
        customerName: 'Farhana Ahmed',
        phone: '01987654321',
        dimensions: { height: 42, width: 78, depth: 84, unit: 'inch' },
        customDetails: {
          description: 'Low profile platform, floating nightstands',
          referenceImages: ['https://example.com/bed1.jpg']
        },
        status: 'Pending Review',
        convertedOrderId: null,
        convertedOrderNumber: '',
        confirmedPrice: null,
        save: async function () { return this; }
      };

      const originalFindById = CustomInquiry.findById;
      const originalOrderCreate = Order.create;

      try {
        CustomInquiry.findById = () => ({
          populate: () => mockInquiryDoc
        });

        let createdOrderPayload = null;
        Order.create = async (payload) => {
          createdOrderPayload = payload;
          return {
            _id: new mongoose.Types.ObjectId(),
            orderNumber: 'SLM-77889',
            ...payload
          };
        };

        let responseStatusCode = null;
        let responseJson = null;

        const req = {
          params: { id: mockInquiryId.toString() },
          body: {
            confirmedPrice: 52000,
            shippingAddress: 'Gulshan 2, Dhaka',
            paymentMethod: 'Cash on Delivery (Custom Order)',
            adminNotes: 'Customer requested dark walnut oil finish'
          }
        };

        const res = {
          status: (code) => {
            responseStatusCode = code;
            return {
              json: (data) => { responseJson = data; }
            };
          }
        };

        await confirmInquiryToOrder(req, res, (err) => { throw err; });

        assert.equal(responseStatusCode, 201);
        assert.equal(responseJson.success, true);
        assert.equal(responseJson.order.orderNumber, 'SLM-77889');
        assert.equal(responseJson.order.status, 'Pending');
        assert.equal(responseJson.order.totalAmount, 52000);
        assert.equal(createdOrderPayload.status, 'Pending');
        assert.equal(createdOrderPayload.customerName, 'Farhana Ahmed');
        assert.equal(createdOrderPayload.items[0].product.isCustom, true);
        assert.equal(createdOrderPayload.items[0].product.price, 52000);
        assert.equal(mockInquiryDoc.status, 'Confirmed');
        assert.equal(mockInquiryDoc.convertedOrderNumber, 'SLM-77889');
        assert.equal(mockInquiryDoc.confirmedPrice, 52000);
      } finally {
        CustomInquiry.findById = originalFindById;
        Order.create = originalOrderCreate;
      }
    });

    it('should allow order status updates to and from "Pending" in orderController', async () => {
      const originalFindOneAndUpdate = Order.findOneAndUpdate;
      try {
        let updateQuery = null;
        let updateDoc = null;

        Order.findOneAndUpdate = async (query, update) => {
          updateQuery = query;
          updateDoc = update;
          return {
            _id: new mongoose.Types.ObjectId(),
            orderNumber: 'SLM-12345',
            status: update.status
          };
        };

        let jsonResult = null;
        const req = {
          params: { orderNumber: 'SLM-12345' },
          body: { status: 'Pending' }
        };
        const res = {
          json: (data) => { jsonResult = data; }
        };

        await updateOrderStatus(req, res, (err) => { throw err; });

        assert.equal(jsonResult.status, 'Pending');
        assert.equal(updateDoc.status, 'Pending');
      } finally {
        Order.findOneAndUpdate = originalFindOneAndUpdate;
      }
    });

  });

});


