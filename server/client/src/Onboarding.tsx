import React, { useEffect, useState } from 'react';
import { Bot, BookOpen, Upload, Shield, ChevronRight, Sparkles } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingProps {
  dark: boolean;
  onDone: () => void;
}

// ── SVG Illustrations ─────────────────────────────────────────────────────────

const IllustrationWelcome = ({ dark }: { dark: boolean }) => (
  <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
    <defs>
      <linearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2563eb" stopOpacity="0.9" />
        <stop offset="1" stopColor="#3b82f6" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    {/* Book */}
    <rect x="30" y="35" width="65" height="90" rx="6" fill="url(#bookGrad)" />
    <rect x="95" y="35" width="50" height="90" rx="6" fill="#2563eb" opacity="0.5" />
    <rect x="92" y="35" width="7" height="90" rx="2" fill="#1d4ed8" opacity="0.4" />
    {/* Lines */}
    <line x1="42" y1="62" x2="85" y2="62" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    <line x1="42" y1="76" x2="85" y2="76" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    <line x1="42" y1="90" x2="72" y2="90" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    {/* Star on right page */}
    <circle cx="122" cy="80" r="16" fill="white" opacity="0.12" />
    <path d="M122 66 L125.5 77 L137 80 L125.5 83 L122 94 L118.5 83 L107 80 L118.5 77 Z" fill="white" opacity="0.9" />
    {/* Dots */}
    <circle cx="18" cy="30" r="4" fill="#3b82f6" opacity="0.3" />
    <circle cx="162" cy="50" r="5" fill="#3b82f6" opacity="0.2" />
    <circle cx="155" cy="140" r="3" fill="#3b82f6" opacity="0.25" />
    <circle cx="15" cy="130" r="5" fill="#3b82f6" opacity="0.2" />
  </svg>
);

const IllustrationChat = ({ dark }: { dark: boolean }) => (
  <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
    {/* User bubble */}
    <rect x="70" y="20" width="95" height="40" rx="12" fill="#2563eb" opacity="0.9" />
    <polygon points="155,60 165,74 143,60" fill="#2563eb" opacity="0.9" />
    <line x1="82" y1="40" x2="152" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    {/* AI bubble */}
    <rect x="15" y="88" width="105" height="46" rx="12" fill="#2563eb" opacity="0.18" />
    <polygon points="25,134 15,150 47,134" fill="#2563eb" opacity="0.18" />
    {/* Bot icon */}
    <circle cx="42" cy="111" r="13" fill="#2563eb" opacity="0.4" />
    <rect x="36" y="106" width="12" height="10" rx="3" fill="white" opacity="0.8" />
    <circle cx="39" cy="109" r="1.5" fill="#2563eb" />
    <circle cx="45" cy="109" r="1.5" fill="#2563eb" />
    <line x1="39" y1="116" x2="45" y2="116" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lines */}
    <line x1="62" y1="104" x2="108" y2="104" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <line x1="62" y1="116" x2="100" y2="116" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    {/* Sparkle */}
    <path d="M148 110 L150 118 L158 120 L150 122 L148 130 L146 122 L138 120 L146 118 Z" fill="#2563eb" opacity="0.4" />
    <circle cx="20" cy="50" r="3" fill="#2563eb" opacity="0.2" />
    <circle cx="165" cy="148" r="4" fill="#2563eb" opacity="0.2" />
  </svg>
);

