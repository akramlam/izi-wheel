const { generateQRCode } = require('./apps/api/dist/utils/qrcode');

async function testQRGeneration() {
  try {
    console.log('Testing QR code generation...');
    
    // Test URL that would be used for prize redemption
    const testUrl = 'https://roue.izikado.fr/redeem/test-play-id-123';
    
    console.log('Generating QR code for:', testUrl);
    const qrCode = await generateQRCode(testUrl);
    
    console.log('QR code generated successfully!');
    console.log('QR code type:', qrCode.startsWith('data:image/png;base64,') ? 'PNG Data URL' : 'Unknown format');
    console.log('QR code length:', qrCode.length, 'characters');
    console.log('QR code preview (first 100 chars):', qrCode.substring(0, 100) + '...');
    
    // Test if it's a valid data URL
    if (qrCode.startsWith('data:image/')) {
      console.log('✅ QR code is a valid data URL that can be used in emails');
    } else {
      console.log('❌ QR code is not a data URL - emails will not display it properly');
    }
    
  } catch (error) {
    console.error('❌ QR code generation failed:', error);
  }
}

testQRGeneration(); 