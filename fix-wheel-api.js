// Simple script to fix a wheel's probability weights through the API
// No dependencies required - uses built-in fetch API

// Configuration
const API_URL = 'http://localhost:3001';

// Target wheel (can be overridden with command line arguments)
const wheelId = process.argv[2] || '8371afb7-46d7-4c56-a64b-3a8437ceca08';
const companyId = process.argv[3] || '9fe5820b-43f5-4415-8a2a-1ce14a69dfde';

// Fetch wrapper with error handling
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${url}`);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    if (response.status === 204) {
      return null; // No content
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${method} ${url}:`, error.message);
    throw error;
  }
}

async function fixWheel() {
  try {
    console.log(`Starting to fix wheel ${wheelId} for company ${companyId}...`);

    // Get current wheel slots
    const response = await apiCall(`/companies/${companyId}/wheels/${wheelId}/slots`);
    const slots = response?.slots || [];

    console.log(`Found ${slots.length} slots for wheel ${wheelId}`);

    if (slots.length === 0) {
      console.log('No slots found. Creating default slots...');
      
      // Create default slots with weights that total 100%
      const defaultSlots = [
        { label: 'Prize 1', weight: 34, color: '#FF6384', prizeCode: 'PRIZE1' },
        { label: 'Prize 2', weight: 33, color: '#36A2EB', prizeCode: 'PRIZE2' },
        { label: 'Prize 3', weight: 33, color: '#FFCE56', prizeCode: 'PRIZE3' }
      ];
      
      // Create slots using API
      for (const slot of defaultSlots) {
        await apiCall(`/companies/${companyId}/wheels/${wheelId}/slots`, 'POST', slot);
        console.log(`Created slot: ${slot.label} (${slot.weight}%)`);
      }
      
      console.log('Default slots created successfully');
      return;
    }

    // Calculate current total weight
    const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0);
    console.log(`Current total weight: ${totalWeight}%`);
    
    if (totalWeight !== 100) {
      console.log(`Adjusting weights to total 100%. Current total: ${totalWeight}%`);
      
      // First approach: delete all slots
      console.log('Deleting all existing slots...');
      for (const slot of slots) {
        try {
          await apiCall(`/companies/${companyId}/wheels/${wheelId}/slots/${slot.id}`, 'DELETE');
          console.log(`Deleted slot: ${slot.label}`);
        } catch (error) {
          console.error(`Error deleting slot ${slot.id}:`, error.message);
        }
      }
      
      // Create new slots with proper weights
      console.log('Creating new slots with balanced weights...');
      
      // Use the same labels and properties but adjust weights
      const newSlots = slots.map((slot, index) => ({
        label: slot.label,
        color: slot.color,
        prizeCode: slot.prizeCode || `PRIZE${index + 1}`,
        // Distribute weights evenly, with any remainder going to the first slots
        weight: Math.floor(100 / slots.length) + (index < 100 % slots.length ? 1 : 0)
      }));
      
      // Double-check that weights add up to 100
      const newTotalWeight = newSlots.reduce((sum, slot) => sum + slot.weight, 0);
      if (newTotalWeight !== 100) {
        // Adjust the first slot to make total exactly 100
        newSlots[0].weight += (100 - newTotalWeight);
      }
      
      // Create the new slots
      for (const slot of newSlots) {
        try {
          await apiCall(`/companies/${companyId}/wheels/${wheelId}/slots`, 'POST', slot);
          console.log(`Created slot: ${slot.label} (${slot.weight}%)`);
        } catch (error) {
          console.error(`Error creating slot ${slot.label}:`, error.message);
        }
      }
    }
    
    // Verify the fix
    const verifyResponse = await apiCall(`/companies/${companyId}/wheels/${wheelId}/slots`);
    const updatedSlots = verifyResponse.slots;
    
    console.log('\nVerification:');
    updatedSlots.forEach(slot => {
      console.log(`- ${slot.label}: ${slot.weight}%`);
    });
    
    const updatedTotalWeight = updatedSlots.reduce((sum, slot) => sum + slot.weight, 0);
    console.log(`Total weight after fix: ${updatedTotalWeight}%`);
    
    if (updatedTotalWeight === 100) {
      console.log('\nFIX SUCCESSFUL: Wheel slots now total 100%');
    } else {
      console.log('\nWARNING: Wheel slots still do not total 100%');
    }
    
  } catch (error) {
    console.error('Error fixing wheel:', error.message);
  }
}

// Run the fix
fixWheel()
  .then(() => console.log('Completed'))
  .catch(error => console.error('Script failed:', error)); 