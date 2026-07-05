/**
 * Strip +91 / 91 / spaces and return clean 10-digit number.
 */
export const stripPhonePrefix = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(-10);
  }
  return digits.slice(-10);
};

export const formatPhoneWithPrefix = (phone: string): string => {
  const clean = stripPhonePrefix(phone);
  return `+91${clean}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const trimEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const capitalizeName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
};
