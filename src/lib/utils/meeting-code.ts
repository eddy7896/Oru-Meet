/**
 * Meeting Code Generator
 *
 * Format: xxx-xxxx-xxx  (3-4-3, lowercase alphanumeric, no ambiguous chars)
 * Example: abc-defg-hij
 *
 * Character set excludes: 0 (zero), O (letter o), 1 (one), l (letter L), I (letter i)
 * to prevent confusion when read aloud or written down.
 */

const CHARSET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomChar(): string {
  const array = new Uint8Array(1);
  crypto.getRandomValues(array);
  return CHARSET[array[0] % CHARSET.length];
}

function randomSegment(length: number): string {
  return Array.from({ length }, randomChar).join("");
}

/**
 * Generates a unique meeting code in the format: xxx-xxxx-xxx
 */
export function generateMeetingCode(): string {
  return `${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`;
}

/**
 * Validates that a string matches the meeting code format.
 */
export function isValidMeetingCode(code: string): boolean {
  return /^[a-z2-9]{3}-[a-z2-9]{4}-[a-z2-9]{3}$/.test(code);
}

/**
 * Normalises user input into a meeting code (lowercase, trimmed).
 */
export function normaliseMeetingCode(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}
