import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { useColors } from '../theme/colors';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  /** Height of the bar in dp. Default: 6 */
  height?: number;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Animated horizontal progress bar.
 * Accepts a 0–1 progress value and smoothly transitions between values.
 */
export default function ProgressBar({ progress, height = 6, style }: ProgressBarProps) {
  const colors = useColors();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 300,
      useNativeDriver: false, // width animation requires JS driver
    }).start();
  }, [progress, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: colors.border, borderRadius: height / 2 },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            height,
            backgroundColor: colors.primary,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
