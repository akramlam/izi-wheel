async function testEmail() {
  try {
    console.log('Testing email functionality...');
    
    const response = await fetch('http://localhost:3001/public/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Email test successful!');
    } else {
      console.log('❌ Email test failed');
    }
    
  } catch (error) {
    console.error('Error testing email:', error.message);
  }
}

testEmail(); 