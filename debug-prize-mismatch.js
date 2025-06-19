const https = require('https');

async function debugPrizeMismatch() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('🔍 COMPREHENSIVE PRIZE MISMATCH DEBUG');
    console.log('=====================================\n');
    
    // Step 1: Test API connectivity
    console.log('1. Testing API connectivity...');
    try {
        const apiTest = await testApiConnectivity();
        if (!apiTest.success) {
            console.log('❌ API is not responding correctly');
            console.log('Response:', apiTest.response);
            return;
        }
        console.log('✅ API is responding\n');
    } catch (error) {
        console.log('❌ API connectivity failed:', error.message);
        return;
    }
    
    // Step 2: Get wheel data and analyze structure
    console.log('2. Analyzing wheel data structure...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel) {
        console.log('❌ Failed to get wheel data');
        return;
    }
    
    console.log(`✅ Wheel found: "${wheelData.wheel.name}"`);
    console.log(`   Slots count: ${wheelData.wheel.slots?.length || 0}`);
    
    if (!wheelData.wheel.slots || wheelData.wheel.slots.length === 0) {
        console.log('❌ No slots found in wheel');
        return;
    }
    
    // Step 3: Analyze slot ordering and positions
    console.log('\n3. Analyzing slot ordering...');
    console.log('Raw slots from API (in order received):');
    wheelData.wheel.slots.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Step 4: Simulate frontend sorting
    console.log('\n4. Frontend sorting simulation...');
    const frontendSorted = [...wheelData.wheel.slots].sort((a, b) => 
        (a.position !== undefined ? a.position : 999) - (b.position !== undefined ? b.position : 999)
    );
    
    console.log('Frontend sorted order (what user sees on wheel):');
    frontendSorted.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Step 5: Check if all positions are the same
    const positions = wheelData.wheel.slots.map(s => s.position);
    const uniquePositions = [...new Set(positions)];
    
    if (uniquePositions.length === 1) {
        console.log(`\n⚠️  CRITICAL ISSUE: All slots have the same position (${uniquePositions[0]})`);
        console.log('   This means frontend sorting is unpredictable!');
        console.log('   Backend will select by API order, frontend will display in random order');
    } else {
        console.log(`\n✅ Positions are varied: ${positions.join(', ')}`);
    }
    
    // Step 6: Test multiple spins and track results
    console.log('\n5. Testing wheel spins and tracking mismatches...');
    const spinResults = [];
    
    for (let i = 1; i <= 10; i++) {
        console.log(`\n--- Spin ${i} ---`);
        try {
            const spinResult = await spinWheel(wheelId);
            
            if (spinResult && spinResult.slot) {
                const backendSlot = spinResult.slot;
                console.log(`Backend returned: "${backendSlot.label}" (ID: ${backendSlot.id.substring(0, 8)}...)`);
                
                // Find this slot in the API order (backend order)
                const backendIndex = wheelData.wheel.slots.findIndex(s => s.id === backendSlot.id);
                
                // Find this slot in the frontend sorted order
                const frontendIndex = frontendSorted.findIndex(s => s.id === backendSlot.id);
                
                console.log(`Backend index: ${backendIndex}, Frontend index: ${frontendIndex}`);
                
                if (backendIndex !== frontendIndex) {
                    console.log(`❌ MISMATCH! Backend slot ${backendIndex} != Frontend slot ${frontendIndex}`);
                    console.log(`   User sees: "${frontendSorted[frontendIndex]?.label}" at position ${frontendIndex}`);
                    console.log(`   But wins: "${backendSlot.label}"`);
                } else {
                    console.log(`✅ MATCH! Both point to slot ${backendIndex}`);
                }
                
                spinResults.push({
                    spin: i,
                    backendSlot: backendSlot.label,
                    backendIndex,
                    frontendIndex,
                    match: backendIndex === frontendIndex
                });
            } else {
                console.log('❌ Spin failed or no result');
            }
        } catch (error) {
            console.log(`❌ Spin ${i} error:`, error.message);
        }
        
        // Small delay between spins
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 7: Analyze results
    console.log('\n6. RESULTS ANALYSIS');
    console.log('===================');
    
    const matches = spinResults.filter(r => r.match).length;
    const mismatches = spinResults.filter(r => !r.match).length;
    
    console.log(`Total spins: ${spinResults.length}`);
    console.log(`Matches: ${matches}`);
    console.log(`Mismatches: ${mismatches}`);
    console.log(`Mismatch rate: ${((mismatches / spinResults.length) * 100).toFixed(1)}%`);
    
    if (mismatches > 0) {
        console.log('\n❌ PRIZE MISMATCH CONFIRMED!');
        console.log('\nMismatch details:');
        spinResults.filter(r => !r.match).forEach(result => {
            console.log(`   Spin ${result.spin}: Backend="${result.backendSlot}" (${result.backendIndex}) vs Frontend (${result.frontendIndex})`);
        });
        
        console.log('\n🔧 RECOMMENDED FIXES:');
        if (uniquePositions.length === 1) {
            console.log('1. Fix slot positions - all slots have the same position value');
            console.log('2. Run the position fix script to assign proper sequential positions');
        }
        console.log('3. Ensure backend uses the same sorting logic as frontend');
        console.log('4. Consider using slot IDs for consistent ordering');
    } else {
        console.log('\n✅ NO MISMATCHES DETECTED!');
        console.log('   The wheel appears to be working correctly');
    }
}

async function testApiConnectivity() {
    const url = 'https://api.izikado.fr/public/company/f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        JSON.parse(data);
                        resolve({ success: true });
                    } catch (error) {
                        resolve({ success: false, response: data });
                    }
                } else {
                    resolve({ success: false, response: `HTTP ${res.statusCode}: ${data}` });
                }
            });
        }).on('error', (error) => {
            resolve({ success: false, response: error.message });
        });
    });
}

function getWheelData(wheelId) {
    const url = `https://api.izikado.fr/public/company/${wheelId}`;
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

function spinWheel(wheelId) {
    const url = `https://api.izikado.fr/public/company/${wheelId}/spin`;
    const postData = JSON.stringify({
        lead: {
            name: "Debug User",
            email: `debug${Date.now()}@test.com`
        }
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Run the debug
debugPrizeMismatch().catch(console.error); 