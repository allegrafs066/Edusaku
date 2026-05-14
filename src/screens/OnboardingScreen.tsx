import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import Svg, {
  Circle, Rect, Path, Ellipse, Line, Polygon,
  Defs, LinearGradient, Stop, G,
} from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAppStore } from '../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_W } = Dimensions.get('window');

// ─── SVG Illustrations ────────────────────────────────────────────────────────

/** Slide 1 — Edusaku logo / welcome: book with AI spark */
const IllustrationWelcome: React.FC<{ primary: string; bg: string }> = ({ primary, bg }) => (
  <Svg width={220} height={200} viewBox="0 0 220 200">
    <Defs>
      <LinearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={primary} stopOpacity="1" />
        <Stop offset="1" stopColor={primary} stopOpacity="0.6" />
      </LinearGradient>
    </Defs>
    {/* Book body */}
    <Rect x="40" y="50" width="80" height="100" rx="6" fill="url(#bookGrad)" />
    <Rect x="120" y="50" width="60" height="100" rx="6" fill={primary} opacity="0.75" />
    {/* Spine */}
    <Rect x="116" y="50" width="8" height="100" rx="2" fill={primary} opacity="0.4" />
    {/* Lines on left page */}
    <Line x1="55" y1="80" x2="105" y2="80" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <Line x1="55" y1="95" x2="105" y2="95" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <Line x1="55" y1="110" x2="90" y2="110" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    {/* AI spark on right page */}
    <Circle cx="150" cy="100" r="18" fill="#fff" opacity="0.15" />
    <Path d="M150 82 L154 96 L168 100 L154 104 L150 118 L146 104 L132 100 L146 96 Z"
      fill="#fff" opacity="0.9" />
    {/* Floating dots */}
    <Circle cx="30" cy="40" r="5" fill={primary} opacity="0.3" />
    <Circle cx="195" cy="60" r="7" fill={primary} opacity="0.2" />
    <Circle cx="185" cy="160" r="4" fill={primary} opacity="0.25" />
    <Circle cx="25" cy="155" r="6" fill={primary} opacity="0.2" />
  </Svg>
);

/** Slide 2 — AI Chat: speech bubbles with brain */
const IllustrationChat: React.FC<{ primary: string }> = ({ primary }) => (
  <Svg width={220} height={200} viewBox="0 0 220 200">
    {/* User bubble */}
    <Rect x="90" y="30" width="110" height="44" rx="14" fill={primary} opacity="0.9" />
    <Polygon points="190,74 200,88 178,74" fill={primary} opacity="0.9" />
    <Line x1="105" y1="52" x2="185" y2="52" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    {/* AI bubble */}
    <Rect x="20" y="100" width="120" height="52" rx="14" fill={primary} opacity="0.25" />
    <Polygon points="30,152 20,168 52,152" fill={primary} opacity="0.25" />
    {/* Brain icon inside AI bubble */}
    <Circle cx="50" cy="126" r="14" fill={primary} opacity="0.5" />
    <Path d="M44 122 Q44 116 50 116 Q56 116 56 122 Q60 122 60 128 Q60 134 54 134 Q52 138 50 138 Q48 138 46 134 Q40 134 40 128 Q40 122 44 122 Z"
      fill="#fff" opacity="0.8" />
    {/* Lines in AI bubble */}
    <Line x1="72" y1="118" x2="128" y2="118" stroke={primary} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <Line x1="72" y1="130" x2="120" y2="130" stroke={primary} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    {/* Floating sparkles */}
    <Path d="M170 130 L172 138 L180 140 L172 142 L170 150 L168 142 L160 140 L168 138 Z"
      fill={primary} opacity="0.5" />
    <Circle cx="30" cy="60" r="4" fill={primary} opacity="0.2" />
    <Circle cx="195" cy="170" r="5" fill={primary} opacity="0.2" />
  </Svg>
);

