import { useColorScheme } from 'react-native';

// ─── Token definitions ───────────────────────────────────────────────────────

export const LightColors = {
  background: '#F8F7F4',
  surface: '#FFFFFF',
  primary: '#2D6A6A',
  textPrimary: '#1A1A18',
  textSecondary: '#6B6B68',
  amber: '#D97706',

  // Derived / utility
  border: '#E4E4E0',
  inputBackground: '#F0EFEc',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: 'rgba(0,0,0,0.08)',
} as const;

export const DarkColors = {
  background: '#111110',
  surface: '#1C1C1A',
  primary: '#4A9A9A',
  textPrimary: '#EDEDEB',
  textSecondary: '#9B9B98',
  amber: '#F59E0B',

  // Derived / utility
  border: '#2A2A28',
  inputBackground: '#252523',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: 'rgba(0,0,0,0.24)',
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  primary: string;
  textPrimary: string;
  textSecondary: string;
  amber: string;
  border: string;
  inputBackground: string;
  overlay: string;
  shadow: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the correct color token map for the current system color scheme.
 * Automatically follows system preference — no manual toggle needed.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.surface }} />
 */
export function useColors(): ColorTokens {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkColors : LightColors;
}
