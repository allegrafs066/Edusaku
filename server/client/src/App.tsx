import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { PanelLeft, Sun, Moon, HardDrive } from 'lucide-react';
import axios from 'axios';
import Sidebar from './Sidebar';
import ChatArea, { Message } from './ChatArea';

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
  /** filenames of documents attached to this session */
  attachedFiles: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const sessionTitle = (messages: Message[]) => {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New Chat';
  return first.content.length > 40
    ? first.content.slice(0, 40) + '…'
    : first.content;
};

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
      // Auto-attach to active session
      if (activeChatId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeChatId
              ? { ...s, attachedFiles: Array.from(new Set([...s.attachedFiles, file.name])) }
              : s,
          ),
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

  // ── Chat sessions ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeChatId) ?? null;
  const messages = activeSession?.messages ?? [];

  const createNewChat = () => {
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
  };

  // Create a default session on first load
  useEffect(() => {
    if (sessions.length === 0) createNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Chat input & send ──────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isChatting || !activeChatId) return;

    const userText = input.trim();
    setInput('');
    setIsChatting(true);

    // Build context from attached files
    const session = sessions.find((s) => s.id === activeChatId);
    const fileContext = session?.attachedFiles.length
      ? `\n\n[Context: The user has uploaded the following documents: ${session.attachedFiles.join(', ')}. Refer to them when relevant.]`
      : '';

    const userMsg: Message = { role: 'user', content: userText };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId
          ? {
              ...s,
              messages: [...s.messages, userMsg],
              title: s.messages.length === 0 ? (userText.length > 40 ? userText.slice(0, 40) + '…' : userText) : s.title,
            }
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

  const headerText = 'text-white';

  const appBg = dark ? 'bg-gray-950' : 'bg-slate-100';

  return (
    <div className={`min-h-screen flex flex-col ${appBg} transition-colors duration-200`}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <header className={`h-14 flex items-center justify-between px-4 border-b shadow-sm sticky top-0 z-40 ${headerBg}`}>
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
            title="Toggle sidebar"
          >
            <PanelLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <HardDrive size={15} className="text-white" />
            </div>
            <span className={`font-bold text-base tracking-tight ${headerText}`}>Edusaku PC</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active session title */}
          {activeSession && activeSession.title !== 'New Chat' && (
            <span className="hidden md:block text-sm text-white/70 max-w-xs truncate">
              {activeSession.title}
            </span>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((v) => !v)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar */}
        <Sidebar
          dark={dark}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          qrCodeDataUrl={qrCodeDataUrl}
          serverInfo={serverInfo}
          uploads={uploads}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUploadClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          sessions={sessions}
          activeChatId={activeChatId}
          onNewChat={createNewChat}
          onSelectChat={(id) => setActiveChatId(id)}
          onRefreshUploads={fetchUploads}
        />

        {/* Main chat — push right when sidebar open on desktop */}
        <main
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-72' : 'ml-0'
          }`}
        >
          <ChatArea
            dark={dark}
            messages={messages}
            input={input}
            isChatting={isChatting}
            onInputChange={setInput}
            onSend={handleSend}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
