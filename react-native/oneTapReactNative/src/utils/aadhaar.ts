// Verhoeff algorithm — UIDAI uses this for the Aadhaar checksum digit.
// Reference: https://en.wikipedia.org/wiki/Verhoeff_algorithm
// The last digit of a valid Aadhaar is a checksum computed from the first 11.

const D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const verhoeffPasses = (digitsLastFirst: number[]): boolean => {
  let c = 0;
  digitsLastFirst.forEach((digit, i) => {
    c = D[c][P[i % 8][digit]];
  });
  return c === 0;
};

export type AadhaarValidationError =
  | 'incomplete'
  | 'invalid_first_digit'
  | 'invalid_checksum';

export interface AadhaarValidationResult {
  ok: boolean;
  error?: AadhaarValidationError;
}

/**
 * Validates a raw Aadhaar string (digits only — caller strips spaces first).
 * Performs length, first-digit, and Verhoeff checks in that order.
 */
export const validateAadhaar = (digits: string): AadhaarValidationResult => {
  if (digits.length !== 12 || !/^\d{12}$/.test(digits)) {
    return { ok: false, error: 'incomplete' };
  }

  // UIDAI rule: first digit cannot be 0 or 1.
  if (digits[0] === '0' || digits[0] === '1') {
    return { ok: false, error: 'invalid_first_digit' };
  }

  const reversed = digits.split('').reverse().map(Number);
  if (!verhoeffPasses(reversed)) {
    return { ok: false, error: 'invalid_checksum' };
  }

  return { ok: true };
};

/**
 * Formats a digits-only Aadhaar string with single-space grouping (XXXX XXXX XXXX).
 * Input may include partial digits (1–12); output truncates extras.
 */
export const formatAadhaarDisplay = (digits: string): string => {
  const onlyDigits = digits.replace(/\D/g, '').slice(0, 12);
  const groups: string[] = [];
  for (let i = 0; i < onlyDigits.length; i += 4) {
    groups.push(onlyDigits.slice(i, i + 4));
  }
  return groups.join(' ');
};

/**
 * Strips non-digit characters from a (possibly formatted) Aadhaar input.
 */
export const stripAadhaar = (input: string): string => input.replace(/\D/g, '');
