import QRCode from 'qrcode';

/**
 * Generates a QR code for the given text
 * @param text The text to encode in the QR code
 * @returns A data URL containing the QR code image
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300
    };
    
    const dataUrl = await QRCode.toDataURL(text, options);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
} 