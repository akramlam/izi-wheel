import QRCode from 'qrcode';

/**
 * Generates a QR code for the given text
 * @param text The text to encode in the QR code
 * @returns A data URL containing the QR code image
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    // Add cache-busting parameter to the text if it's a URL
    const textWithCacheBuster = text.includes('http') 
      ? text + (text.includes('?') ? '&cb=' : '?cb=') + Date.now() 
      : text;
    
    const options: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000', // Black dots
        light: '#ffffff' // White background
      }
    };
    
    const dataUrl = await QRCode.toDataURL(textWithCacheBuster, options);
    
    // Verify the data URL is valid
    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Generated QR code is not a valid data URL');
    }
    
    console.log(`QR code generated for: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    
    // Return a fallback QR code image with error info
    const fallbackQr = createFallbackQR(`Error: Unable to generate QR code for ${text.substring(0, 20)}...`);
    return fallbackQr;
  }
}

/**
 * Creates a fallback data URL for when QR code generation fails
 */
function createFallbackQR(errorMessage: string): string {
  // Simple SVG with error message
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <rect width="300" height="300" fill="#ffffff" />
    <g>
      <rect x="20" y="20" width="260" height="260" fill="#f1f1f1" stroke="#cccccc" stroke-width="2" />
      <text x="150" y="100" font-size="16" text-anchor="middle" font-family="system-ui, sans-serif" fill="#ff0000">QR Code Error</text>
      <text x="150" y="150" font-size="12" text-anchor="middle" font-family="system-ui, sans-serif" fill="#666666">${errorMessage}</text>
      <rect x="75" y="180" width="150" height="40" rx="4" fill="#dddddd" />
      <text x="150" y="205" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif" fill="#333333">Please try again</text>
    </g>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
} 