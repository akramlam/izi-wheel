const https = require('https');

async function testWheelAPI() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    const url = `https://api.izikado.fr/public/company/${wheelId}`;
    
    console.log(`Testing API endpoint: ${url}`);
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('\n=== API Response ===');
                    console.log('Status Code:', res.statusCode);
                    
                    if (response.wheel) {
                        console.log('\nWheel Data:');
                        console.log('- ID:', response.wheel.id);
                        console.log('- Name:', response.wheel.name);
                        console.log('- Banner Image:', response.wheel.bannerImage || 'Not configured');
                        console.log('- Background Image:', response.wheel.backgroundImage || 'Not configured');
                        console.log('- Social Network:', response.wheel.socialNetwork);
                        console.log('- Redirect URL:', response.wheel.redirectUrl);
                        console.log('- Slots count:', response.wheel.slots?.length || 0);
                        
                        // Check if images are present
                        if (response.wheel.bannerImage && response.wheel.backgroundImage) {
                            console.log('\n✅ SUCCESS: Both images are present in the API response!');
                        } else {
                            console.log('\n❌ ISSUE: Images are missing from the API response');
                            console.log('Full wheel object keys:', Object.keys(response.wheel));
                        }
                    } else {
                        console.log('❌ No wheel data in response');
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
testWheelAPI().catch(console.error); 