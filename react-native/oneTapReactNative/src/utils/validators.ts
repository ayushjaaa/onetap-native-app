import { stripPhonePrefix } from './formatters';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

export const isValidIndianPhone = (input: string): boolean => {
  const clean = stripPhonePrefix(input);
  return INDIAN_PHONE_REGEX.test(clean);
};

export const passwordStrength = (
  password: string,
): { score: 0 | 1 | 2 | 3 | 4; label: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: labels[score],
  };
};
