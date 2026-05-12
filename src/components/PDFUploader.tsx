import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PDFUploaderProps {
  /** Called when the user taps the FAB. Wire up document picker here. */
  onPress: () => void;
  /** Show spinner instead of "+" while a pick/upload is in progress. */
  loading?: boolean;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Floating action button for triggering PDF upload.
 * Renders a teal circle with "+" (or a spinner when loading).
 * Actual file-picker logic is injected via onPress — implemented by backend.
 */
export default function PDFUploader({ onPress, loading = false, style }: PDFUploaderProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.shadow }, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Upload PDF document"
      accessibilityState={{ busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={[Typography.heading3, styles.icon]}>+</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Android
    elevation: 6,
    // iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  icon: {
    color: '#FFFFFF',
    // nudge the "+" to look optically centered
    lineHeight: 30,
    includeFontPadding: false,
  },
});
