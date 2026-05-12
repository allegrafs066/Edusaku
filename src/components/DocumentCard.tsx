import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import type { Document } from '../store/appStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentCard({
  document,
  onPress,
  onLongPress,
  style,
}: DocumentCardProps) {
  const colors = useColors();
  const isEmbedded = document.embeddedAt !== null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          // subtle shadow on light, none on dark
          shadowColor: colors.shadow,
        },
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Open document ${document.title}`}
    >
      {/* PDF icon pill */}
      <View style={[styles.iconPill, { backgroundColor: colors.primary + '1A' }]}>
        <Text style={[styles.iconText, { color: colors.primary }]}>PDF</Text>
      </View>

      {/* Text content */}
      <View style={styles.body}>
        <Text
          style={[Typography.titleMedium, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {document.title}
        </Text>

        <Text
          style={[Typography.caption, styles.meta, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {document.pageCount} pages · {formatBytes(document.sizeBytes)}
        </Text>
      </View>

      {/* Embedding status badge */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isEmbedded
              ? colors.primary + '22'
              : colors.amber + '22',
          },
        ]}
      >
        <Text
          style={[
            Typography.caption,
            { color: isEmbedded ? colors.primary : colors.amber },
          ]}
        >
          {isEmbedded ? 'Ready' : 'Processing'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    // Android elevation
    elevation: 1,
    // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  meta: {
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
});
