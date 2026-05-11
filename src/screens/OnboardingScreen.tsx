import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[Typography.heading1, { color: colors.primary }]}>Edusaku</Text>
      <Text style={[Typography.bodyMedium, styles.subtitle, { color: colors.textSecondary }]}>
        Offline RAG for teachers in remote areas.{'\n'}
        Upload PDFs. Ask questions. No internet required.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => navigation.replace('Home')}
        accessibilityRole="button"
        accessibilityLabel="Get started"
      >
        <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 48,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
});
