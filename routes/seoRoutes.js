import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { buildProductOgHtml, resolveAbsoluteImageUrl } from '../middleware/socialCrawlerMiddleware.js';

const router = express.Router();

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const STATIC_ROOMS = [
  'living-room',
  'bedroom',
  'dining-room',
  'reading-room',
  'decoration',
  'kids-room'
];

const STATIC_CATEGORIES = [
  'table',
  'chair',
  'wardrobe',
  'dressing-table',
  'bookshelf',
  'bed',
  'sofa',
  'wall-shelf'
];

/**
 * Generate full XML sitemap containing site pages, taxonomies, and dynamic MongoDB products
 */
export async function generateSitemapXml(baseUrl = 'https://slfm.store') {
  let products = [];
  try {
    products = await Product.find({ isAvailable: { $ne: false } })
      .select('productId name description image image2 images price category room updatedAt createdAt')
      .lean();
  } catch (err) {
    console.error('Failed to retrieve products for sitemap.xml:', err);
  }

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // 1. Homepage
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `    <image:image>\n`;
  xml += `      <image:loc>${baseUrl}/logos.png</image:loc>\n`;
  xml += `      <image:title>ShahLajuk Furniture Mart — Premium Board &amp; Solid Wood Furniture</image:title>\n`;
  xml += `      <image:caption>Handcrafted, modern and minimalist furniture for your home and office in Bangladesh.</image:caption>\n`;
  xml += `    </image:image>\n`;
  xml += `  </url>\n`;

  // 2. Main Catalogue
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/?view=catalog</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.9</priority>\n`;
  xml += `  </url>\n`;

  // 3. Room Collections
  for (const room of STATIC_ROOMS) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/?room=${encodeURIComponent(room)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 4. Categories
  for (const cat of STATIC_CATEGORIES) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/?category=${encodeURIComponent(cat)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 5. Dynamic Products from MongoDB
  for (const prod of products) {
    const prodId = prod.productId || prod._id;
    const prodUrl = `${baseUrl}/?product=${encodeURIComponent(prodId)}`;
    const lastMod = (prod.updatedAt || prod.createdAt || new Date()).toISOString().split('T')[0];
    const rawImg = prod.image || prod.image2 || (prod.images && prod.images[0]) || '';
    const imgUrl = resolveAbsoluteImageUrl(rawImg, baseUrl);

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(prodUrl)}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;

    if (imgUrl) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(prod.name)}</image:title>\n`;
      if (prod.description) {
        xml += `      <image:caption>${escapeXml(prod.description.slice(0, 150))}</image:caption>\n`;
      }
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

/**
 * GET /sitemap.xml & GET /api/sitemap.xml
 */
const sitemapHandler = async (req, res) => {
  try {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const dynamicBaseUrl = `${protocol}://${host}`;
    const baseUrl = process.env.PUBLIC_URL || (host && !host.includes('localhost') ? dynamicBaseUrl : 'https://slfm.store');

    const xml = await generateSitemapXml(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Error serving sitemap.xml:', error);
    return res.status(500).send('Error generating sitemap');
  }
};

/**
 * GET /robots.txt
 */
const robotsHandler = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol || 'http';
  const dynamicBaseUrl = `${protocol}://${host}`;
  const baseUrl = process.env.PUBLIC_URL || (host && !host.includes('localhost') ? dynamicBaseUrl : 'https://slfm.store');

  const content = `# robots.txt for ShahLajuk Furniture Mart
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin/

# Google Search Console Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(content);
};

/**
 * GET /api/seo/og-preview
 * Testing/debugging helper endpoint for OpenGraph rendering
 */
const ogPreviewHandler = async (req, res) => {
  try {
    const { product: prodId, format } = req.query;
    if (!prodId) {
      return res.status(400).json({ error: 'Missing product query parameter (?product=id)' });
    }

    const query = mongoose.Types.ObjectId.isValid(prodId)
      ? { $or: [{ _id: prodId }, { productId: prodId }] }
      : { productId: prodId };

    const product = await Product.findOne(query).lean();
    if (!product) {
      return res.status(404).json({ error: `Product '${prodId}' not found` });
    }

    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const dynamicBaseUrl = `${protocol}://${host}`;
    const baseUrl = process.env.PUBLIC_URL || (host && !host.includes('localhost') ? dynamicBaseUrl : 'https://slfm.store');

    if (format === 'json') {
      const rawImg = product.image || product.image2 || (product.images && product.images[0]) || '';
      return res.json({
        og: {
          'og:type': 'product',
          'og:site_name': 'ShahLajuk Furniture Mart',
          'og:title': `${product.name} | ShahLajuk Furniture Mart`,
          'og:description': product.description,
          'og:url': `${baseUrl}/?product=${encodeURIComponent(product.productId || product._id)}`,
          'og:image': resolveAbsoluteImageUrl(rawImg, baseUrl),
          'product:price:amount': product.price,
          'product:price:currency': 'BDT'
        },
        product
      });
    }

    const html = buildProductOgHtml(product, baseUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error generating OG preview:', error);
    return res.status(500).json({ error: error.message });
  }
};

router.get('/sitemap.xml', sitemapHandler);
router.get('/robots.txt', robotsHandler);
router.get('/api/sitemap.xml', sitemapHandler);
router.get('/api/seo/og-preview', ogPreviewHandler);

export default router;
