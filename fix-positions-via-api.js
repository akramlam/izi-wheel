const https = require('https');

async function fixPositionsViaAPI() {
    const wheelId = '5a90c5bc-97ee-4f0a-a0af-e27f0a5fbeb9';
    
    console.log('🔧 FIXING SLOT POSITIONS VIA API');
    console.log('=================================\n');
    
    // Step 1: Get current wheel data
    console.log('1. Getting current wheel data...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel || !wheelData.wheel.slots) {
        console.log('❌ Failed to get wheel data');
        return;
    }
    
    console.log(`✅ Found wheel "${wheelData.wheel.name}" with ${wheelData.wheel.slots.length} slots`);
    
    const slots = wheelData.wheel.slots;
    console.log('\nCurrent slot positions:');
    slots.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Step 2: Check if positions need fixing
    const positions = slots.map(s => s.position);
    const uniquePositions = [...new Set(positions)];
    
    if (uniquePositions.length > 1 && positions.every((pos, index) => pos === index)) {
        console.log('\n✅ Positions are already correct (0, 1, 2, 3, 4...)');
        return;
    }
    
    console.log(`\n⚠️  Positions need fixing. Current unique positions: ${uniquePositions.join(', ')}`);
    
    // Step 3: Create position update requests
    console.log('\n2. Updating slot positions...');
    
    const updatePromises = slots.map(async (slot, index) => {
        const newPosition = index; // Set position to match array index
        
        console.log(`   Updating "${slot.label}" from position ${slot.position} to ${newPosition}...`);
        
        try {
            const result = await updateSlotPosition(slot.id, newPosition);
            console.log(`   ✅ Updated "${slot.label}" to position ${newPosition}`);
            return { success: true, slot: slot.label, newPosition };
        } catch (error) {
            console.log(`   ❌ Failed to update "${slot.label}": ${error.message}`);
            return { success: false, slot: slot.label, error: error.message };
        }
    });
    
    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Step 4: Verify results
    console.log('\n3. Verification...');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`   Successful updates: ${successful}/${slots.length}`);
    console.log(`   Failed updates: ${failed}/${slots.length}`);
    
    if (failed > 0) {
        console.log('\n❌ Some updates failed:');
        results.filter(r => !r.success).forEach(result => {
            console.log(`   - ${result.slot}: ${result.error}`);
        });
    }
    
    // Step 5: Verify with fresh API call
    if (successful === slots.length) {
        console.log('\n4. Final verification...');
        
        // Wait a moment for changes to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedWheelData = await getWheelData(wheelId);
        
        if (updatedWheelData && updatedWheelData.wheel && updatedWheelData.wheel.slots) {
            console.log('\nUpdated slot positions:');
            updatedWheelData.wheel.slots.forEach((slot, index) => {
                console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
            });
            
            const newPositions = updatedWheelData.wheel.slots.map(s => s.position);
            const isSequential = newPositions.every((pos, index) => pos === index);
            
            if (isSequential) {
                console.log('\n✅ SUCCESS! All positions are now sequential (0, 1, 2, 3, 4...)');
                console.log('   The wheel sorting will now be stable and consistent.');
            } else {
                console.log('\n⚠️  Positions are not sequential yet. May need manual intervention.');
                console.log(`   Current positions: ${newPositions.join(', ')}`);
            }
        }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Test the wheel again to confirm prize matching');
    console.log('   2. The fix should prevent future browser-dependent mismatches');
    console.log('   3. All new wheels should use sequential positions from creation');
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

function updateSlotPosition(slotId, position) {
    const url = `https://api.izikado.fr/slot/${slotId}`;
    const postData = JSON.stringify({
        position: position
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'PUT',
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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (error) {
                        resolve({ success: true }); // Assume success if response is not JSON
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Run the fix
fixPositionsViaAPI().catch(console.error); 