const IllustrationUpload = ({ dark }: { dark: boolean }) => (
  <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
    {/* Document */}
    <rect x="45" y="25" width="75" height="110" rx="10" fill="#2563eb" opacity="0.12" />
    <rect x="45" y="25" width="75" height="110" rx="10" stroke="#2563eb" strokeWidth="2.5" opacity="0.5" />
    {/* Folded corner */}
    <path d="M95 25 L120 50 L95 50 Z" fill="#2563eb" opacity="0.25" />
    <path d="M95 25 L120 50 L95 50 Z" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" />
    {/* PDF badge */}
    <rect x="56" y="78" width="32" height="16" rx="4" fill="#2563eb" opacity="0.7" />
    <text x="72" y="90" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">PDF</text>
    {/* Lines */}
    <line x1="58" y1="106" x2="108" y2="106" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    <line x1="58" y1="118" x2="95" y2="118" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    {/* Upload circle */}
    <circle cx="142" cy="68" r="22" fill="#2563eb" opacity="0.12" />
    <circle cx="142" cy="68" r="22" stroke="#2563eb" strokeWidth="2" opacity="0.45" />
    <path d="M142 80 L142 56 M134 64 L142 56 L150 64" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    {/* Dots */}
    <circle cx="22" cy="38" r="4" fill="#2563eb" opacity="0.2" />
    <circle cx="165" cy="130" r="5" fill="#2563eb" opacity="0.2" />
    <circle cx="28" cy="140" r="3" fill="#2563eb" opacity="0.15" />
  </svg>
);

const IllustrationOffline = ({ dark }: { dark: boolean }) => (
  <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
    {/* Shield */}
    <path d="M90 12 L145 35 L145 85 Q145 130 90 152 Q35 130 35 85 L35 35 Z" fill="#2563eb" opacity="0.12" />
    <path d="M90 12 L145 35 L145 85 Q145 130 90 152 Q35 130 35 85 L35 35 Z" stroke="#2563eb" strokeWidth="2.5" opacity="0.6" />
    {/* Lock */}
    <rect x="72" y="82" width="36" height="28" rx="6" fill="#2563eb" opacity="0.75" />
    <path d="M80 82 L80 71 Q80 60 90 60 Q100 60 100 71 L100 82" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.75" />
    <circle cx="90" cy="94" r="4.5" fill="white" opacity="0.7" />
    <rect x="88" y="94" width="4" height="7" rx="2" fill="white" opacity="0.7" />
    {/* Stars */}
    <path d="M155 30 L157 38 L165 40 L157 42 L155 50 L153 42 L145 40 L153 38 Z" fill="#2563eb" opacity="0.35" />
    <path d="M22 118 L23.5 124 L30 125.5 L23.5 127 L22 133 L20.5 127 L14 125.5 L20.5 124 Z" fill="#2563eb" opacity="0.25" />
    <circle cx="158" cy="120" r="3.5" fill="#2563eb" opacity="0.2" />
    {/* Wifi-off hint */}
    <line x1="18" y1="38" x2="38" y2="58" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
  </svg>
);

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'welcome',
    Icon: BookOpen,
    Illustration: IllustrationWelcome,
    title: 'Welcome to Edusaku',
    description: 'Your offline AI education assistant — designed for teachers in remote areas with limited internet access.',
  },
  {
    key: 'chat',
    Icon: Bot,
    Illustration: IllustrationChat,
    title: 'Ask Anything',
    description: 'Chat with Gemma 4 AI directly on your PC. Get instant answers, explanations, and summaries — no internet needed.',
  },
  {
    key: 'upload',
    Icon: Upload,
    Illustration: IllustrationUpload,
    title: 'Upload Documents',
    description: 'Upload PDFs and images from your phone or PC. Edusaku reads your documents and lets you ask questions about them.',
  },
  {
    key: 'offline',
    Icon: Shield,
    Illustration: IllustrationOffline,
    title: 'Private & Offline',
    description: 'Everything runs locally on your PC. Your data never leaves your hands — powered by Gemma 4 from Google DeepMind.',
  },
];

// ── Splash ────────────────────────────────────────────────────────────────────

