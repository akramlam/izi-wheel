const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWheelPositions() {
    const wheelId = 'f2733341-e54b-40ed-b45f-089c9ddb1490';
    
    console.log('=== FIXING WHEEL SLOT POSITIONS (DATABASE) ===\n');
    
    try {
        // 1. Get current wheel data
        console.log('1. Fetching current wheel and slots from database...');
        const wheel = await prisma.wheel.findUnique({
            where: { id: wheelId },
            include: {
                slots: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' } // Order by creation time to get original order
                }
            }
        });
        
        if (!wheel || !wheel.slots) {
            console.error('Wheel not found or has no slots');
            return;
        }
        
        console.log(`Found wheel: "${wheel.name}" with ${wheel.slots.length} slots`);
        console.log('Current slots (ordered by creation time):');
        wheel.slots.forEach((slot, index) => {
            console.log(`  ${index}: "${slot.label}" (ID: ${slot.id}, Current Position: ${slot.position})`);
        });
        
        // 2. Update positions to match the creation order
        console.log('\n2. Updating slot positions to match logical order...');
        
        for (let i = 0; i < wheel.slots.length; i++) {
            const slot = wheel.slots[i];
            const newPosition = i;
            
            console.log(`Updating "${slot.label}" from position ${slot.position} to position ${newPosition}...`);
            
            await prisma.slot.update({
                where: { id: slot.id },
                data: { position: newPosition }
            });
            
            console.log(`✅ Updated "${slot.label}" to position ${newPosition}`);
        }
        
        // 3. Verify the fix
        console.log('\n3. Verifying the fix...');
        const updatedWheel = await prisma.wheel.findUnique({
            where: { id: wheelId },
            include: {
                slots: {
                    where: { isActive: true },
                    orderBy: { position: 'asc' } // Now order by position
                }
            }
        });
        
        if (updatedWheel && updatedWheel.slots) {
            console.log('Updated slots (ordered by position):');
            updatedWheel.slots.forEach((slot, index) => {
                console.log(`  Position ${slot.position}: "${slot.label}" (ID: ${slot.id})`);
            });
            
            // Check if positions are now sequential and unique
            const positions = updatedWheel.slots.map(s => s.position);
            const expectedPositions = Array.from({length: positions.length}, (_, i) => i);
            
            const positionsMatch = JSON.stringify(positions.sort()) === JSON.stringify(expectedPositions);
            
            if (positionsMatch) {
                console.log('\n✅ SUCCESS: All slots now have correct sequential positions!');
                console.log('The wheel should now display prizes correctly.');
            } else {
                console.log('\n❌ ISSUE: Positions are not sequential');
                console.log('Expected:', expectedPositions);
                console.log('Actual:', positions);
            }
        }
        
    } catch (error) {
        console.error('Error fixing wheel positions:', error);
    } finally {
        await prisma.$disconnect();
    }
    
    console.log('\n=== POSITION FIX COMPLETE ===');
}

// Run the fix
fixWheelPositions().catch(console.error); 