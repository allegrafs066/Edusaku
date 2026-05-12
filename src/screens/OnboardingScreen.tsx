import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import ProgressBar from '../components/ProgressBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

// ─── Status steps ─────────────────────────────────────────────────────────────

const STEPS: { progress: number; label: string }[] = [
  { progress: 0.0,  label: 'Preparing…' },
  { progress: 0.15, label: 'Checking device compatibility…' },
  { progress: 0.35, label: 'Downloading Gemma model…' },
  { progress: 0.65, label: 'Verifying model integrity…' },
  { progress: 0.85, label: 'Loading model into memory…' },
  { progress: 1.0,  label: 'Ready!' },
];

const STEP_DURATION = 900; // ms between steps (simulated for UI demo)

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: Props) {
  const colors = useColors();

  const [stepIndex, setStepIndex] = useState(0);
  const isDone = stepIndex >= STEPS.length - 1;

  // Fade-in for the "Get Started" button
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Advance through steps automatically (simulates download progress)
  useEffect(() => {
    if (isDone) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, STEP_DURATION);
    return () => clearTimeout(timer);
  }, [stepIndex, isDone]);

  // Fade in button when done
  useEffect(() => {
    if (isDone) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isDone, buttonOpacity]);

  const currentStep = STEPS[stepIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App name */}
      <Text style={[Typography.heading1, styles.appName, { color: colors.primary }]}>
        Edusaku
      </Text>

      {/* Tagline */}
      <Text
        style={[Typography.bodyMedium, styles.tagline, { color: colors.textSecondary }]}
      >
        Offline AI for teachers in remote areas.{'\n'}
        Upload PDFs. Ask questions. No internet required.
      </Text>

      {/* Progress section */}
      <View style={styles.progressSection}>
        <ProgressBar
          progress={currentStep.progress}
          height={8}
          style={styles.bar}
        />

        {/* Percentage + status label row */}
        <View style={styles.statusRow}>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            {Math.round(currentStep.progress * 100)}%
          </Text>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            {currentStep.label}
          </Text>
        </View>
      </View>

      {/* Get Started button — fades in when progress reaches 100% */}
      <Animated.View style={[styles.buttonWrapper, { opacity: buttonOpacity }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.replace('Home')}
          disabled={!isDone}
          accessibilityRole="button"
          accessibilityLabel="Get started"
          accessibilityState={{ disabled: !isDone }}
        >
          <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>
            Get Started
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  appName: {
    marginBottom: 12,
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 56,
  },
  progressSection: {
    width: '100%',
    marginBottom: 40,
  },
  bar: {
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
});
