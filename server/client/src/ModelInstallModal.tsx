import React, { useEffect, useState } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Download, Terminal,
  ExternalLink, Copy, Check,
} from 'lucide-react';

export const MODEL_SKIP_KEY = 'edusaku-model-install-skipped';

declare global {
  interface Window {
    electronAPI?: {
      openExternal: (url: string) => Promise<void>;
      openTerminal: () => Promise<void>;
    };
  }
}

interface ModelInstallModalProps {
  dark: boolean;
  onClose: () => void;
  initialStep?: 1 | 2 | 3;
}

type Step = 1 | 2 | 3;

const OLLAMA_URL = 'https://ollama.com/download';
const PULL_CMD = 'ollama pull gemma4:e2b';

const ModelInstallModal: React.FC<ModelInstallModalProps> = ({ dark, onClose, initialStep = 1 }) => {
  const [step, setStep] = useState<Step>(initialStep);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isWindows = /windows/i.test(navigator.userAgent);

  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [step, onClose]);

  const checkStatus = async () => {
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/ollama/status').then(r => r.json());
      return res as { ollamaRunning: boolean; modelInstalled: boolean };
    } catch {
      return { ollamaRunning: false, modelInstalled: false };
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOllama = async () => {
    const status = await checkStatus();
    if (status.ollamaRunning) {
      setStep(2);
    } else {
      setError('Ollama not detected yet. Please install and try again.');
    }
  };

  const handleCheckModel = async () => {
    const status = await checkStatus();
    if (status.modelInstalled) {
      setStep(3);
    } else {
      setError('Model not detected yet. Please run the command and try again.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PULL_CMD);
    } catch {
      const el = document.createElement('textarea');
      el.value = PULL_CMD;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openExternal = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(OLLAMA_URL);
    } else {
      window.open(OLLAMA_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const openTerminal = () => {
    window.electronAPI?.openTerminal();
  };

  // ── Theme ────────────────────────────────────────────────────────────────────
  const cardBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-200';
  const titleColor = dark ? 'text-white' : 'text-slate-800';
  const descColor = dark ? 'text-gray-400' : 'text-slate-500';
  const helperColor = dark ? 'text-gray-500' : 'text-slate-400';
  const boxBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200';
  const boxText = dark ? 'text-gray-300' : 'text-slate-600';
  const iconMuted = dark ? 'text-gray-500' : 'text-slate-400';

  const primaryBtn = `w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60
    text-white font-semibold transition-colors shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2`;
  const outlineBtn = dark
    ? `w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold
       transition-colors border border-gray-700 flex items-center justify-center gap-2`
    : `w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold
       transition-colors border border-slate-200 flex items-center justify-center gap-2`;

  const stepDot = (n: number) => (
    <div
      key={n}
      className={`h-2 rounded-full transition-all duration-300 ${
        n === step
          ? 'w-6 bg-blue-600'
          : n < step
          ? 'w-2 bg-blue-400'
          : dark ? 'w-2 bg-gray-700' : 'w-2 bg-slate-200'
      }`}
    />
  );

  const errorBox = error ? (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
      <XCircle size={16} className="text-red-500 shrink-0" />
      <p className="text-sm text-red-500">{error}</p>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md mx-4 rounded-3xl border shadow-2xl ${cardBg}`}>
        <div className="px-8 pt-8 pb-8">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(stepDot)}
          </div>

          {/* ── Step 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center">
                  <Download size={24} className="text-white" />
                </div>
              </div>

              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                Step 1: Install Ollama
              </h2>
              <p className={`text-sm text-center mb-5 leading-relaxed ${descColor}`}>
                Ollama is required to run Gemma 4 AI locally on your PC. It is free and runs in the background automatically after installation.
              </p>

              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-3 ${boxBg}`}>
                <ExternalLink size={16} className={`${iconMuted} shrink-0`} />
                <span className={`text-sm font-mono flex-1 ${boxText}`}>{OLLAMA_URL}</span>
              </div>

              <button onClick={openExternal} className={`${outlineBtn} mb-3`}>
                <ExternalLink size={16} />
                Open Download Page
              </button>

              <p className={`text-xs text-center mb-5 leading-relaxed ${helperColor}`}>
                After installing, Ollama runs automatically in the background. No need to open a terminal.
              </p>

              {errorBox}

              <button onClick={handleCheckOllama} disabled={checking} className={primaryBtn}>
                {checking ? 'Checking...' : "I've Installed Ollama →"}
              </button>
            </>
          )}

          {/* ── Step 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center">
                  <Terminal size={24} className="text-white" />
                </div>
              </div>

              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                Step 2: Download Gemma 4 Model
              </h2>
              <p className={`text-sm text-center mb-5 leading-relaxed ${descColor}`}>
                The Gemma 4 model (~3.5 GB) needs to be downloaded once. Open a terminal and run the command below.
              </p>

              <button onClick={openTerminal} className={`${outlineBtn} mb-4`}>
                <Terminal size={16} />
                {isWindows ? 'Open PowerShell' : 'Open Terminal'}
              </button>

              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 ${boxBg}`}>
                <code className={`text-sm font-mono flex-1 ${dark ? 'text-green-400' : 'text-slate-700'}`}>
                  {PULL_CMD}
                </code>
                <button
                  onClick={handleCopy}
                  title="Copy command"
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                    dark
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {copied
                    ? <Check size={16} className="text-green-500" />
                    : <Copy size={16} />}
                </button>
              </div>

              <div className="flex items-start gap-2 mb-5">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className={`text-xs leading-relaxed ${helperColor}`}>
                  Do not delete or modify the command above. Just press Enter to start downloading.
                </p>
              </div>

              {errorBox}

              <button onClick={handleCheckModel} disabled={checking} className={primaryBtn}>
                {checking ? 'Checking...' : "I've Downloaded the Model →"}
              </button>
            </>
          )}

          {/* ── Step 3 ─────────────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-green-600 shadow-lg shadow-green-600/30 flex items-center justify-center">
                  <CheckCircle size={28} className="text-white" />
                </div>
              </div>

              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                Edusaku is Ready!
              </h2>
              <p className={`text-sm text-center mb-8 leading-relaxed ${descColor}`}>
                Gemma 4 is installed and running locally on your device. Your data never leaves your PC.
              </p>

              <button onClick={onClose} className={primaryBtn}>
                <CheckCircle size={16} />
                Start Learning
              </button>

              <p className={`text-xs text-center mt-3 ${helperColor}`}>
                Closing automatically in a moment...
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ModelInstallModal;
