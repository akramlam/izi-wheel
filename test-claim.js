async function testClaim() {
  try {
    console.log('Testing claim functionality...');
    
    // Use the play ID from the error you showed earlier
    const playId = '1ffd4cbf-b130-4325-bc7e-8b4295932d6b';
    
    const response = await fetch(`http://localhost:3001/public/plays/${playId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        birthDate: '1990-01-01'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Claim test successful!');
    } else {
      console.log('❌ Claim test failed');
    }
    
  } catch (error) {
    console.error('Error testing claim:', error.message);
  }
}

testClaim(); 