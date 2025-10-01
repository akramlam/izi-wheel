import QRCode from 'qrcode';

/**
 * QRCodeGenerator - Generates QR codes for prize redemption
 * Format: https://roue.izikado.fr/redeem/{playId}?v=2
 */
export class QRCodeGenerator {
  private readonly baseUrl: string;
  private readonly version = '2';

  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://roue.izikado.fr';
  }

  /**
   * Generate QR code with embedded redemption URL
   * @param playId - Play ID to encode
   * @returns Base64 data URL of QR code image
   */
  async generate(playId: string): Promise<string> {
    if (!playId || typeof playId !== 'string') {
      throw new Error('Invalid playId provided');
    }

    const redemptionUrl = this.buildRedemptionUrl(playId);

    const options: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'H', // 30% error recovery - works even if damaged
      type: 'image/png',
      margin: 2,
      width: 512, // High resolution for printing
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    try {
      const dataUrl = await QRCode.toDataURL(redemptionUrl, options);

      console.log(`✅ QR code generated for playId: ${playId}`);

      return dataUrl;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Generate QR code as buffer (for file storage)
   * @param playId - Play ID to encode
   * @returns PNG buffer
   */
  async generateBuffer(playId: string): Promise<Buffer> {
    if (!playId || typeof playId !== 'string') {
      throw new Error('Invalid playId provided');
    }

    const redemptionUrl = this.buildRedemptionUrl(playId);

    const options: QRCode.QRCodeToBufferOptions = {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 512,
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF'
      }
    };

    try {
      return await QRCode.toBuffer(redemptionUrl, options);
    } catch (error) {
      console.error('Failed to generate QR code buffer:', error);
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Build redemption URL with version parameter
   * @param playId - Play ID
   * @returns Full redemption URL
   */
  private buildRedemptionUrl(playId: string): string {
    return `${this.baseUrl}/redeem/${playId}?v=${this.version}`;
  }

  /**
   * Validate QR code can be scanned (for testing)
   * @param dataUrl - QR code data URL
   * @returns true if valid format
   */
  validateFormat(dataUrl: string): boolean {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return false;
    }

    // Check if it's a valid data URL
    return dataUrl.startsWith('data:image/png;base64,');
  }

  /**
   * Get QR code configuration info
   * @returns Configuration details
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      version: this.version,
      errorCorrectionLevel: 'H (30%)',
      resolution: '512x512px',
      format: 'PNG'
    };
  }
}

// Export singleton instance
export const qrCodeGenerator = new QRCodeGenerator();
