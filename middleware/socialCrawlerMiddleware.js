import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

// Social crawler user-agent signatures
const BOT_USER_AGENTS = /facebookexternalhit|facebot|facebookcatalog|whatsapp|twitterbot|telegrambot|linkedinbot|pinterest|slackbot|discordbot|applebot|bingpreview|embedly|quora link preview|outbrain|vkshare|w3c_validator/i;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSocialCrawler(userAgent) {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.test(userAgent);
}

export function resolveAbsoluteImageUrl(img, baseUrl = 'https://slfm.store') {
  if (!img) return `${baseUrl}/logos.png`;
  if (/^https?:\/\//i.test(img)) return img;
  const cleanPath = img.startsWith('/') ? img : `/${img}`;
  return `${baseUrl}${cleanPath}`;
}

export function buildProductOgHtml(product, baseUrl = 'https://slfm.store') {
  const prodId = product.productId || product._id;
  const productUrl = `${baseUrl}/?product=${encodeURIComponent(prodId)}`;
  const title = `${product.name} — ShahLajuk Furniture Mart`;
  const rawDesc = product.description || 'Premium handcrafted furniture in Bangladesh by ShahLajuk Furniture Mart.';
  const priceText = product.price ? `৳${Number(product.price).toLocaleString('en-IN')}` : '';
  const description = `${priceText ? `${priceText} — ` : ''}${rawDesc}`.slice(0, 290);

  const rawImg = product.image || product.image2 || (product.images && product.images[0]) || '';
  const imageUrl = resolveAbsoluteImageUrl(rawImg, baseUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(productUrl)}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="ShahLajuk Furniture Mart">
  <meta property="og:title" content="${escapeHtml(product.name)} | ShahLajuk Furniture Mart">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">

  <!-- Product Meta Tags -->
  <meta property="product:price:amount" content="${escapeHtml(product.price || 0)}">
  <meta property="product:price:currency" content="BDT">
  <meta property="product:availability" content="${product.isAvailable !== false ? 'in stock' : 'out of stock'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(product.name)} | ShahLajuk Furniture Mart">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(product.name)}">

  <!-- Instant Browser Redirect for Human Visitors -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; text-align: center; color: #1c1917; background-color: #fafaf9;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <h1 style="font-size: 1.5rem; margin-bottom: 12px; color: #1c1917;">${escapeHtml(product.name)}</h1>
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px; object-fit: cover; max-height: 400px;" />
    <p style="font-size: 1.25rem; font-weight: 600; color: #b45309; margin-bottom: 12px;">${escapeHtml(priceText)}</p>
    <p style="color: #57534e; line-height: 1.6; margin-bottom: 20px;">${escapeHtml(rawDesc)}</p>
    <a href="${escapeHtml(productUrl)}" style="display: inline-block; background: #b45309; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Product on ShahLajuk</a>
  </div>
  <script>
    if (window.location.href !== "${escapeHtml(productUrl)}") {
      window.location.replace("${escapeHtml(productUrl)}");
    }
  </script>
</body>
</html>`;
}

/**
 * Middleware that intercepts requests from social scrapers (Facebook, WhatsApp, Twitter, etc.)
 * when sharing product links, and returns static HTML with complete OpenGraph / Twitter tags.
 */
export const socialCrawlerMiddleware = async (req, res, next) => {
  try {
    const userAgent = req.get('user-agent') || '';
    const isCrawler = isSocialCrawler(userAgent);
    const isExplicitPreview = req.query.og_preview === 'true';

    // Only proceed if crawler detected or manual preview requested
    if (!isCrawler && !isExplicitPreview) {
      return next();
    }

    // Extract product ID from query parameter or path parameter
    let prodIdentifier = req.query.product || req.query.id;
    if (!prodIdentifier && req.path.startsWith('/product/')) {
      prodIdentifier = req.path.replace('/product/', '').split('/')[0];
    }

    if (!prodIdentifier) {
      return next();
    }

    // Determine query: by ObjectId or productId
    const query = mongoose.Types.ObjectId.isValid(prodIdentifier)
      ? { $or: [{ _id: prodIdentifier }, { productId: prodIdentifier }] }
      : { productId: prodIdentifier };

    const product = await Product.findOne(query).lean();
    if (!product) {
      return next();
    }

    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const dynamicBaseUrl = `${protocol}://${host}`;
    const baseUrl = process.env.PUBLIC_URL || (host && !host.includes('localhost') ? dynamicBaseUrl : 'https://slfm.store');

    const html = buildProductOgHtml(product, baseUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('socialCrawlerMiddleware error:', error);
    return next();
  }
};
