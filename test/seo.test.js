import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSocialCrawler,
  resolveAbsoluteImageUrl,
  buildProductOgHtml,
  socialCrawlerMiddleware
} from '../middleware/socialCrawlerMiddleware.js';
import { generateSitemapXml } from '../routes/seoRoutes.js';
import { Product } from '../models/Product.js';

describe('Search Console Sitemap & OpenGraph (Facebook/Social) Tests', () => {

  describe('1. Social Crawler User-Agent Detection', () => {
    it('should identify Facebook externalhit scraper', () => {
      const fbUA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
      assert.equal(isSocialCrawler(fbUA), true);
    });

    it('should identify Facebot', () => {
      assert.equal(isSocialCrawler('Facebot'), true);
    });

    it('should identify WhatsApp scraper', () => {
      const waUA = 'WhatsApp/2.21.12.21 i';
      assert.equal(isSocialCrawler(waUA), true);
    });

    it('should identify Twitterbot', () => {
      const twUA = 'Twitterbot/1.0';
      assert.equal(isSocialCrawler(twUA), true);
    });

    it('should identify Telegram, LinkedIn, Discord, and Pinterest bots', () => {
      assert.equal(isSocialCrawler('TelegramBot (like TwitterBot)'), true);
      assert.equal(isSocialCrawler('LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient)'), true);
      assert.equal(isSocialCrawler('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'), true);
      assert.equal(isSocialCrawler('Pinterest/0.2 (+http://www.pinterest.com/bot.html)'), true);
      assert.equal(isSocialCrawler('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'), true);
    });

    it('should NOT flag regular desktop and mobile web browsers as crawlers', () => {
      const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const safariIPhone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0';

      assert.equal(isSocialCrawler(chromeMac), false);
      assert.equal(isSocialCrawler(safariIPhone), false);
      assert.equal(isSocialCrawler(firefox), false);
      assert.equal(isSocialCrawler(''), false);
      assert.equal(isSocialCrawler(null), false);
    });
  });

  describe('2. Image URL Resolution for Social Sharing', () => {
    it('should keep existing absolute HTTPS URLs intact', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      assert.equal(resolveAbsoluteImageUrl(url), url);
    });

    it('should prepend base URL to relative upload paths', () => {
      const rel = '/uploads/prod-dining-table.webp';
      assert.equal(resolveAbsoluteImageUrl(rel, 'https://slfm.store'), 'https://slfm.store/uploads/prod-dining-table.webp');
    });

    it('should prepend base URL and slash if relative path lacks leading slash', () => {
      const rel = 'uploads/chair.jpg';
      assert.equal(resolveAbsoluteImageUrl(rel, 'https://slfm.store'), 'https://slfm.store/uploads/chair.jpg');
    });

    it('should return fallback brand logo when image is null, empty, or undefined', () => {
      assert.equal(resolveAbsoluteImageUrl('', 'https://slfm.store'), 'https://slfm.store/logos.png');
      assert.equal(resolveAbsoluteImageUrl(null, 'https://slfm.store'), 'https://slfm.store/logos.png');
    });
  });

  describe('3. OpenGraph HTML Generation for Social Media Link Previews', () => {
    const mockProduct = {
      productId: 'SLFM-77419',
      name: 'Noyon Solid Teak Dining Table & Chairs',
      price: 45000,
      description: 'Elegant dining set made with premium seasoned teak wood and scratch-resistant lacquer.',
      image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200',
      isAvailable: true
    };

    it('should generate complete HTML document with required OpenGraph meta tags', () => {
      const html = buildProductOgHtml(mockProduct, 'https://slfm.store');

      assert.ok(html.includes('<!DOCTYPE html>'), 'Must start with doctype');
      assert.ok(html.includes('<meta property="og:type" content="product">'), 'Must define og:type product');
      assert.ok(html.includes('<meta property="og:site_name" content="ShahLajuk Furniture Mart">'), 'Must define og:site_name');
      assert.ok(html.includes('content="Noyon Solid Teak Dining Table &amp; Chairs | ShahLajuk Furniture Mart"'), 'Must contain formatted og:title');
      assert.ok(html.includes(`content="${mockProduct.image}"`), 'Must contain full image URL in og:image');
      assert.ok(html.includes('<meta property="og:image:width" content="1200">'), 'Must include 1200 width for high-res Facebook cards');
      assert.ok(html.includes('<meta property="og:image:height" content="630">'), 'Must include 630 height for Facebook cards');
      assert.ok(html.includes('content="https://slfm.store/?product=SLFM-77419"'), 'Must contain canonical URL');
      assert.ok(html.includes('<meta property="product:price:amount" content="45000">'), 'Must contain price amount');
      assert.ok(html.includes('<meta property="product:price:currency" content="BDT">'), 'Must contain BDT currency');
      assert.ok(html.includes('<meta property="product:availability" content="in stock">'), 'Must contain availability status');
    });

    it('should generate Twitter Card metadata for Twitter/X sharing', () => {
      const html = buildProductOgHtml(mockProduct, 'https://slfm.store');

      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), 'Must use summary_large_image card');
      assert.ok(html.includes('name="twitter:title"'), 'Must include twitter:title');
      assert.ok(html.includes('name="twitter:description"'), 'Must include twitter:description');
      assert.ok(html.includes(`name="twitter:image" content="${mockProduct.image}"`), 'Must include twitter:image');
    });

    it('should escape HTML characters in product names and descriptions to avoid XSS', () => {
      const maliciousProduct = {
        productId: 'hack-1',
        name: 'Bed <script>alert("xss")</script> & "luxury"',
        price: 25000,
        description: 'Quality with <tag> & special symbols',
        image: ''
      };

      const html = buildProductOgHtml(maliciousProduct, 'https://slfm.store');
      assert.ok(!html.includes('<script>alert("xss")</script>'), 'Unescaped script must not exist in HTML');
      assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), 'Characters must be properly HTML-escaped');
      assert.ok(html.includes('&amp; &quot;luxury&quot;'), 'Ampersand and quotes must be escaped');
    });

    it('should inject automatic meta refresh redirect for browsers', () => {
      const html = buildProductOgHtml(mockProduct, 'https://slfm.store');
      assert.ok(html.includes('<meta http-equiv="refresh" content="0;url=https://slfm.store/?product=SLFM-77419">'), 'Must have instant refresh redirect');
    });
  });

  describe('4. Dynamic XML Sitemap Generation for Google Search Console', () => {
    it('should generate valid XML sitemap structure conforming to sitemaps.org schema', async () => {
      const originalFind = Product.find;
      Product.find = () => ({
        select: () => ({
          lean: async () => [
            {
              productId: 'test-sofa-01',
              name: 'Velvet Sofa 3-Seater',
              price: 32000,
              description: 'Comfortable living room sofa',
              image: 'https://slfm.store/uploads/sofa.jpg',
              category: 'sofa',
              room: 'living-room',
              updatedAt: new Date('2026-10-25T10:00:00Z')
            }
          ]
        })
      });

      try {
        const xml = await generateSitemapXml('https://slfm.store');

        assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must start with standard XML declaration');
        assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Must declare sitemap schema namespace');
        assert.ok(xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), 'Must declare Google image extension');

        // Check Homepage
        assert.ok(xml.includes('<loc>https://slfm.store/</loc>'), 'Must include homepage');
        assert.ok(xml.includes('<priority>1.0</priority>'), 'Homepage must have 1.0 priority');
        assert.ok(xml.includes('<image:loc>https://slfm.store/logos.png</image:loc>'), 'Homepage must have brand logo image');

        // Check Catalogue & Categories
        assert.ok(xml.includes('<loc>https://slfm.store/?view=catalog</loc>'), 'Must include catalogue');
        assert.ok(xml.includes('<loc>https://slfm.store/?room=living-room</loc>'), 'Must include room URLs');
        assert.ok(xml.includes('<loc>https://slfm.store/?category=table</loc>'), 'Must include category URLs');

        // Check Product URL
        assert.ok(xml.includes('<loc>https://slfm.store/?product=test-sofa-01</loc>'), 'Must include product URL');
        assert.ok(xml.includes('<image:loc>https://slfm.store/uploads/sofa.jpg</image:loc>'), 'Must include product image URL');
        assert.ok(xml.includes('<image:title>Velvet Sofa 3-Seater</image:title>'), 'Must include product title in image tag');
        assert.ok(xml.includes('</urlset>'), 'Must properly close urlset');
      } finally {
        Product.find = originalFind;
      }
    });

    it('should gracefully handle empty or failing database queries without crashing', async () => {
      const originalFind = Product.find;
      Product.find = () => ({
        select: () => ({
          lean: async () => {
            throw new Error('Database temporarily unavailable');
          }
        })
      });

      try {
        const xml = await generateSitemapXml('https://slfm.store');
        assert.ok(xml.includes('<loc>https://slfm.store/</loc>'), 'Must still include baseline homepage');
        assert.ok(xml.includes('</urlset>'), 'Must properly close urlset');
      } finally {
        Product.find = originalFind;
      }
    });
  });

  describe('5. Social Crawler Express Middleware Execution', () => {
    it('should bypass middleware and call next() for standard browser requests', async () => {
      let nextCalled = false;
      const req = {
        get: (header) => (header.toLowerCase() === 'user-agent' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : ''),
        query: { product: 'SLFM-101' },
        path: '/'
      };
      const res = {};
      const next = () => { nextCalled = true; };

      await socialCrawlerMiddleware(req, res, next);
      assert.equal(nextCalled, true, 'next() should be called for regular browser');
    });

    it('should intercept Facebook crawler request and return OpenGraph HTML with 200', async () => {
      const originalFindOne = Product.findOne;
      Product.findOne = () => ({
        lean: async () => ({
          productId: 'prod-teak-bed-500',
          name: 'Royal Teak King Bed',
          price: 55000,
          description: 'Solid teak king bed with carved headboard.',
          image: 'https://slfm.store/uploads/bed.jpg',
          isAvailable: true
        })
      });

      try {
        let statusCode = null;
        let responseHeaders = {};
        let sentHtml = '';

        const req = {
          get: (header) => {
            if (header.toLowerCase() === 'user-agent') return 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
            if (header.toLowerCase() === 'host') return 'slfm.store';
            return '';
          },
          protocol: 'https',
          query: { product: 'prod-teak-bed-500' },
          path: '/'
        };

        const res = {
          setHeader: (name, val) => { responseHeaders[name] = val; },
          status: (code) => {
            statusCode = code;
            return {
              send: (content) => { sentHtml = content; }
            };
          }
        };

        let nextCalled = false;
        const next = () => { nextCalled = true; };

        await socialCrawlerMiddleware(req, res, next);

        assert.equal(nextCalled, false, 'next() should NOT be called when crawler response is sent');
        assert.equal(statusCode, 200, 'Must respond with HTTP 200');
        assert.equal(responseHeaders['Content-Type'], 'text/html; charset=utf-8');
        assert.ok(sentHtml.includes('property="og:title" content="Royal Teak King Bed | ShahLajuk Furniture Mart"'));
        assert.ok(sentHtml.includes('property="og:image" content="https://slfm.store/uploads/bed.jpg"'));
        assert.ok(sentHtml.includes('property="product:price:amount" content="55000"'));
      } finally {
        Product.findOne = originalFindOne;
      }
    });

    it('should pass through with next() if crawler visits non-product page', async () => {
      let nextCalled = false;
      const req = {
        get: (header) => (header.toLowerCase() === 'user-agent' ? 'WhatsApp/2.21.12.21 i' : ''),
        query: {},
        path: '/'
      };
      const res = {};
      const next = () => { nextCalled = true; };

      await socialCrawlerMiddleware(req, res, next);
      assert.equal(nextCalled, true, 'next() must be called when no product param is present');
    });
  });

});
