import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Smartphone, CheckCircle, RefreshCcw, Image as ImageIcon, HardDrive, Send, Bot, User, Upload, FileImage } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadFile {
  name: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Server info & QR ──────────────────────────────────────────────────────
  const fetchServerInfo = async () => {
    try {
      const response = await axios.get('/ping');
      setServerInfo({ ip: response.data.ip, port: 3000 });
      const serverUrl = `http://${response.data.ip}:3000`;
      const qrUrl = await QRCode.toDataURL(serverUrl, {
        width: 300, margin: 2,
        color: { dark: '#2563eb', light: '#ffffff' },
      });
      setQrCodeDataUrl(qrUrl);
      setIsLoading(false);
    } catch {
      const ip = window.location.hostname;
      setServerInfo({ ip, port: 3000 });
      setIsLoading(false);
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await axios.get('/files');
      setUploads(response.data.files || []);
    } catch {}
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('image', file);
    try {
      await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      await fetchUploads();
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
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!input.trim() || isChatting) return;
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsChatting(true);
    try {
      const response = await axios.post('/chat', { prompt: input });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${error.response?.data?.error || 'AI model is not responding.'}`,
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDisplayName = (filename: string) => {
    const parts = filename.split('-');
    return parts.length > 2 ? parts.slice(2).join('-') : filename;
  };

  const getFileExt = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return ext.length > 4 ? 'FILE' : ext;
  };

  const isImage = (filename: string) =>
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);

  useEffect(() => {
    fetchServerInfo();
    fetchUploads();
    const interval = setInterval(fetchUploads, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <HardDrive size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Edusaku PC</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
          <CheckCircle size={16} />
          Server Online
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 overflow-hidden flex flex-col lg:flex-row gap-6">

        {/* ── Left panel ── */}
        <div className="lg:w-1/3 flex flex-col gap-5 overflow-y-auto">

          {/* Connect Device */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold mb-4 text-slate-800">Connect Device</h2>
            <div className="flex justify-center mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              {qrCodeDataUrl
                ? <img src={qrCodeDataUrl} alt="QR Code" className="w-full max-w-[180px] h-auto rounded-lg" />
                : <div className="w-[180px] h-[180px] bg-slate-200 animate-pulse rounded-lg" />
              }
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Smartphone size={16} />
              <p className="font-mono text-sm font-bold">{serverInfo?.ip}:{serverInfo?.port}</p>
            </div>
          </div>

          {/* Upload from PC */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold mb-4 text-slate-800">Upload Document</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={[
                'border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all select-none',
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
                isUploading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Upload size={18} className="text-blue-600 animate-bounce" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Uploading… {uploadProgress}%</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Upload size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    {dragOver ? 'Drop to upload' : 'Click or drag file here'}
                  </p>
                  <p className="text-xs text-slate-400">Images & PDF supported</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Recent Uploads
                {uploads.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">({uploads.length})</span>
                )}
              </h2>
              <button
                onClick={fetchUploads}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                title="Refresh"
              >
                <RefreshCcw size={14} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-28 text-center opacity-40">
                  <FileImage size={28} className="mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500">No documents yet</p>
                </div>
              ) : (
                uploads.map((file, index) => (
                  <a
                    key={index}
                    href={`/uploads/${file.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group no-underline"
                  >
                    {/* Thumbnail */}
                    <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                      {isImage(file.name) ? (
                        <img
                          src={`/uploads/${file.name}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 tracking-wide">
                          {getFileExt(file.name)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate leading-tight group-hover:text-blue-700 transition-colors">
                        {getDisplayName(file.name)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(file.timestamp).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <ImageIcon size={13} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  </a>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: AI Chat ── */}
        <div className="lg:w-2/3 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Gemma 4 AI Assistant</h2>
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Local & Offline</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-60">
                <Bot size={48} className="mb-4 text-blue-200" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">How can I help you today?</h3>
                <p className="text-sm text-slate-500">
                  Ask me about your documents, generate summaries, or just have a chat. Everything stays private on this PC.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-100 text-slate-800 rounded-tr-none'
                      : 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? msg.content : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-blue-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-slate-800 text-slate-100 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-300 pl-3 my-2 text-blue-700 italic">{children}</blockquote>,
                          hr: () => <hr className="border-blue-200 my-3" />,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-3 rounded-xl border border-blue-100">
                              <table className="min-w-full border-collapse text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-blue-100">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-blue-50">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-blue-50/50 transition-colors">{children}</tr>,
                          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-blue-900 whitespace-nowrap">{children}</th>,
                          td: ({ children }) => <td className="px-3 py-2 text-blue-800">{children}</td>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={15} />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Gemma 4..."
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isChatting}
                className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Powered by local Gemma 4 model via Ollama
            </p>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        Edusaku Offline Ecosystem &copy; 2026
      </footer>
    </div>
  );
};

export default App;
