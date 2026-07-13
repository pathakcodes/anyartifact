import { createHash } from 'crypto';

// SHA-256 hash helper
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Generate a random API key
export function generateRandomKey(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
