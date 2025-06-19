const https = require('https');

async function testDebugEndpoint() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    const url = `https://api.izikado.fr/public/debug/wheels/${wheelId}`;
    
    console.log(`Testing debug endpoint: ${url}`);
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('\n=== Debug Endpoint Response ===');
                    console.log('Status Code:', res.statusCode);
                    
                    if (response.debug) {
                        console.log('\nImage Fields Analysis:');
                        console.log('- Banner Image:', response.imageFields.bannerImage ? 'PRESENT' : 'MISSING');
                        console.log('- Background Image:', response.imageFields.backgroundImage ? 'PRESENT' : 'MISSING');
                        console.log('- Banner Image Type:', response.imageFields.bannerImageType);
                        console.log('- Background Image Type:', response.imageFields.backgroundImageType);
                        console.log('- Banner Image Length:', response.imageFields.bannerImageLength);
                        console.log('- Background Image Length:', response.imageFields.backgroundImageLength);
                        
                        if (response.imageFields.bannerImage) {
                            console.log('- Banner Image URL:', response.imageFields.bannerImage);
                        }
                        if (response.imageFields.backgroundImage) {
                            console.log('- Background Image URL:', response.imageFields.backgroundImage);
                        }
                        
                        console.log('\nRaw Wheel Object Keys:', Object.keys(response.rawWheel));
                        
                        // Check if the fields exist in the raw object
                        console.log('\nRaw Object Field Check:');
                        console.log('- bannerImage in rawWheel:', 'bannerImage' in response.rawWheel);
                        console.log('- backgroundImage in rawWheel:', 'backgroundImage' in response.rawWheel);
                        console.log('- bannerImage value:', response.rawWheel.bannerImage);
                        console.log('- backgroundImage value:', response.rawWheel.backgroundImage);
                        
                    } else {
                        console.log('❌ Not a debug response');
                        console.log('Response:', response);
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });
    });
}

// Run the test
testDebugEndpoint().catch(console.error); 