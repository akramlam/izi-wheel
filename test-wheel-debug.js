const https = require('https');

async function debugWheelOrdering() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('=== DEBUGGING WHEEL ORDERING AND PRIZE SELECTION ===\n');
    
    // 1. Get wheel data from API
    console.log('1. Fetching wheel data from API...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel || !wheelData.wheel.slots) {
        console.error('Failed to get wheel data');
        return;
    }
    
    console.log('\n2. FRONTEND WHEEL SEGMENTS (as they appear on the wheel):');
    const frontendSegments = wheelData.wheel.slots
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .map((slot, index) => ({
            frontendIndex: index,
            id: slot.id,
            label: slot.label,
            position: slot.position,
            isWinning: slot.isWinning,
            weight: slot.weight
        }));
    
    frontendSegments.forEach(segment => {
        console.log(`  Index ${segment.frontendIndex}: "${segment.label}" (ID: ${segment.id}, Position: ${segment.position}, Winning: ${segment.isWinning})`);
    });
    
    console.log('\n3. BACKEND SLOTS (as returned by API):');
    wheelData.wheel.slots.forEach((slot, index) => {
        console.log(`  API Index ${index}: "${slot.label}" (ID: ${slot.id}, Position: ${slot.position}, Winning: ${slot.isWinning})`);
    });
    
    // 3. Test spinning the wheel multiple times
    console.log('\n4. TESTING WHEEL SPINS (5 attempts):');
    for (let i = 1; i <= 5; i++) {
        console.log(`\n--- Spin ${i} ---`);
        try {
            const spinResult = await spinWheel(wheelId);
            
            if (spinResult && spinResult.slot) {
                const backendSlot = spinResult.slot;
                console.log(`Backend returned: "${backendSlot.label}" (ID: ${backendSlot.id})`);
                
                // Find where this slot appears in the frontend segments
                const frontendIndex = frontendSegments.findIndex(seg => seg.id === backendSlot.id);
                
                if (frontendIndex === -1) {
                    console.log(`❌ CRITICAL ERROR: Backend slot ID ${backendSlot.id} NOT FOUND in frontend segments!`);
                } else {
                    const frontendSegment = frontendSegments[frontendIndex];
                    console.log(`✅ Frontend should show: Index ${frontendIndex} - "${frontendSegment.label}"`);
                    
                    if (frontendSegment.label === backendSlot.label) {
                        console.log(`✅ MATCH: Labels match perfectly`);
                    } else {
                        console.log(`❌ MISMATCH: Frontend shows "${frontendSegment.label}" but backend says "${backendSlot.label}"`);
                    }
                }
            } else {
                console.log('❌ Failed to get spin result');
            }
        } catch (error) {
            console.log(`❌ Spin ${i} failed:`, error.message);
        }
        
        // Wait a bit between spins
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== ANALYSIS COMPLETE ===');
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
            name: "Test User",
            email: "test@example.com"
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
debugWheelOrdering().catch(console.error); 