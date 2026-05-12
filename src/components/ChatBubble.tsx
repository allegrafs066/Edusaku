import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  /** e.g. "page 4" — shown below assistant bubbles only */
  sourcePage?: number | null;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatBubble({
  role,
  content,
  sourcePage,
  style,
}: ChatBubbleProps) {
  const colors = useColors();
  const isUser = role === 'user';

  return (
    <View
      style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant, style]}
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? 'You' : 'Assistant'}: ${content}`}
    >
      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            Typography.bodyMedium,
            { color: isUser ? '#FFFFFF' : colors.textPrimary },
          ]}
        >
          {content}
        </Text>
      </View>

      {/* Source citation — assistant only */}
      {!isUser && sourcePage != null && (
        <Text
          style={[
            Typography.caption,
            styles.citation,
            { color: colors.textSecondary },
          ]}
        >
          Source: page {sourcePage}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: '80%',
    marginVertical: 4,
  },
  wrapperUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapperAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  citation: {
    marginTop: 4,
    marginHorizontal: 4,
  },
});
