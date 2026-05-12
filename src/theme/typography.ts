import { TextStyle } from 'react-native';

// ─── Font families ────────────────────────────────────────────────────────────
// Requires DM Sans added to android/app/src/main/assets/fonts/
// and referenced in android/app/build.gradle (via react-native.config.js link).

export const FontFamily = {
  regular: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  semiBold: 'DMSans-SemiBold',
  bold: 'DMSans-Bold',
} as const;

// ─── Size scale ───────────────────────────────────────────────────────────────

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
} as const;

// ─── Line heights ─────────────────────────────────────────────────────────────

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

// ─── Semantic text styles ─────────────────────────────────────────────────────

export const Typography = {
  /** Screen / section titles */
  heading1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: FontSize['3xl'] * LineHeight.tight,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  heading2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    lineHeight: FontSize['2xl'] * LineHeight.tight,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  heading3: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * LineHeight.snug,
  } satisfies TextStyle,

  /** Card titles, list items */
  titleLarge: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.snug,
  } satisfies TextStyle,

  titleMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.snug,
  } satisfies TextStyle,

  /** Running body copy */
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.normal,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
  } satisfies TextStyle,

  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
  } satisfies TextStyle,

  /** Labels, metadata, timestamps */
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * LineHeight.relaxed,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  /** Buttons, interactive labels */
  labelMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.snug,
    letterSpacing: 0.1,
  } satisfies TextStyle,

  labelSmall: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.snug,
    letterSpacing: 0.2,
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof Typography;
