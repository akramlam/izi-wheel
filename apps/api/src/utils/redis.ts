import { createClient, RedisClientType } from 'redis';

// Create Redis client
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient: RedisClientType = createClient({ url: REDIS_URL });

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('Redis connection error:', err);
});

// Handle errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

/**
 * Check if user is rate limited and set rate limit if not
 * @param key - Rate limit key
 * @param ttlSeconds - Time-to-live in seconds
 */
export const checkRateLimit = async (
  key: string,
  ttlSeconds: number
): Promise<boolean> => {
  try {
    const exists = await redisClient.exists(key);
    
    if (exists) {
      return true; // Rate limited
    }
    
    // Set rate limit
    await redisClient.set(key, '1', { EX: ttlSeconds });
    return false; // Not rate limited
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return false; // Allow operation if Redis fails
  }
};

/**
 * Generate different rate limit keys based on time periods
 */
export const getRateLimitKey = (
  wheelId: string,
  ip: string,
  period: 'daily' | 'weekly' | 'monthly'
): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const week = Math.ceil(now.getDate() / 7).toString().padStart(2, '0');
  
  switch (period) {
    case 'daily':
      return `play:${wheelId}:${ip}:${year}-${month}-${day}`;
    case 'weekly':
      return `play:${wheelId}:${ip}:${year}-${month}-w${week}`;
    case 'monthly':
      return `play:${wheelId}:${ip}:${year}-${month}`;
    default:
      return `play:${wheelId}:${ip}`;
  }
};

/**
 * Calculate TTL in seconds for different time periods
 */
export const getRateLimitTTL = (period: 'daily' | 'weekly' | 'monthly'): number => {
  const SECONDS_IN_DAY = 24 * 60 * 60;
  
  switch (period) {
    case 'daily':
      return SECONDS_IN_DAY;
    case 'weekly':
      return SECONDS_IN_DAY * 7;
    case 'monthly':
      return SECONDS_IN_DAY * 30;
    default:
      return SECONDS_IN_DAY;
  }
};

export default redisClient; 