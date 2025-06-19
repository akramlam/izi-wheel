const https = require('https');

async function fixWheelPositions() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('=== FIXING WHEEL SLOT POSITIONS ===\n');
    
    // 1. Get current wheel data
    console.log('1. Fetching current wheel data...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel || !wheelData.wheel.slots) {
        console.error('Failed to get wheel data');
        return;
    }
    
    console.log('Current slots:');
    wheelData.wheel.slots.forEach((slot, index) => {
        console.log(`  ${index}: "${slot.label}" (ID: ${slot.id}, Position: ${slot.position})`);
    });
    
    // 2. Prepare the corrected slots with proper positions
    const correctedSlots = wheelData.wheel.slots.map((slot, index) => ({
        id: slot.id,
        label: slot.label,
        color: slot.color,
        weight: slot.weight,
        isWinning: slot.isWinning,
        position: index // Set position to match the current order
    }));
    
    console.log('\n2. Proposed corrected positions:');
    correctedSlots.forEach((slot, index) => {
        console.log(`  Position ${slot.position}: "${slot.label}" (ID: ${slot.id})`);
    });
    
    // 3. Update each slot with the correct position
    console.log('\n3. Updating slot positions...');
    
    for (let i = 0; i < correctedSlots.length; i++) {
        const slot = correctedSlots[i];
        console.log(`Updating "${slot.label}" to position ${slot.position}...`);
        
        try {
            await updateSlotPosition(slot.id, slot.position);
            console.log(`✅ Updated "${slot.label}" to position ${slot.position}`);
        } catch (error) {
            console.log(`❌ Failed to update "${slot.label}":`, error.message);
        }
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n4. Verifying the fix...');
    const updatedWheelData = await getWheelData(wheelId);
    
    if (updatedWheelData && updatedWheelData.wheel && updatedWheelData.wheel.slots) {
        console.log('Updated slots:');
        updatedWheelData.wheel.slots.forEach((slot, index) => {
            console.log(`  API Index ${index}: "${slot.label}" (Position: ${slot.position})`);
        });
        
        // Check if positions are now different
        const positions = updatedWheelData.wheel.slots.map(s => s.position);
        const uniquePositions = [...new Set(positions)];
        
        if (uniquePositions.length === updatedWheelData.wheel.slots.length) {
            console.log('\n✅ SUCCESS: All slots now have unique positions!');
        } else {
            console.log('\n❌ ISSUE: Some slots still have duplicate positions');
        }
    }
    
    console.log('\n=== POSITION FIX COMPLETE ===');
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
    const url = `https://api.izikado.fr/slots/${slotId}`;
    const postData = JSON.stringify({
        position: position
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': 'Bearer YOUR_AUTH_TOKEN' // This might need to be set
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
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
fixWheelPositions().catch(console.error); 