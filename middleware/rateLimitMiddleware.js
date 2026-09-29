import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware Module
 * Rate limiting is strictly enabled in production (NODE_ENV === 'production')
 * and completely disabled in development mode to allow unhindered testing.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

// Helper function to create rate limiters that only fire in production mode
const createConditionalLimiter = (options) => {
  const limiter = rateLimit({
    ...options,
    skip: () => !isProduction()
  });

  return (req, res, next) => {
    if (!isProduction()) {
      return next(); // Completely bypass rate limiting in development mode
    }
    return limiter(req, res, next);
  };
};

// Auth Limiter: max 10 requests per 15 min per IP in production
export const authLimiter = createConditionalLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Order Limiter: max 10 order submissions per 10 min per IP in production
export const orderLimiter = createConditionalLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Order submission limit reached. Please wait a few minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});
