import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAppStore, type ChatMessage } from '../store/appStore';
import ChatBubble from '../components/ChatBubble';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a page number from the first sourceChunk ID.
 * Expects chunk IDs in the form "page-4-chunk-2" or "p4" etc.
 * Returns null if no page number can be parsed — citation is hidden.
 */
function parseSourcePage(sourceChunks?: string[]): number | null {
  if (!sourceChunks || sourceChunks.length === 0) return null;
  const match = sourceChunks[0].match(/(?:page[-_]?)(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 150);
    const a3 = pulse(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View
      style={[
        typingStyles.wrapper,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityLabel="Assistant is typing"
      accessibilityRole="progressbar"
    >
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            { backgroundColor: colors.textSecondary, opacity: dot },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    marginVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen({ route }: Props) {
  const { documentId } = route.params;
  const colors = useColors();

  const { getSession, appendMessage, isInferring, setInferring, documents } =
    useAppStore();

  const session = getSession(documentId);
  const messages: ChatMessage[] = session?.messages ?? [];

  const document = documents.find((d) => d.id === documentId);

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, isInferring]);

  // ── Send handler ─────────────────────────────────────────────────────────

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isInferring) return;

    // Append user message
    appendMessage(documentId, {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    });

    setInput('');
    setInferring(true);

    // Backend engineer replaces this stub with real RAG inference.
    // When done, call appendMessage with role:'assistant' and set setInferring(false).
    // Stub: simulate a short delay then echo a placeholder response.
    setTimeout(() => {
      appendMessage(documentId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This answer will come from the on-device Gemma model. (Backend integration pending.)',
        sourceChunks: ['page-1-chunk-0'],
        createdAt: new Date().toISOString(),
      });
      setInferring(false);
    }, 1800);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Message list */}
      {messages.length === 0 && !isInferring ? (
        <View style={styles.emptyState}>
          <Text style={[Typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
            Ask a question about{'\n'}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {document?.title ?? 'this document'}
            </Text>
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          // Typing indicator appended after last message
          ListFooterComponent={isInferring ? <TypingIndicator /> : null}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              sourcePage={
                item.role === 'assistant'
                  ? parseSourcePage(item.sourceChunks)
                  : null
              }
            />
          )}
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            Typography.bodyMedium,
            styles.input,
            {
              color: colors.textPrimary,
              backgroundColor: colors.inputBackground,
            },
          ]}
          placeholder="Ask something…"
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
          maxLength={500}
          editable={!isInferring}
          accessibilityLabel="Type your question"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                input.trim().length > 0 && !isInferring
                  ? colors.primary
                  : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={input.trim().length === 0 || isInferring}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: input.trim().length === 0 || isInferring }}
        >
          <Text style={[Typography.labelSmall, { color: '#FFFFFF' }]}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxHeight: 120,
  },
  sendBtn: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
});