/** Slide 3 — Document upload: PDF with upload arrow */
const IllustrationUpload: React.FC<{ primary: string }> = ({ primary }) => (
  <Svg width={220} height={200} viewBox="0 0 220 200">
    {/* Document */}
    <Rect x="60" y="40" width="90" height="120" rx="10" fill={primary} opacity="0.15" />
    <Rect x="60" y="40" width="90" height="120" rx="10" fill="none" stroke={primary} strokeWidth="2.5" opacity="0.6" />
    {/* Folded corner */}
    <Path d="M120 40 L150 70 L120 70 Z" fill={primary} opacity="0.3" />
    <Path d="M120 40 L150 70 L120 70 Z" fill="none" stroke={primary} strokeWidth="1.5" opacity="0.5" />
    {/* PDF label */}
    <Rect x="72" y="90" width="36" height="18" rx="4" fill={primary} opacity="0.7" />
    <Text style={{ fontSize: 9, fontWeight: 'bold' }} />
    {/* Lines */}
    <Line x1="75" y1="120" x2="135" y2="120" stroke={primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    <Line x1="75" y1="133" x2="120" y2="133" stroke={primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    {/* Upload arrow */}
    <Circle cx="168" cy="80" r="24" fill={primary} opacity="0.15" />
    <Circle cx="168" cy="80" r="24" fill="none" stroke={primary} strokeWidth="2" opacity="0.5" />
    <Path d="M168 92 L168 68 M160 76 L168 68 L176 76"
      stroke={primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
    {/* Floating dots */}
    <Circle cx="30" cy="50" r="5" fill={primary} opacity="0.2" />
    <Circle cx="200" cy="150" r="6" fill={primary} opacity="0.2" />
    <Circle cx="40" cy="160" r="4" fill={primary} opacity="0.15" />
  </Svg>
);

/** Slide 4 — Offline / private: shield with lock */
const IllustrationOffline: React.FC<{ primary: string }> = ({ primary }) => (
  <Svg width={220} height={200} viewBox="0 0 220 200">
    {/* Shield */}
    <Path
      d="M110 20 L170 45 L170 100 Q170 150 110 175 Q50 150 50 100 L50 45 Z"
      fill={primary} opacity="0.15"
    />
    <Path
      d="M110 20 L170 45 L170 100 Q170 150 110 175 Q50 150 50 100 L50 45 Z"
      fill="none" stroke={primary} strokeWidth="3" opacity="0.7"
    />
    {/* Lock body */}
    <Rect x="92" y="95" width="36" height="28" rx="6" fill={primary} opacity="0.8" />
    {/* Lock shackle */}
    <Path d="M100 95 L100 84 Q100 72 110 72 Q120 72 120 84 L120 95"
      fill="none" stroke={primary} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    {/* Keyhole */}
    <Circle cx="110" cy="107" r="5" fill="#fff" opacity="0.7" />
    <Rect x="108" y="107" width="4" height="8" rx="2" fill="#fff" opacity="0.7" />
    {/* Wifi-off lines */}
    <Path d="M30 50 Q30 30 50 30" stroke={primary} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3" />
    <Line x1="25" y1="25" x2="55" y2="55" stroke={primary} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    {/* Stars */}
    <Path d="M185 40 L187 46 L193 48 L187 50 L185 56 L183 50 L177 48 L183 46 Z"
      fill={primary} opacity="0.4" />
    <Path d="M35 140 L36.5 144 L41 145.5 L36.5 147 L35 151 L33.5 147 L29 145.5 L33.5 144 Z"
      fill={primary} opacity="0.3" />
    <Circle cx="190" cy="140" r="4" fill={primary} opacity="0.2" />
  </Svg>
);

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  key: string;
  title: string;
  description: string;
  Illustration: React.FC<{ primary: string; bg: string }>;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    title: 'Welcome to Edusaku',
    description: 'Your offline AI education assistant. Designed for teachers in remote areas with limited internet access.',
    Illustration: IllustrationWelcome,
  },
  {
    key: 'chat',
    title: 'Ask Anything',
    description: 'Chat with Gemma 4 AI directly on your device. Get instant answers, explanations, and summaries — no internet needed.',
    Illustration: ({ primary, bg }) => <IllustrationChat primary={primary} />,
  },
  {
    key: 'upload',
    title: 'Upload Documents',
    description: 'Upload PDFs and images from your phone or PC. Edusaku reads your documents and lets you ask questions about them.',
    Illustration: ({ primary, bg }) => <IllustrationUpload primary={primary} />,
  },
  {
    key: 'offline',
    title: 'Private & Offline',
    description: 'Everything runs locally on your device. Your data never leaves your hands — powered by Gemma 4 from Google DeepMind.',
    Illustration: ({ primary, bg }) => <IllustrationOffline primary={primary} />,
  },
];

// ─── Splash Screen ────────────────────────────────────────────────────────────

const SplashScreen: React.FC<{ colors: any; onDone: () => void }> = ({ colors, onDone }) => {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(900),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={[splashStyles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <View style={[splashStyles.logoRing, { borderColor: colors.primary + '40' }]}>
          <View style={[splashStyles.logoInner, { backgroundColor: colors.primary }]}>
            <Svg width={48} height={48} viewBox="0 0 48 48">
              <Path d="M24 6 L28 18 L40 22 L28 26 L24 38 L20 26 L8 22 L20 18 Z"
                fill="#fff" opacity="0.95" />
            </Svg>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
        <Text style={[Typography.heading2, { color: colors.primary, letterSpacing: 1 }]}>
          Edusaku
        </Text>
        <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: 6 }]}>
          Offline AI for Education
        </Text>
      </Animated.View>
    </View>
  );
};

const splashStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Dot indicator ────────────────────────────────────────────────────────────

const Dots: React.FC<{ count: number; active: number; primary: string; border: string }> = ({
  count, active, primary, border,
}) => (
  <View style={dotStyles.row}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[
          dotStyles.dot,
          i === active
            ? { backgroundColor: primary, width: 20 }
            : { backgroundColor: border, width: 8 },
        ]}
      />
    ))}
  </View>
);

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});

// ─── Main OnboardingScreen ────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: Props) {
  const colors = useColors();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideTranslate = useRef(new Animated.Value(30)).current;

  // Animate slides in after splash
  useEffect(() => {
    if (!showSplash) {
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [showSplash]);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  const handleGetStarted = () => {
    setOnboardingComplete();
    navigation.replace('Home');
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== currentSlide) setCurrentSlide(index);
  };

  const isLast = currentSlide === SLIDES.length - 1;

  if (showSplash) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />
        <SplashScreen colors={colors} onDone={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
      />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={[Typography.labelSmall, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.View style={[
        styles.slidesWrapper,
        { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] },
      ]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide) => (
            <View key={slide.key} style={[styles.slide, { width: SCREEN_W }]}>
              {/* Illustration */}
              <View style={[styles.illustrationContainer, { backgroundColor: colors.surface }]}>
                <slide.Illustration primary={colors.primary} bg={colors.background} />
              </View>

              {/* Text */}
              <Text style={[Typography.heading3, styles.slideTitle, { color: colors.textPrimary }]}>
                {slide.title}
              </Text>
              <Text style={[Typography.bodyMedium, styles.slideDesc, { color: colors.textSecondary }]}>
                {slide.description}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Dots
          count={SLIDES.length}
          active={currentSlide}
          primary={colors.primary}
          border={colors.border}
        />

        {isLast ? (
          <TouchableOpacity
            style={[styles.getStartedBtn, { backgroundColor: colors.primary }]}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>
              Get Started
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 52,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  slidesWrapper: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 20,
  },
  illustrationContainer: {
    width: 240,
    height: 220,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: 14,
  },
  slideDesc: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 16,
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  getStartedBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
});
