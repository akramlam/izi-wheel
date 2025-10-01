import crypto from 'crypto';
import prisma from '../../utils/db';

/**
 * PINGenerator - Generates cryptographically secure 8-digit PINs
 * Collision probability: 1 in 100,000,000
 */
export class PINGenerator {
  private readonly PIN_LENGTH = 8;
  private readonly MIN_VALUE = 10000000; // 10,000,000
  private readonly MAX_VALUE = 99999999; // 99,999,999
  private readonly MAX_RETRIES = 5;

  /**
   * Generate a cryptographically secure 8-digit PIN
   * @returns 8-digit PIN as string
   */
  generate(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);

    // Map to 8-digit range
    const range = this.MAX_VALUE - this.MIN_VALUE + 1;
    const pin = (num % range) + this.MIN_VALUE;

    return pin.toString();
  }

  /**
   * Validate PIN format
   * @param pin - PIN to validate
   * @returns true if valid format
   */
  validate(pin: string): boolean {
    if (!pin || typeof pin !== 'string') {
      return false;
    }

    // Must be exactly 8 digits
    const pinRegex = /^\d{8}$/;
    return pinRegex.test(pin);
  }

  /**
   * Generate a unique PIN (not already in database)
   * @param retries - Current retry count
   * @returns Unique PIN
   */
  async generateUnique(retries = 0): Promise<string> {
    if (retries >= this.MAX_RETRIES) {
      throw new Error(`Failed to generate unique PIN after ${this.MAX_RETRIES} attempts`);
    }

    const pin = this.generate();

    // Check if PIN already exists
    const existing = await prisma.play.findFirst({
      where: { pin },
      select: { id: true }
    });

    if (existing) {
      console.warn(`PIN collision detected: ${pin}, retrying...`);
      return this.generateUnique(retries + 1);
    }

    return pin;
  }

  /**
   * Verify PIN matches expected format and value
   * @param inputPin - User-provided PIN
   * @param expectedPin - Expected PIN from database
   * @returns true if match
   */
  verify(inputPin: string, expectedPin: string): boolean {
    if (!this.validate(inputPin) || !this.validate(expectedPin)) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(inputPin),
      Buffer.from(expectedPin)
    );
  }

  /**
   * Get PIN strength metrics (for testing/monitoring)
   * @returns Metrics about PIN generation
   */
  getStrengthMetrics() {
    const combinations = this.MAX_VALUE - this.MIN_VALUE + 1;
    const bitsOfEntropy = Math.log2(combinations);

    return {
      combinations,
      bitsOfEntropy: bitsOfEntropy.toFixed(2),
      bruteForceTime: this.estimateBruteForceTime(combinations)
    };
  }

  /**
   * Estimate time to brute force (assuming 1000 attempts/second)
   * @param combinations - Total possible combinations
   * @returns Human-readable time estimate
   */
  private estimateBruteForceTime(combinations: number): string {
    const attemptsPerSecond = 1000; // Rate limited to prevent brute force
    const secondsToBreak = combinations / (2 * attemptsPerSecond); // Average case

    const days = secondsToBreak / 86400;

    if (days < 1) {
      return `${(secondsToBreak / 3600).toFixed(1)} hours`;
    } else if (days < 365) {
      return `${days.toFixed(1)} days`;
    } else {
      return `${(days / 365).toFixed(1)} years`;
    }
  }
}

// Export singleton instance
export const pinGenerator = new PINGenerator();
