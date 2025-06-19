const https = require('https');

async function comprehensivePrizeTest() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('🔬 COMPREHENSIVE PRIZE MISMATCH TEST');
    console.log('=====================================\n');
    
    // Step 1: Get wheel data
    console.log('1. Fetching wheel data...');
    const wheelData = await getWheelData(wheelId);
    
    if (!wheelData || !wheelData.wheel || !wheelData.wheel.slots) {
        console.log('❌ Failed to get wheel data');
        return;
    }
    
    console.log(`✅ Wheel: "${wheelData.wheel.name}" with ${wheelData.wheel.slots.length} slots`);
    
    // Step 2: Analyze current slot positions
    console.log('\n2. Analyzing slot positions...');
    const slots = wheelData.wheel.slots;
    
    console.log('Current slots (API order):');
    slots.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" - Position: ${slot.position}, ID: ${slot.id.substring(0, 8)}...`);
    });
    
    // Check position distribution
    const positions = slots.map(s => s.position);
    const uniquePositions = [...new Set(positions)];
    
    if (uniquePositions.length === 1) {
        console.log(`\n⚠️  CRITICAL: All slots have position ${uniquePositions[0]} - sorting is unstable!`);
    } else {
        console.log(`\n✅ Positions vary: ${positions.join(', ')}`);
    }
    
    // Step 3: Simulate different frontend sorting behaviors
    console.log('\n3. Simulating different frontend sorting scenarios...');
    
    // Scenario A: Standard sort (current implementation)
    const sortA = [...slots].sort((a, b) => 
        (a.position !== undefined ? a.position : 999) - (b.position !== undefined ? b.position : 999)
    );
    
    // Scenario B: Stable sort with ID as tiebreaker
    const sortB = [...slots].sort((a, b) => {
        const posA = a.position !== undefined ? a.position : 999;
        const posB = b.position !== undefined ? b.position : 999;
        if (posA === posB) {
            return a.id.localeCompare(b.id); // Stable tiebreaker
        }
        return posA - posB;
    });
    
    // Scenario C: Reverse the original order (simulate different browser behavior)
    const sortC = [...slots].reverse();
    
    console.log('\nScenario A (Current frontend):');
    sortA.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" (${slot.id.substring(0, 8)}...)`);
    });
    
    console.log('\nScenario B (Stable sort):');
    sortB.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" (${slot.id.substring(0, 8)}...)`);
    });
    
    console.log('\nScenario C (Reversed):');
    sortC.forEach((slot, index) => {
        console.log(`   [${index}] "${slot.label}" (${slot.id.substring(0, 8)}...)`);
    });
    
    // Step 4: Test spins and check for mismatches across scenarios
    console.log('\n4. Testing spins across different sorting scenarios...');
    
    const testResults = [];
    
    for (let spin = 1; spin <= 15; spin++) {
        console.log(`\n--- Spin ${spin} ---`);
        
        try {
            const spinResult = await spinWheel(wheelId);
            
            if (spinResult && spinResult.slot) {
                const backendSlot = spinResult.slot;
                console.log(`Backend returned: "${backendSlot.label}" (ID: ${backendSlot.id.substring(0, 8)}...)`);
                
                // Find indices in different scenarios
                const backendIndex = slots.findIndex(s => s.id === backendSlot.id);
                const indexA = sortA.findIndex(s => s.id === backendSlot.id);
                const indexB = sortB.findIndex(s => s.id === backendSlot.id);
                const indexC = sortC.findIndex(s => s.id === backendSlot.id);
                
                console.log(`Backend: ${backendIndex}, ScenarioA: ${indexA}, ScenarioB: ${indexB}, ScenarioC: ${indexC}`);
                
                const matchA = backendIndex === indexA;
                const matchB = backendIndex === indexB;
                const matchC = backendIndex === indexC;
                
                if (!matchA) console.log(`❌ MISMATCH A: Backend ${backendIndex} != Frontend ${indexA}`);
                if (!matchB) console.log(`❌ MISMATCH B: Backend ${backendIndex} != Stable ${indexB}`);
                if (!matchC) console.log(`❌ MISMATCH C: Backend ${backendIndex} != Reversed ${indexC}`);
                
                if (matchA && matchB && matchC) {
                    console.log(`✅ ALL MATCH: All scenarios point to same slot`);
                }
                
                testResults.push({
                    spin,
                    backendSlot: backendSlot.label,
                    backendIndex,
                    indexA,
                    indexB,
                    indexC,
                    matchA,
                    matchB,
                    matchC
                });
            } else {
                console.log('❌ Spin failed');
            }
        } catch (error) {
            console.log(`❌ Spin ${spin} error:`, error.message);
        }
        
        // Small delay between spins
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 5: Analyze results
    console.log('\n5. COMPREHENSIVE ANALYSIS');
    console.log('==========================');
    
    const totalSpins = testResults.length;
    const matchesA = testResults.filter(r => r.matchA).length;
    const matchesB = testResults.filter(r => r.matchB).length;
    const matchesC = testResults.filter(r => r.matchC).length;
    
    console.log(`Total successful spins: ${totalSpins}`);
    console.log(`Scenario A matches: ${matchesA}/${totalSpins} (${((matchesA/totalSpins)*100).toFixed(1)}%)`);
    console.log(`Scenario B matches: ${matchesB}/${totalSpins} (${((matchesB/totalSpins)*100).toFixed(1)}%)`);
    console.log(`Scenario C matches: ${matchesC}/${totalSpins} (${((matchesC/totalSpins)*100).toFixed(1)}%)`);
    
    // Identify which scenario is most consistent with backend
    if (matchesA === totalSpins) {
        console.log('\n✅ Current frontend sorting is CONSISTENT with backend');
    } else if (matchesB === totalSpins) {
        console.log('\n⚠️  Stable sorting would be CONSISTENT with backend');
        console.log('   Recommendation: Implement stable sorting with ID tiebreaker');
    } else if (matchesC === totalSpins) {
        console.log('\n⚠️  Reversed order would be CONSISTENT with backend');
        console.log('   This suggests backend is using reverse order');
    } else {
        console.log('\n❌ NO SORTING SCENARIO IS FULLY CONSISTENT');
        console.log('   This indicates a serious backend/frontend synchronization issue');
    }
    
    // Check for position uniformity issue
    if (uniquePositions.length === 1) {
        console.log('\n🔧 CRITICAL RECOMMENDATION:');
        console.log('   All slots have the same position value, making sorting unstable.');
        console.log('   This WILL cause intermittent mismatches depending on browser/JavaScript engine.');
        console.log('   MUST fix slot positions to have sequential values (0, 1, 2, 3, 4).');
    }
    
    // Show detailed mismatches
    const mismatches = testResults.filter(r => !r.matchA);
    if (mismatches.length > 0) {
        console.log('\n📋 DETAILED MISMATCH ANALYSIS:');
        mismatches.forEach(result => {
            console.log(`   Spin ${result.spin}: "${result.backendSlot}" - Backend[${result.backendIndex}] vs Frontend[${result.indexA}]`);
        });
    }
    
    return {
        totalSpins,
        currentMatches: matchesA,
        stableMatches: matchesB,
        reversedMatches: matchesC,
        positionsUniform: uniquePositions.length === 1,
        mismatches: mismatches.length
    };
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
            email: `test${Date.now()}@test.com`
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

// Run the comprehensive test
comprehensivePrizeTest().catch(console.error); 