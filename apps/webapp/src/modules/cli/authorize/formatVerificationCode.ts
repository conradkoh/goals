/**
 * Formats the six-digit verification code for display in the controlled input only.
 *
 * `"123456"` -> `"123 456"`; values shorter than four digits are returned unchanged.
 */
export function formatVerificationCode(digits: string): string {
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}
