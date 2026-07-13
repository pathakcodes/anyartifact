import { nanoid } from 'nanoid';

// Generate a short, URL-safe unique ID
export function generateId(length: number = 12): string {
  return nanoid(length);
}
