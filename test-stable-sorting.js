const https = require('https');

async function testStableSorting() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('🧪 STABLE SORTING TEST');
    console.log('======================\n');
    
    // Get wheel data
    console.log('1. Getting wheel data...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel || !wheelData.wheel.slots) {
        console.log('❌ Failed to get wheel data');
        return;
    }
    
    const slots = wheelData.wheel.slots;
    console.log(`✅ Found ${slots.length} slots\n`);
    
    // Show original API order (backend order)
    console.log('2. Backend order (API response):');
    slots.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Simulate the EXACT stable sorting from the frontend
    console.log('\n3. Frontend stable sorting simulation:');
    const stableSortedSlots = [...slots].sort((a, b) => {
        const posA = a.position !== undefined ? a.position : 999;
        const posB = b.position !== undefined ? b.position : 999;
        
        // If positions are equal, use slot ID as stable tiebreaker
        if (posA === posB) {
            return a.id.localeCompare(b.id);
        }
        
        return posA - posB;
    });
    
    console.log('Frontend sorted order (stable):');
    stableSortedSlots.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Create mapping from backend to frontend indices
    console.log('\n4. Index mapping (Backend → Frontend):');
    slots.forEach((slot, backendIndex) => {
        const frontendIndex = stableSortedSlots.findIndex(s => s.id === slot.id);
        console.log(`   Backend[${backendIndex}] "${slot.label}" → Frontend[${frontendIndex}]`);
    });
    
    // Test the specific case from the logs
    console.log('\n5. Testing the specific mismatch case:');
    const lot4BackendIndex = slots.findIndex(s => s.label === 'Lot 4');
    const lot4FrontendIndex = stableSortedSlots.findIndex(s => s.label === 'Lot 4');
    
    console.log(`Lot 4 - Backend index: ${lot4BackendIndex}, Frontend index: ${lot4FrontendIndex}`);
    
    if (lot4BackendIndex !== lot4FrontendIndex) {
        console.log('❌ MISMATCH DETECTED!');
        console.log(`   Backend expects wheel to show slot ${lot4BackendIndex}`);
        console.log(`   But frontend shows it at slot ${lot4FrontendIndex}`);
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('   Either:');
        console.log('   1. Frontend needs to be redeployed with stable sorting');
        console.log('   2. Backend needs to use the same stable sorting logic');
        console.log('   3. Browser cache needs to be cleared');
    } else {
        console.log('✅ NO MISMATCH - Backend and frontend indices match');
    }
    
    // Test a few spins to see current behavior
    console.log('\n6. Testing current wheel behavior:');
    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- Test Spin ${i} ---`);
        try {
            const spinResult = await spinWheel(wheelId);
            
            if (spinResult && spinResult.slot) {
                const backendSlot = spinResult.slot;
                const backendIndex = slots.findIndex(s => s.id === backendSlot.id);
                const frontendStableIndex = stableSortedSlots.findIndex(s => s.id === backendSlot.id);
                
                console.log(`Backend returned: "${backendSlot.label}"`);
                console.log(`Backend index: ${backendIndex}`);
                console.log(`Frontend stable index: ${frontendStableIndex}`);
                
                if (backendIndex === frontendStableIndex) {
                    console.log('✅ MATCH - Indices align');
                } else {
                    console.log('❌ MISMATCH - Indices do not align');
                    console.log(`   User will see wrong prize if frontend uses stable sorting`);
                }
            }
        } catch (error) {
            console.log(`❌ Spin ${i} failed:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n7. RECOMMENDATIONS:');
    console.log('==================');
    
    if (lot4BackendIndex !== lot4FrontendIndex) {
        console.log('🚨 CRITICAL: Mismatch detected between backend and stable frontend sorting');
        console.log('\nImmediate actions needed:');
        console.log('1. Check if frontend is deployed with stable sorting changes');
        console.log('2. Clear browser cache and test again');
        console.log('3. Consider updating backend to use same stable sorting');
        console.log('4. Or fix slot positions to be sequential (0,1,2,3,4)');
    } else {
        console.log('✅ Backend and stable frontend sorting are aligned');
        console.log('Issue may be:');
        console.log('1. Frontend not deployed yet');
        console.log('2. Browser cache serving old version');
        console.log('3. Different sorting being used in actual wheel component');
    }
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
            name: "Stable Sort Test",
            email: `stable-test${Date.now()}@test.com`
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

testStableSorting().catch(console.error); 