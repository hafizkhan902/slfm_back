import redis from '../config/redis.js';

export const cacheProducts = async (req, res, next) => {
  if (!redis || redis.status !== 'ready') {
    return next(); // Fallback to DB if Redis is unavailable
  }

  try {
    const key = `products:${req.originalUrl}`;
    const cachedData = await redis.get(key);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redis.setex(key, 3600, JSON.stringify(data)); // Cache for 1 hour
      return originalJson(data);
    };

    next();
  } catch (err) {
    next();
  }
};

export const clearProductCache = async () => {
  if (!redis || redis.status !== 'ready') return;
  try {
    const keys = await redis.keys('products:*');
    if (keys.length > 0) {
      await redis.del(keys);
      console.log('⚡ Redis Product Cache Invalidated');
    }
  } catch (err) {
    console.error('Redis cache clear error:', err);
  }
};
