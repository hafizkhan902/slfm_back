import Redis from 'ioredis';

let redis = null;

try {
  redis = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true
  });

  redis.on('connect', () => console.log('⚡ Redis Cache Server Connected'));
  redis.on('error', (err) => {
    console.warn(`⚠️ Redis Cache unavailable (bypassing to MongoDB DB): ${err.message}`);
  });
} catch (e) {
  console.warn('⚠️ Redis Client Initialization skipped:', e.message);
}

export default redis;
