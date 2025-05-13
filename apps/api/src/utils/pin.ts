/**
 * Generates a random PIN code for prize redemption
 * @param length Length of the PIN code (default: 6)
 * @returns A random PIN code
 */
export function generatePIN(length: number = 6): string {
  const characters = '0123456789';
  let pin = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    pin += characters[randomIndex];
  }
  
  return pin;
} 