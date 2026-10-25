import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ThemeSection, defaultThemeData } from '../models/ThemeSection.js';
import { getThemeSection, updateThemeSection } from '../controllers/themeController.js';

describe('Curated Architecture & Themes Section Tests', () => {

  describe('1. ThemeSection Mongoose Schema & Default Fallback Data', () => {
    it('should have complete and valid default fallback data structure', () => {
      assert.ok(defaultThemeData.eyebrow, 'Should have eyebrow');
      assert.equal(defaultThemeData.eyebrow, 'CURATED ARCHITECTURE & THEMES');
      assert.equal(defaultThemeData.heading, 'Spaces Sculpted for Serenity');
      assert.ok(defaultThemeData.subheading.includes('calm interiors create quiet minds'));
      assert.equal(Array.isArray(defaultThemeData.cards), true);
      assert.equal(defaultThemeData.cards.length, 3);

      const [card1, card2, card3] = defaultThemeData.cards;
      assert.equal(card1.badgeText, 'THEME 01');
      assert.equal(card1.category, 'LIVING & LOUNGE');
      assert.equal(card1.title, 'The Minimalist Living Room');
      assert.equal(card1.buttonText, 'Explore Living Collection');

      assert.equal(card2.badgeText, 'THEME 02');
      assert.equal(card2.category, 'MATERIALITY');
      assert.equal(card2.title, 'Warm Japandi Textures');
      assert.equal(card2.buttonLink, '#material');

      assert.equal(card3.badgeText, 'THEME 03');
      assert.equal(card3.category, 'STUDY & STORAGE');
      assert.equal(card3.title, 'Modular Architectural Joinery');
    });

    it('should validate and create a valid ThemeSection document with defaults', () => {
      const doc = new ThemeSection(defaultThemeData);
      const validationError = doc.validateSync();
      assert.equal(validationError, undefined, 'ThemeSection should have no validation errors');
      assert.equal(doc.cards.length, 3);
      assert.equal(doc.cards[0].order, 1);
    });

    it('should support custom images and links on theme cards', () => {
      const customDoc = new ThemeSection({
        eyebrow: 'ARCHITECTURAL EDITORIAL',
        heading: 'Modern Minimal Living',
        subheading: 'Sculpted teak and pure materials.',
        cards: [
          {
            badgeText: 'EDITORIAL 01',
            imageUrl: 'https://res.cloudinary.com/shahlajuk/image/upload/v1/living.jpg',
            category: 'LIVING SPACES',
            title: 'Custom Japandi Lounge',
            description: 'Curated low seating crafted from solid timber.',
            buttonText: 'View Collection',
            buttonLink: '/collections/living',
            order: 1
          }
        ]
      });

      const validationError = customDoc.validateSync();
      assert.equal(validationError, undefined);
      assert.equal(customDoc.cards[0].imageUrl, 'https://res.cloudinary.com/shahlajuk/image/upload/v1/living.jpg');
      assert.equal(customDoc.cards[0].badgeText, 'EDITORIAL 01');
    });
  });

  describe('2. Controller Logic & Seeding Handling', () => {
    it('should return default fallback data when no document is stored', async () => {
      const origFindOne = ThemeSection.findOne;
      const origCreate = ThemeSection.create;
      try {
        ThemeSection.findOne = async () => null;
        ThemeSection.create = async () => ({
          ...defaultThemeData,
          save: async () => {}
        });

        let responseData = null;
        const mockRes = {
          json: (data) => {
            responseData = data;
            return data;
          },
          status: () => mockRes
        };
        const mockReq = {};

        await getThemeSection(mockReq, mockRes);
        assert.ok(responseData, 'Should receive response from getThemeSection');
        assert.equal(responseData.success, true);
        assert.ok(responseData.data);
        assert.equal(responseData.data.eyebrow, 'CURATED ARCHITECTURE & THEMES');
        assert.equal(responseData.data.heading, 'Spaces Sculpted for Serenity');
        assert.equal(responseData.data.cards.length, 3);
      } finally {
        ThemeSection.findOne = origFindOne;
        ThemeSection.create = origCreate;
      }
    });

    it('should update section header and cards via updateThemeSection', async () => {
      const origFindOne = ThemeSection.findOne;
      try {
        const mockDoc = {
          eyebrow: 'OLD EYEBROW',
          heading: 'Old Heading',
          subheading: 'Old Sub',
          cards: [...defaultThemeData.cards],
          save: async function () { return this; }
        };
        ThemeSection.findOne = async () => mockDoc;

        let responseData = null;
        let statusCode = 200;
        const mockRes = {
          status: (code) => {
            statusCode = code;
            return mockRes;
          },
          json: (data) => {
            responseData = data;
            return data;
          }
        };

        const mockReq = {
          body: {
            eyebrow: 'REFINED INTERIORS',
            heading: 'Living in Harmony',
            subheading: 'A curated dialogue between timber and space.',
            cards: JSON.stringify([
              {
                badgeText: 'SERIES 01',
                imageUrl: 'https://images.unsplash.com/photo-minimal-living',
                category: 'LIVING ROOM',
                title: 'The Teak Lounge Series',
                description: 'Minimalist low seating with natural tactile grain.',
                buttonText: 'Explore Series',
                buttonLink: 'room:living-room',
                order: 1
              },
              {
                badgeText: 'SERIES 02',
                imageUrl: '',
                category: 'MATERIALITY',
                title: 'Board & Teak Precision',
                description: 'Moisture-sealed melamine board joinery.',
                buttonText: 'Read Ethos',
                buttonLink: '#material',
                order: 2
              },
              {
                badgeText: 'SERIES 03',
                imageUrl: '',
                category: 'STORAGE',
                title: 'Architectural Shelving',
                description: 'Silent soft-close hardware and bespoke sizing.',
                buttonText: 'View Desks',
                buttonLink: 'room:reading-room',
                order: 3
              }
            ])
          }
        };

        await updateThemeSection(mockReq, mockRes);
        assert.equal(statusCode, 200);
        assert.ok(responseData.success);
        assert.equal(responseData.data.eyebrow, 'REFINED INTERIORS');
        assert.equal(responseData.data.heading, 'Living in Harmony');
        assert.equal(responseData.data.cards[0].badgeText, 'SERIES 01');
        assert.equal(responseData.data.cards[0].imageUrl, 'https://images.unsplash.com/photo-minimal-living');
      } finally {
        ThemeSection.findOne = origFindOne;
      }
    });
  });
});
