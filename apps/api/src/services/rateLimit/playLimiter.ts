import { PlayLimit } from '@prisma/client';
import { redisClient } from '../../utils/redis';

/**
 * PlayLimiter - Redis-based rate limiting for wheel plays
 * Prevents spam and enforces PlayLimit rules (UNLIMITED/ONCE_PER_DAY/ONCE_PER_MONTH)
 */
export class PlayLimiter {
  /**
   * Check if IP can play wheel based on PlayLimit setting
   * @param wheelId - Wheel ID
   * @param ip - Client IP address
   * @param limit - Play limit type
   * @returns true if allowed to play
   */
  async canPlay(wheelId: string, ip: string, limit: PlayLimit): Promise<boolean> {
    if (limit === 'UNLIMITED') {
      return true;
    }

    const key = this.getKey(wheelId, ip, limit);

    try {
      // Increment counter atomically
      const count = await redisClient.incr(key);

      if (count === 1) {
        // First play, set TTL
        const ttl = this.getTTL(limit);
        await redisClient.expire(key, ttl);
        console.log(`🔒 Rate limit set for ${key}, TTL: ${ttl}s`);
      }

      // Only first increment (count === 1) is allowed
      const allowed = count === 1;

      if (!allowed) {
        console.warn(`❌ Rate limit exceeded for ${key}, count: ${count}`);
      }

      return allowed;
    } catch (error) {
      console.error('Redis error in PlayLimiter:', error);
      // Fail open - allow play if Redis is down (graceful degradation)
      return true;
    }
  }

  /**
   * Get remaining time until user can play again
   * @param wheelId - Wheel ID
   * @param ip - Client IP address
   * @param limit - Play limit type
   * @returns Seconds until next play, or null if can play now
   */
  async getTimeUntilNextPlay(wheelId: string, ip: string, limit: PlayLimit): Promise<number | null> {
    if (limit === 'UNLIMITED') {
      return null;
    }

    const key = this.getKey(wheelId, ip, limit);

    try {
      const exists = await redisClient.exists(key);

      if (!exists) {
        return null; // Can play now
      }

      const ttl = await redisClient.ttl(key);
      return ttl > 0 ? ttl : null;
    } catch (error) {
      console.error('Redis error getting TTL:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for a specific IP (admin function)
   * @param wheelId - Wheel ID
   * @param ip - Client IP address
   * @param limit - Play limit type
   */
  async reset(wheelId: string, ip: string, limit: PlayLimit): Promise<void> {
    const key = this.getKey(wheelId, ip, limit);

    try {
      await redisClient.del(key);
      console.log(`🔓 Rate limit reset for ${key}`);
    } catch (error) {
      console.error('Redis error resetting rate limit:', error);
    }
  }

  /**
   * Get statistics about rate limiting
   * @param wheelId - Wheel ID
   * @returns Rate limit statistics
   */
  async getStats(wheelId: string): Promise<{ dailyPlays: number; monthlyPlays: number }> {
    try {
      const pattern = `ratelimit:${wheelId}:*`;
      const keys = await redisClient.keys(pattern);

      const dailyKeys = keys.filter(k => k.includes(':day:'));
      const monthlyKeys = keys.filter(k => k.includes(':month:'));

      return {
        dailyPlays: dailyKeys.length,
        monthlyPlays: monthlyKeys.length
      };
    } catch (error) {
      console.error('Redis error getting stats:', error);
      return { dailyPlays: 0, monthlyPlays: 0 };
    }
  }

  /**
   * Build Redis key for rate limiting
   * @param wheelId - Wheel ID
   * @param ip - Client IP
   * @param limit - Play limit type
   * @returns Redis key
   */
  private getKey(wheelId: string, ip: string, limit: PlayLimit): string {
    const period = this.getPeriod(limit);
    const date = this.getDateKey(limit);
    return `ratelimit:${wheelId}:${ip}:${period}:${date}`;
  }

  /**
   * Get period identifier (day or month)
   * @param limit - Play limit type
   * @returns Period string
   */
  private getPeriod(limit: PlayLimit): string {
    switch (limit) {
      case 'ONCE_PER_DAY':
        return 'day';
      case 'ONCE_PER_MONTH':
        return 'month';
      default:
        return 'unlimited';
    }
  }

  /**
   * Get date key for rate limit bucket
   * @param limit - Play limit type
   * @returns Date string (YYYY-MM-DD or YYYY-MM)
   */
  private getDateKey(limit: PlayLimit): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    if (limit === 'ONCE_PER_DAY') {
      return `${year}-${month}-${day}`;
    } else if (limit === 'ONCE_PER_MONTH') {
      return `${year}-${month}`;
    }

    return 'unlimited';
  }

  /**
   * Get TTL (time to live) in seconds
   * @param limit - Play limit type
   * @returns TTL in seconds
   */
  private getTTL(limit: PlayLimit): number {
    switch (limit) {
      case 'ONCE_PER_DAY':
        return 86400; // 24 hours
      case 'ONCE_PER_MONTH':
        return 2592000; // 30 days
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const playLimiter = new PlayLimiter();
