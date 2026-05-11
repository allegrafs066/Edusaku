import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route }: Props) {
  const colors = useColors();
  const [input, setInput] = useState('');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.empty}>
        <Text style={[Typography.bodyMedium, { color: colors.textSecondary }]}>
          Ask a question about this document…
        </Text>
      </View>

      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[Typography.bodyMedium, styles.input, { color: colors.textPrimary }]}
          placeholder="Ask something…"
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
          <Text style={[Typography.labelSmall, { color: '#FFFFFF' }]}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    padding: 10,
    gap: 10,
  },
  input: { flex: 1, paddingVertical: 8 },
  sendBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
});
