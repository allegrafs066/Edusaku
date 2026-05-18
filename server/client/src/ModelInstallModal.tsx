import React, { useEffect, useState } from 'react';
import { Download, Bot } from 'lucide-react';

export const MODEL_SKIP_KEY = 'edusaku-model-install-skipped';

interface ModelInstallModalProps {
  dark: boolean;
  onClose: () => void;
}

type Phase = 'prompt' | 'installing' | 'skip-confirm';

const ModelInstallModal: React.FC<ModelInstallModalProps> = ({ dark, onClose }) => {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [progressText, setProgressText] = useState('');
  const [installDone, setInstallDone] = useState(false);
  const [installFailed, setInstallFailed] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (phase !== 'installing' || installDone) return;
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(iv);
  }, [phase, installDone]);

  const handleInstall = async () => {
    setPhase('installing');
    setProgressText('Connecting to Ollama');
    try {
      const response = await fetch('/ollama/install', { method: 'POST' });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) setProgressText(parsed.text);
            if (parsed.done) {
              setInstallDone(true);
              if (parsed.success) {
                setTimeout(() => onClose(), 1500);
              } else {
                setInstallFailed(true);
              }
            }
          } catch {}
        }
      }
    } catch {
      setProgressText('Installation failed. Run manually: ollama pull gemma4:e2b');
      setInstallDone(true);
      setInstallFailed(true);
    }
  };

  const cardBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-200';
  const titleColor = dark ? 'text-white' : 'text-slate-800';
  const descColor = dark ? 'text-gray-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md mx-4 rounded-3xl border shadow-2xl ${cardBg}`}>
        <div className="px-8 pt-10 pb-8">

          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              installDone && !installFailed ? 'bg-green-600 shadow-green-600/30' : 'bg-blue-600 shadow-blue-600/30'
            }`}>
              {phase === 'installing' && installDone
                ? <Bot size={28} className="text-white" />
                : <Download size={28} className="text-white" />}
            </div>
          </div>

          {phase === 'prompt' && (
            <>
              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                Model Required
              </h2>
              <p className={`text-sm text-center mb-8 leading-relaxed ${descColor}`}>
                Gemma 4 model is required to run Edusaku. The model will be downloaded via Ollama.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleInstall}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-lg shadow-blue-600/25"
                >
                  Install Model
                </button>
                <button
                  onClick={() => setPhase('skip-confirm')}
                  className={`w-full py-3 rounded-2xl font-medium transition-colors ${
                    dark ? 'text-gray-400 hover:bg-gray-800' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Skip
                </button>
              </div>
            </>
          )}

          {phase === 'installing' && (
            <>
              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                {installDone ? (installFailed ? 'Installation Failed' : 'Model Installed!') : 'Installing Model'}
              </h2>
              <p className={`text-sm text-center mb-6 font-mono leading-relaxed min-h-[3rem] break-all ${descColor}`}>
                {installDone
                  ? (installFailed ? progressText : 'Gemma 4 is ready. Starting Edusaku…')
                  : (progressText || 'Starting') + dots}
              </p>
              {!installDone && (
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                  <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '65%' }} />
                </div>
              )}
              {installDone && installFailed && (
                <button
                  onClick={() => { setPhase('prompt'); setInstallDone(false); setInstallFailed(false); setProgressText(''); }}
                  className="mt-4 w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-lg shadow-blue-600/25"
                >
                  Try Again
                </button>
              )}
            </>
          )}

          {phase === 'skip-confirm' && (
            <>
              <h2 className={`text-xl font-bold text-center mb-3 ${titleColor}`}>
                Are you sure?
              </h2>
              <p className={`text-sm text-center mb-8 leading-relaxed ${descColor}`}>
                Without the model, Edusaku AI features won't work. Are you sure you want to skip?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { localStorage.setItem(MODEL_SKIP_KEY, 'true'); onClose(); }}
                  className={`w-full py-3 rounded-2xl font-semibold transition-colors ${
                    dark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Yes, skip
                </button>
                <button
                  onClick={() => setPhase('prompt')}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-lg shadow-blue-600/25"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ModelInstallModal;
