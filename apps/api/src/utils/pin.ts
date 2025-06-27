/**
 * Generates a random PIN code for prize redemption
 * @param length Length of the PIN code (default: 6, max: 10)
 * @returns A random PIN code
 */
export function generatePIN(length: number = 6): string {
  // Limit PIN length to maximum 10 digits
  const maxLength = 10;
  const actualLength = Math.min(Math.max(length, 1), maxLength);
  
  const characters = '0123456789';
  let pin = '';
  
  for (let i = 0; i < actualLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    pin += characters[randomIndex];
  }
  
  return pin;
} 