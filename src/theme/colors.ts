export const colors = {
  primary: '#2BB32A',
  primaryDark: '#1F8A1E',
  primaryLight: '#4ECC4D',

  background: '#0F2317',
  card: '#132A1C',
  surface: '#1A3324',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  border: 'rgba(255, 255, 255, 0.15)',
  borderFocus: '#2BB32A',
  borderError: '#EF4444',
  borderSuccess: '#10B981',
  borderSubtle: 'rgba(43, 179, 42, 0.18)',

  inputBackground: 'rgba(255, 255, 255, 0.05)',
  inputBackgroundFocus: 'rgba(255, 255, 255, 0.08)',

  primaryAlpha10: 'rgba(43, 179, 42, 0.10)',
  primaryAlpha15: 'rgba(43, 179, 42, 0.15)',
  primaryAlpha30: 'rgba(43, 179, 42, 0.30)',
  whiteAlpha04: 'rgba(255, 255, 255, 0.04)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorName = keyof typeof colors;
