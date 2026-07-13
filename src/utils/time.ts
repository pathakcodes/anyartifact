// Get current timestamp in milliseconds
export function now(): number {
  return Date.now();
}

// Convert timestamp to ISO string
export function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

// Format timestamp for display
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