const Splash: React.FC<{ dark: boolean; onDone: () => void }> = ({ dark, onDone }) => {
  const [visible, setVisible] = useState(true);
  const [scale, setScale] = useState(false);
  const [textIn, setTextIn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setScale(true), 50);
    const t2 = setTimeout(() => setTextIn(true), 400);
    const t3 = setTimeout(() => setVisible(false), 1800);
    const t4 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div className={`
      fixed inset-0 z-[200] flex flex-col items-center justify-center
      transition-opacity duration-300
      ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      ${dark ? 'bg-gray-950' : 'bg-slate-50'}
    `}>
      {/* Logo */}
      <div className={`
        transition-all duration-500 ease-out
        ${scale ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
      `}>
        <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center ${
          dark ? 'border-blue-500/30' : 'border-blue-400/30'
        }`}>
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Sparkles size={36} className="text-white" />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className={`
        mt-6 text-center transition-all duration-400
        ${textIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}>
        <h1 className={`text-3xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
          Edusaku
        </h1>
        <p className={`text-sm mt-1.5 ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
          Offline AI for Education
        </p>
      </div>
    </div>
  );
};

// ── Onboarding ────────────────────────────────────────────────────────────────

const Onboarding: React.FC<OnboardingProps> = ({ dark, onDone }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideIn, setSlideIn] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const goTo = (index: number, dir: 'left' | 'right') => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setSlideIn(false);
    setTimeout(() => {
      setCurrent(index);
      setSlideIn(true);
      setTimeout(() => setAnimating(false), 350);
    }, 200);
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) goTo(current + 1, 'left');
  };

  const handlePrev = () => {
    if (current > 0) goTo(current - 1, 'right');
  };

  const bg = dark ? 'bg-gray-950' : 'bg-slate-50';
  const cardBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-200';
  const titleColor = dark ? 'text-white' : 'text-slate-800';
  const descColor = dark ? 'text-gray-400' : 'text-slate-500';
  const dotActive = 'bg-blue-600';
  const dotInactive = dark ? 'bg-gray-700' : 'bg-slate-200';

  const slideClass = `transition-all duration-300 ease-out ${
    slideIn
      ? 'opacity-100 translate-x-0'
      : direction === 'left'
        ? 'opacity-0 -translate-x-8'
        : 'opacity-0 translate-x-8'
  }`;

  if (showSplash) {
    return <Splash dark={dark} onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center ${bg}`}>
      <div className={`relative w-full max-w-lg mx-4 rounded-3xl border shadow-2xl overflow-hidden ${cardBg}`}>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onDone}
            className={`absolute top-5 right-5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors z-10 ${
              dark ? 'text-gray-400 hover:bg-gray-800' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            Skip
          </button>
        )}

        {/* Slide content */}
        <div className={`px-10 pt-12 pb-6 flex flex-col items-center text-center ${slideClass}`}>
          {/* Illustration */}
          <div className={`w-52 h-48 rounded-2xl flex items-center justify-center mb-8 ${
            dark ? 'bg-gray-800/60' : 'bg-blue-50/60'
          }`}>
            <slide.Illustration dark={dark} />
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center">
              <slide.Icon size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              {slide.key === 'welcome' ? 'Welcome' :
               slide.key === 'chat' ? 'AI Chat' :
               slide.key === 'upload' ? 'Documents' : 'Privacy'}
            </span>
          </div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-3 leading-tight ${titleColor}`}>
            {slide.title}
          </h2>

          {/* Description */}
          <p className={`text-sm leading-relaxed max-w-sm ${descColor}`}>
            {slide.description}
          </p>
        </div>

        {/* Bottom bar */}
        <div className={`px-8 py-6 flex items-center justify-between border-t ${
          dark ? 'border-gray-700/60' : 'border-slate-100'
        }`}>
          {/* Back button */}
          <button
            onClick={handlePrev}
            disabled={current === 0}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              current === 0
                ? 'opacity-0 pointer-events-none'
                : (dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-500')
            }`}
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 'left' : 'right')}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? `${dotActive} w-6` : `${dotInactive} w-2`
                }`}
              />
            ))}
          </div>

          {/* Next / Get Started */}
          {isLast ? (
            <button
              onClick={onDone}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/25"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-md shadow-blue-600/25"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
