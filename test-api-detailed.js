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
                    console.log('\n=== API Response Analysis ===');
                    console.log('Status Code:', res.statusCode);
                    
                    if (response.wheel) {
                        console.log('\nWheel Data:');
                        console.log('- ID:', response.wheel.id);
                        console.log('- Name:', response.wheel.name);
                        
                        // Check all possible fields
                        const fields = [
                            'bannerImage', 'backgroundImage', 'gameRules', 'footerText', 
                            'mainTitle', 'formSchema', 'socialNetwork', 'redirectUrl', 
                            'redirectText', 'playLimit'
                        ];
                        
                        console.log('\nField Analysis:');
                        fields.forEach(field => {
                            const value = response.wheel[field];
                            const status = value !== undefined ? 
                                (value !== null ? '✅ Present' : '⚠️  Null') : 
                                '❌ Missing';
                            console.log(`- ${field}: ${status} ${value !== undefined ? `(${typeof value})` : ''}`);
                            if (value !== undefined && value !== null) {
                                console.log(`  Value: ${typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : JSON.stringify(value)}`);
                            }
                        });
                        
                        console.log('\nAll response keys:', Object.keys(response.wheel));
                        
                        // Raw JSON analysis
                        console.log('\nRaw JSON contains bannerImage:', data.includes('bannerImage'));
                        console.log('Raw JSON contains backgroundImage:', data.includes('backgroundImage'));
                        
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