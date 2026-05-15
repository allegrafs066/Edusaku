import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Sun, Moon, HardDrive } from 'lucide-react';
import axios from 'axios';
import Sidebar from './Sidebar';
import ChatArea, { Message } from './ChatArea';
import Onboarding from './Onboarding';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadFile {
  name: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  attachedFiles: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

// ── App ───────────────────────────────────────────────────────────────────────

const App: React.FC = () => {

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('edusaku-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('edusaku-theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // ── Onboarding ─────────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('edusaku-onboarding-done') !== 'true';
  });

  const handleOnboardingDone = () => {
    localStorage.setItem('edusaku-onboarding-done', 'true');
    setShowOnboarding(false);
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Server / QR ────────────────────────────────────────────────────────────
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);

  const fetchServerInfo = useCallback(async () => {
    try {
      const res = await axios.get('/ping');
      setServerInfo({ ip: res.data.ip, port: 3000 });
      const url = `http://${res.data.ip}:3000`;
      const qr = await QRCode.toDataURL(url, {
        width: 280, margin: 2,
        color: { dark: '#2563eb', light: dark ? '#1f2937' : '#ffffff' },
      });
      setQrCodeDataUrl(qr);
    } catch {
      setServerInfo({ ip: window.location.hostname, port: 3000 });
    }
  }, [dark]);

  // ── Uploads ────────────────────────────────────────────────────────────────
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUploads = useCallback(async () => {
    try {
      const res = await axios.get('/files');
      setUploads(res.data.files || []);
    } catch {}
  }, []);

  const uploadFile = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('image', file);
    try {
      await axios.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      await fetchUploads();
      // Auto-attach to active session and show file card in chat
      if (activeChatId) {
        const displayName = file.name; // will be cleaned in ChatArea
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeChatId) return s;
            const updatedFiles = Array.from(new Set([...s.attachedFiles, file.name]));
            // Add a system message showing the file was attached
            const fileMsg = {
              role: 'user' as const,
              content: `I've uploaded a document for you to analyze.`,
              attachedFile: file.name.split('-').slice(2).join('-') || file.name,
            };
            return { ...s, attachedFiles: updatedFiles, messages: [...s.messages, fileMsg] };
          }),
        );
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // Delete upload — calls server DELETE endpoint (or just removes from list if server doesn't support it)
  const handleDeleteUpload = async (filename: string) => {
    try {
      await axios.delete(`/files/${encodeURIComponent(filename)}`);
    } catch {
      // Server may not have DELETE endpoint yet — remove from local state anyway
    }
    setUploads((prev) => prev.filter((f) => f.name !== filename));
  };

  // ── Chat sessions ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeChatId) ?? null;
  const messages = activeSession?.messages ?? [];

  const createNewChat = useCallback(() => {
    const id = uid();
    const session: ChatSession = {
      id,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [],
      attachedFiles: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveChatId(id);
  }, []);

  const handleDeleteChat = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      // If we deleted the active chat, switch to the next one
      if (id === activeChatId) {
        setActiveChatId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleRenameChat = (id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s)),
    );
  };

  useEffect(() => {
    if (sessions.length === 0) createNewChat();
  }, [sessions.length, createNewChat]);

  // ── Chat input & send ──────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isChatting || !activeChatId) return;

    const userText = input.trim();
    setInput('');
    setIsChatting(true);

    const session = sessions.find((s) => s.id === activeChatId);
    const isFirstMessage = (session?.messages.length ?? 0) === 0;

    const fileContext = session?.attachedFiles.length
      ? `\n\n[Context: The user has uploaded the following documents: ${session.attachedFiles.join(', ')}. Refer to them when relevant.]`
      : '';

    const userMsg: Message = { role: 'user', content: userText };

    // Append user message immediately
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId
          ? { ...s, messages: [...s.messages, userMsg] }
          : s,
      ),
    );

    try {
      const res = await axios.post('/chat', { prompt: userText + fileContext });
      const assistantMsg: Message = { role: 'assistant', content: res.data.response };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeChatId
            ? { ...s, messages: [...s.messages, assistantMsg] }
            : s,
        ),
      );

      // After first exchange, ask AI to generate a short title
      if (isFirstMessage) {
        try {
          const titleRes = await axios.post('/chat', {
            prompt: `In 5 words or less, write a concise title for a conversation that starts with: "${userText}". Reply with ONLY the title, no punctuation, no quotes.`,
          });
          const generatedTitle = titleRes.data.response?.trim().slice(0, 50) || userText.slice(0, 40);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeChatId ? { ...s, title: generatedTitle } : s,
            ),
          );
        } catch {
          // Fallback: use first user message as title
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeChatId
                ? { ...s, title: userText.length > 40 ? userText.slice(0, 40) + '…' : userText }
                : s,
            ),
          );
        }
      }
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: `**Error:** ${err.response?.data?.error || 'AI model is not responding. Make sure Ollama is running.'}`,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeChatId ? { ...s, messages: [...s.messages, errMsg] } : s,
        ),
      );
    } finally {
      setIsChatting(false);
    }
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchServerInfo();
    fetchUploads();
    const interval = setInterval(fetchUploads, 8000);
    return () => clearInterval(interval);
  }, [fetchServerInfo, fetchUploads]);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const headerBg = dark
    ? 'bg-gray-900 border-gray-700/60'
    : 'bg-gradient-to-r from-blue-700 to-blue-600 border-blue-800/20';
  const appBg = dark ? 'bg-gray-950' : 'bg-slate-100';

  return (
    <div className={`min-h-screen flex flex-col ${appBg} transition-colors duration-200`}>

      {showOnboarding && (
        <Onboarding dark={dark} onDone={handleOnboardingDone} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <header className={`h-14 flex items-center justify-between px-4 border-b shadow-sm sticky top-0 z-40 ${headerBg}`}>
        {/* Left: logo */}
        <div className="flex items-center gap-2 z-10 pl-14">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <HardDrive size={15} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">Edusaku PC</span>
        </div>

        {/* Center: active session title */}
        {activeSession && activeSession.title !== 'New Chat' && (
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-sm font-medium text-white/80 max-w-xs truncate px-4 text-center">
              {activeSession.title}
            </span>
          </div>
        )}

        {/* Right: dark mode toggle */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={() => setDark((v) => !v)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          dark={dark}
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          qrCodeDataUrl={qrCodeDataUrl}
          serverInfo={serverInfo}
          uploads={uploads}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUploadClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDeleteUpload={handleDeleteUpload}
          sessions={sessions}
          activeChatId={activeChatId}
          onNewChat={createNewChat}
          onSelectChat={(id) => setActiveChatId(id)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />

        <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ marginLeft: sidebarOpen ? '16rem' : '3.5rem' }}>
          <ChatArea
            dark={dark}
            messages={messages}
            input={input}
            isChatting={isChatting}
            onInputChange={setInput}
            onSend={handleSend}
            onUploadClick={() => fileInputRef.current?.click()}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
