import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Sun, Moon } from 'lucide-react';
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

  const handleRetry = useCallback(async () => {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg || isChatting || !activeChatId) return;
  setSessions(prev =>
    prev.map(s =>
      s.id === activeChatId
        ? { ...s, messages: s.messages.slice(0, -1) }
        : s
    )
  );
  setInput(lastUserMsg.content);
}, [messages, isChatting, activeChatId]);

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
      const currentMessages = sessions.find((s) => s.id === activeChatId)?.messages ?? [];
      const res = await axios.post('/chat', {
        prompt: userText + fileContext,
        history: currentMessages,
      });
      const assistantMsg: Message = { role: 'assistant', content: res.data.response };

      // Stop typing indicator BEFORE appending response — prevents flash
      setIsChatting(false);

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
      setIsChatting(false);
    } finally {
      // isChatting already set to false above on success; only reaches here on error path
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
  const appBg = dark ? 'bg-gray-950' : 'bg-slate-50';

  return (
    <div className={`h-screen flex flex-col ${appBg} transition-colors duration-200`}>

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

      {/* ── Floating dark mode toggle — fixed top-right ── */}
      <button
        onClick={() => setDark((v) => !v)}
        className={`fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl shadow-lg transition-colors ${
          dark
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
            : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
        }`}
        title={dark ? 'Light mode' : 'Dark mode'}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* ── Body: sidebar + chat, full height, no header ── */}
      {/* min-h-0 is critical: allows flex children to shrink below their content size */}
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
          sessions={sessions}
          activeChatId={activeChatId}
          onNewChat={createNewChat}
          onSelectChat={(id) => setActiveChatId(id)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />

        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-0"
          style={{ marginLeft: sidebarOpen ? '16rem' : '3.5rem' }}
        >
          <ChatArea
            dark={dark}
            messages={messages}
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
