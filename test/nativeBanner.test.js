import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NativeBanner, defaultNativeBannerData } from '../models/NativeBanner.js';
import { getNativeBanner, updateNativeBanner } from '../controllers/bannerController.js';

describe('Native Banner (320x50) Integration Tests', () => {

  describe('1. NativeBanner Mongoose Schema & Default Fallback Data', () => {
    it('should have complete and valid default fallback data structure', () => {
      assert.ok(defaultNativeBannerData.bannerId, 'Should have default bannerId');
      assert.ok(defaultNativeBannerData.adestraLink, 'Should have default adestraLink');
      assert.equal(defaultNativeBannerData.badgeText, 'SPONSORED');
      assert.equal(defaultNativeBannerData.placement, 'footer');
      assert.equal(defaultNativeBannerData.isActive, true);
      assert.equal(defaultNativeBannerData.openInNewTab, true);
    });

    it('should validate and create a valid NativeBanner document with defaults', () => {
      const doc = new NativeBanner(defaultNativeBannerData);
      const validationError = doc.validateSync();
      assert.equal(validationError, undefined, 'NativeBanner should validate without errors');
      assert.equal(doc.badgeText, 'SPONSORED');
      assert.equal(doc.isActive, true);
    });

    it('should support custom adestra link, placement, and image URL', () => {
      const customDoc = new NativeBanner({
        bannerId: 'adestra_promo_test',
        title: 'Exclusive Living Room Sale',
        adestraLink: 'https://alnk.to/example_adestra',
        imageUrl: 'https://images.example.com/banner-320x50.png',
        badgeText: 'FEATURED',
        placement: 'home_mid',
        isActive: true,
        openInNewTab: true,
        altText: 'Adestra Promo'
      });

      const validationError = customDoc.validateSync();
      assert.equal(validationError, undefined, 'Custom NativeBanner should validate cleanly');
      assert.equal(customDoc.adestraLink, 'https://alnk.to/example_adestra');
      assert.equal(customDoc.placement, 'home_mid');
      assert.equal(customDoc.imageUrl, 'https://images.example.com/banner-320x50.png');
    });

    it('should reject invalid placement enum values', () => {
      const invalidDoc = new NativeBanner({
        placement: 'invalid_placement_location'
      });
      const validationError = invalidDoc.validateSync();
      assert.ok(validationError, 'Should throw validation error for invalid placement');
      assert.ok(validationError.errors.placement, 'Should flag invalid placement');
    });
  });

  describe('2. Controller Logic & Fallback Handling', () => {
    it('should return default fallback data when no document exists in DB', async () => {
      const origFindOne = NativeBanner.findOne;
      const origCreate = NativeBanner.create;

      NativeBanner.findOne = async () => null;
      NativeBanner.create = async (data) => ({ ...data, _id: 'mock_created_id' });

      try {
        const req = {};
        let resJson = null;
        const res = {
          json: (data) => {
            resJson = data;
            return res;
          }
        };

        await getNativeBanner(req, res);

        assert.ok(resJson, 'Should return a JSON response');
        assert.equal(resJson.success, true);
        assert.equal(resJson.data.bannerId, 'default_native_320x50');
        assert.equal(resJson.data.badgeText, 'SPONSORED');
      } finally {
        NativeBanner.findOne = origFindOne;
        NativeBanner.create = origCreate;
      }
    });

    it('should update banner adestraLink, title, and placement via updateNativeBanner', async () => {
      const origFindOne = NativeBanner.findOne;

      const mockDoc = new NativeBanner(defaultNativeBannerData);
      mockDoc.save = async function() { return this; };

      NativeBanner.findOne = async () => mockDoc;

      try {
        const req = {
          body: {
            title: 'Updated Adestra Spring Deals',
            adestraLink: 'https://adestra.directlink.com/deal123',
            imageUrl: 'https://adestra.directlink.com/320x50.jpg',
            badgeText: 'AD',
            placement: 'both',
            isActive: 'true'
          }
        };

        let resJson = null;
        let resStatus = 200;
        const res = {
          status: (code) => {
            resStatus = code;
            return res;
          },
          json: (data) => {
            resJson = data;
            return res;
          }
        };

        await updateNativeBanner(req, res);

        assert.equal(resStatus, 200);
        assert.ok(resJson, 'Should return a response');
        assert.equal(resJson.success, true);
        assert.equal(resJson.data.title, 'Updated Adestra Spring Deals');
        assert.equal(resJson.data.adestraLink, 'https://adestra.directlink.com/deal123');
        assert.equal(resJson.data.badgeText, 'AD');
        assert.equal(resJson.data.placement, 'both');
        assert.equal(resJson.data.isActive, true);
      } finally {
        NativeBanner.findOne = origFindOne;
      }
    });

    it('should accept and store raw Adsterra script tag and container div', async () => {
      const origFindOne = NativeBanner.findOne;
      const mockDoc = new NativeBanner(defaultNativeBannerData);
      mockDoc.save = async function() { return this; };

      NativeBanner.findOne = async () => mockDoc;

      try {
        const adsterraSnippet = `<script async="async" data-cfasync="false" src="https://pl32018631.profitableratecpmnetwork.com/cbdefa9aba08563b50f57b82e52a93f5/invoke.js"></script>\n<div id="container-cbdefa9aba08563b50f57b82e52a93f5"></div>`;

        const req = {
          body: {
            adScriptCode: adsterraSnippet,
            adScriptCodeBase64: Buffer.from(adsterraSnippet, 'utf-8').toString('base64'),
            placement: 'footer',
            isActive: true
          }
        };

        let resJson = null;
        const res = {
          json: (data) => {
            resJson = data;
            return res;
          }
        };

        await updateNativeBanner(req, res);

        assert.ok(resJson, 'Should return JSON');
        assert.equal(resJson.success, true);
        assert.ok(resJson.data.adScriptCode.includes('pl32018631.profitableratecpmnetwork.com'), 'Should store script URL');
        assert.ok(resJson.data.adScriptCode.includes('container-cbdefa9aba08563b50f57b82e52a93f5'), 'Should store container div ID');
      } finally {
        NativeBanner.findOne = origFindOne;
      }
    });
  });

});
