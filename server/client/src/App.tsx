import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Sun, Moon } from 'lucide-react';
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
  lastActivityAt: string;
  messages: Message[];
  attachedFiles: string[];
  pinned: boolean;
}

// ── Persistence helpers ────────────────────────────────────────────────────────

const SESSIONS_KEY = 'edusaku-sessions';
const ACTIVE_KEY   = 'edusaku-active-chat';
const uid = () => Math.random().toString(36).slice(2, 10);

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    // Back-compat: fill missing fields that older sessions may lack
    return parsed.map(s => ({
      ...s,
      pinned: s.pinned ?? false,
      lastActivityAt: s.lastActivityAt ?? s.createdAt,
      attachedFiles: s.attachedFiles ?? [],
    }));
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });
}

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
  const [showOnboarding, setShowOnboarding] = useState(() =>
    localStorage.getItem('edusaku-onboarding-done') !== 'true'
  );
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
      const res = await fetch('/ping').then(r => r.json());
      setServerInfo({ ip: res.ip, port: 3000 });
      const qr = await QRCode.toDataURL(`http://${res.ip}:3000`, {
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
      const res = await fetch('/files').then(r => r.json());
      setUploads(res.files || []);
    } catch {}
  }, []);

  const uploadFile = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('image', file);
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText));
        xhr.onerror = reject;
        xhr.open('POST', '/upload');
        xhr.send(fd);
      });
      await fetchUploads();
      if (activeChatId) {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeChatId) return s;
          const updatedFiles = Array.from(new Set([...s.attachedFiles, file.name]));
          const fileMsg: Message = {
            role: 'user',
            content: `I've uploaded a document for you to analyze.`,
          };
          return { ...s, attachedFiles: updatedFiles, messages: [...s.messages, fileMsg] };
        }));
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

  const handleDeleteUpload = async (filename: string) => {
    try {
      await fetch(`/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    } catch {}
    setUploads(prev => prev.filter(f => f.name !== filename));
  };

  // ── Chat sessions ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    const all = loadSessions();
    if (saved && all.find(s => s.id === saved)) return saved;
    if (all.length > 0) return sortSessions(all)[0].id;
    return null;
  });

  // Persist sessions & active chat whenever they change
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => {
    if (activeChatId) localStorage.setItem(ACTIVE_KEY, activeChatId);
  }, [activeChatId]);

  const sortedSessions = sortSessions(sessions);
  const activeSession = sessions.find(s => s.id === activeChatId) ?? null;
  const messages = activeSession?.messages ?? [];

  const createNewChat = useCallback(() => {
    const now = new Date().toISOString();
    const id = uid();
    const session: ChatSession = {
      id, title: 'New Chat',
      createdAt: now, lastActivityAt: now,
      messages: [], attachedFiles: [], pinned: false,
    };
    setSessions(prev => [session, ...prev]);
    setActiveChatId(id);
  }, []);

  // If no sessions exist, create one
  useEffect(() => {
    if (sessions.length === 0) { createNewChat(); return; }
    if (!activeChatId || !sessions.find(s => s.id === activeChatId)) {
      setActiveChatId(sortSessions(sessions)[0].id);
    }
  }, [sessions.length]); // eslint-disable-line

  // Handle new chat: reuse existing empty (unpinned) session, or create new
  const handleNewChat = useCallback(() => {
    const emptySession = sortedSessions.find(s => s.messages.length === 0 && !s.pinned);
    if (emptySession) { setActiveChatId(emptySession.id); return; }
    createNewChat();
  }, [sortedSessions, createNewChat]);

  const handleDeleteChat = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeChatId) {
        setActiveChatId(next.length > 0 ? sortSessions(next)[0].id : null);
      }
      return next;
    });
  };

  const handleRenameChat = (id: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
    // auto-saved via useEffect
  };

  const handlePinChat = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
  };

  // ── Chat input & send (with streaming) ────────────────────────────────────
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const handleRetry = useCallback(async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg || isChatting || !activeChatId) return;
    setSessions(prev => prev.map(s =>
      s.id === activeChatId ? { ...s, messages: s.messages.slice(0, -1) } : s
    ));
    setInput(lastUserMsg.content);
  }, [messages, isChatting, activeChatId]);

  const handleSend = async () => {
    if (!input.trim() || isChatting || !activeChatId) return;
    const userText = input.trim();
    setInput('');
    setIsChatting(true);
    setStreamingContent('');

    const session = sessions.find(s => s.id === activeChatId);
    const chatId = activeChatId; // capture for async closures
    const isFirstMessage = (session?.messages.length ?? 0) === 0;
    const fileContext = session?.attachedFiles.length
      ? `\n\n[Context: The user has uploaded the following documents: ${session!.attachedFiles.join(', ')}. Refer to them when relevant.]`
      : '';

    const userMsg: Message = { role: 'user', content: userText };
    const now = new Date().toISOString();

    setSessions(prev => prev.map(s =>
      s.id === chatId
        ? { ...s, messages: [...s.messages, userMsg], lastActivityAt: now }
        : s
    ));

    const historyMessages = session?.messages ?? [];

    try {
      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText + fileContext, history: historyMessages }),
      });

      if (!response.ok || !response.body) throw new Error('Stream request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullContent += parsed.token;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      setIsChatting(false);
      setStreamingContent('');
      const assistantMsg: Message = { role: 'assistant', content: fullContent || '*(No response)*' };
      setSessions(prev => prev.map(s =>
        s.id === chatId
          ? { ...s, messages: [...s.messages, assistantMsg], lastActivityAt: new Date().toISOString() }
          : s
      ));

      // Auto-generate title on first message — use simple /chat (not streaming)
      if (isFirstMessage && fullContent) {
        try {
          const titleRes = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `In 5 words or less, write a concise title for a conversation that starts with: "${userText}". Reply with ONLY the title, no punctuation, no quotes.`,
              history: [],
            }),
          });
          const titleData = await titleRes.json();
          const raw = (titleData.response ?? '').trim();
          const generatedTitle = raw.slice(0, 50) || (userText.length > 40 ? userText.slice(0, 40) + '…' : userText);
          setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: generatedTitle } : s));
        } catch {
          const fallback = userText.length > 40 ? userText.slice(0, 40) + '…' : userText;
          setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: fallback } : s));
        }
      }
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: `**Error:** ${err.message || 'AI model is not responding. Make sure Ollama is running.'}`,
      };
      setSessions(prev => prev.map(s =>
        s.id === chatId ? { ...s, messages: [...s.messages, errMsg] } : s
      ));
      setIsChatting(false);
      setStreamingContent('');
    }
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchServerInfo();
    fetchUploads();
    const interval = setInterval(fetchUploads, 8000);
    return () => clearInterval(interval);
  }, [fetchServerInfo, fetchUploads]);

  const appBg = dark ? 'bg-gray-950' : 'bg-slate-50';

  return (
    <div className={`h-screen flex flex-col ${appBg} transition-colors duration-200`}>
      {showOnboarding && <Onboarding dark={dark} onDone={handleOnboardingDone} />}

      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />

      <button
        onClick={() => setDark(v => !v)}
        className={`fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl shadow-lg transition-colors ${
          dark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
               : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
        }`}
        title={dark ? 'Light mode' : 'Dark mode'}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="flex flex-1 overflow-hidden min-h-0">
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
          sessions={sortedSessions}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={id => setActiveChatId(id)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onPinChat={handlePinChat}
        />
        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-0"
          style={{ marginLeft: sidebarOpen ? '16rem' : '3.5rem' }}
        >
          <ChatArea
            dark={dark}
            messages={messages}
            streamingContent={streamingContent}
            input={input}
            isChatting={isChatting}
            onInputChange={setInput}
            onSend={handleSend}
            onUploadClick={() => fileInputRef.current?.click()}
            sessionTitle={activeSession?.title}
            onRetry={handleRetry}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
