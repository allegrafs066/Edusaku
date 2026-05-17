import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Plus, Copy, RotateCcw, Check, Maximize2, FileText, Image, Smartphone, X, Loader2, Pencil, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { QRPopup } from './Sidebar';

export interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
  fileAttachment?: { name: string; type: string };
  timestamp?: string;
}

interface ChatAreaProps {
  dark: boolean;
  messages: Message[];
  streamingContent?: string;
  input: string;
  isChatting: boolean;
  isProcessingFile?: boolean;
  qrCodeDataUrl?: string;
  serverInfo?: { ip: string; port: number } | null;
  pendingImage?: { base64: string; name: string } | null;
  onClearImage?: () => void;
  onImageSelected?: (file: File) => void;
  onInputChange: (v: string) => void;
  onSend: (file: File | null) => void;
  sessionTitle?: string;
  onRetry?: () => void; // for legacy
  onRetryMessage?: (idx: number) => void;
  onEditMessage?: (idx: number) => void;
  onLikeMessage?: (msg: Message) => void;
  onDislikeMessage?: (msg: Message, feedback: any) => void;
}

// ── Code block with language label + copy button ─────────────────────────────
const CodeBlock: React.FC<{ dark: boolean; className?: string; children?: React.ReactNode }> = ({ dark, className, children }) => {
  const [copied, setCopied] = useState(false);
  const lang = (className ?? '').replace('language-', '') || 'code';
  const code = String(children ?? '').replace(/\n$/, '');
  const handle = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className={`my-3 rounded-xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-slate-200'}`}>
      <div className={`flex items-center justify-between px-3 py-1.5 ${dark ? 'bg-[#1E1E1E] text-gray-400' : 'bg-slate-100 text-slate-500'}`}>
        <span className="text-[10px] font-mono font-medium uppercase tracking-wider">{lang}</span>
        <button onClick={handle} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
          dark ? 'hover:bg-gray-700 hover:text-gray-200' : 'hover:bg-slate-200 hover:text-slate-700'
        }`}>
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={dark ? vscDarkPlus : vs}
        customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, fontSize: '0.75rem', padding: '1rem' }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const mdComponents = (dark: boolean) => ({
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }: any) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }: any) => {
    const isBlock = !!(className);
    if (isBlock) return <CodeBlock dark={dark} className={className}>{children}</CodeBlock>;
    return <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${dark ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-800'}`} {...props}>{children}</code>;
  },
  pre: ({ children }: any) => <>{children}</>,
  blockquote: ({ children }: any) => (
    <blockquote className={`border-l-2 pl-3 my-2 italic ${dark ? 'border-blue-500 text-gray-400' : 'border-blue-300 text-blue-700'}`}>{children}</blockquote>
  ),
  hr: () => <hr className={`my-3 ${dark ? 'border-gray-600' : 'border-blue-200'}`} />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-opacity-20 border-current">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className={dark ? 'bg-gray-700' : 'bg-blue-100'}>{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-current divide-opacity-10">{children}</tbody>,
  tr: ({ children }: any) => <tr className="transition-colors">{children}</tr>,
  th: ({ children }: any) => <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2">{children}</td>,
});

const CopyButton: React.FC<{ text: string; dark: boolean }> = ({ text, dark }) => {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={`p-1.5 rounded-lg transition-colors ${
        dark
          ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

// ── File attachment chip ──────────────────────────────────────────────────────
const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return <Image size={14} className="text-green-400" />;
  return <FileText size={14} className="text-blue-400" />;
};

const FileChip: React.FC<{ name: string; dark: boolean; onRemove: () => void }> = ({ name, dark, onRemove }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium max-w-[240px] ${
    dark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-700'
  }`}>
    {fileIcon(name)}
    <span className="truncate flex-1">{name}</span>
    <button onClick={onRemove} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"><X size={12} /></button>
  </div>
);

const ImageChip: React.FC<{ image: { base64: string; name: string }; dark: boolean; onRemove: () => void }> = ({ image, dark, onRemove }) => (
  <div className={`relative inline-block mb-2 group rounded-xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-slate-200'}`}>
    <img src={image.base64} alt={image.name} className="h-16 object-cover" />
    <button onClick={onRemove} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
      <X size={12} />
    </button>
  </div>
);

// ── Upload picker menu ────────────────────────────────────────────────────────
const UploadMenu: React.FC<{
  dark: boolean;
  onUploadFile: () => void;
  onUploadDevice: () => void;
  onClose: () => void;
}> = ({ dark, onUploadFile, onUploadDevice, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  const bg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200';
  return (
    <div ref={ref} className={`absolute bottom-full left-0 mb-2 z-50 w-72 rounded-2xl shadow-2xl border overflow-hidden ${bg}`}>
      <button onClick={onUploadFile} className={`w-full flex items-start gap-3 text-left px-4 py-3.5 transition-colors border-b ${
        dark ? 'hover:bg-gray-700/50 border-gray-700' : 'hover:bg-slate-50 border-slate-100'
      }`}>
        <div className={`p-2 rounded-xl mt-0.5 ${dark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <FileText size={18} />
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${dark ? 'text-gray-100' : 'text-slate-800'}`}>Upload File</span>
          <span className={`text-[11px] mt-0.5 leading-tight ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
            Documents: PDF, DOCX, TXT<br />Images: JPG, PNG, WEBP
          </span>
        </div>
      </button>
      <button onClick={onUploadDevice} className={`w-full flex items-start gap-3 text-left px-4 py-3.5 transition-colors ${
        dark ? 'hover:bg-gray-700/50' : 'hover:bg-slate-50'
      }`}>
        <div className={`p-2 rounded-xl mt-0.5 ${dark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
          <Smartphone size={18} />
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${dark ? 'text-gray-100' : 'text-slate-800'}`}>Upload from Device</span>
          <span className={`text-[11px] mt-0.5 leading-tight ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
            Scan QR code from the mobile app to send files wirelessly
          </span>
        </div>
      </button>
    </div>
  );
};

// ── Feedback Modal ────────────────────────────────────────────────────────────
const FeedbackModal: React.FC<{
  dark: boolean;
  onSubmit: (feedback: { category: string; comment: string }) => void;
  onCancel: () => void;
}> = ({ dark, onSubmit, onCancel }) => {
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const categories = [
    'Hallucination', 'Didn\'t follow instructions', 'Incorrect information',
    'Incomplete response', 'Offensive or unsafe content', 'Other'
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-bold text-lg mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>Submit Feedback</h3>
        <div className="space-y-3 mb-5">
          {categories.map(c => (
            <label key={c} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                category === c 
                  ? 'border-blue-500 bg-blue-500' 
                  : (dark ? 'border-gray-600 group-hover:border-blue-400' : 'border-slate-300 group-hover:border-blue-400')
              }`}>
                {category === c && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`text-sm ${dark ? 'text-gray-300' : 'text-slate-700'}`}>{c}</span>
            </label>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell us more (optional)"
          rows={3}
          className={`w-full p-3 rounded-xl border text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
            dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
          }`}
        />
        <p className={`text-xs mt-3 mb-6 ${dark ? 'text-gray-500' : 'text-slate-400'}`}>Your feedback helps improve future responses.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
          <button onClick={() => onSubmit({ category, comment })} disabled={!category} className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Submit</button>
        </div>
      </div>
    </div>
  );
};

// ── Input bar ─────────────────────────────────────────────────────────────────
const InputBar: React.FC<{
  dark: boolean;
  input: string;
  isChatting: boolean;
  pendingFile: File | null;
  pendingImage?: { base64: string; name: string } | null;
  qrCodeDataUrl?: string;
  serverInfo?: { ip: string; port: number } | null;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onFileSelected: (f: File) => void;
  onImageSelected?: (f: File) => void;
  onRemovePendingFile: () => void;
  onRemovePendingImage?: () => void;
  onShowQR: () => void;
}> = ({ dark, input, isChatting, pendingFile, pendingImage, onInputChange, onSend, onFileSelected, onImageSelected, onRemovePendingFile, onRemovePendingImage, onShowQR }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || expanded) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 124) + 'px';
  }, [input, expanded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.type.startsWith('image/')) {
        onImageSelected?.(f);
      } else {
        onFileSelected(f);
      }
      setShowMenu(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const boxBg = dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200';
  const textColor = dark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400';
  const iconColor = dark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600';
  const textSecondary = dark ? 'text-gray-500' : 'text-slate-400';

  return (
    <div className="w-full max-w-3xl mx-auto px-5">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />

      {/* Pending file preview chip */}
      {pendingFile && (
        <div className="mb-2">
          <FileChip name={pendingFile.name} dark={dark} onRemove={onRemovePendingFile} />
        </div>
      )}
      
      {pendingImage && (
        <ImageChip image={pendingImage} dark={dark} onRemove={() => onRemovePendingImage?.()} />
      )}

      <div className={`rounded-2xl border ${boxBg} overflow-visible relative`}>

        {/* Upload menu */}
        {showMenu && (
          <UploadMenu dark={dark}
            onUploadFile={() => { fileInputRef.current?.click(); }}
            onUploadDevice={() => { setShowMenu(false); onShowQR(); }}
            onClose={() => setShowMenu(false)}
          />
        )}

        {/* Textarea row */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gemma 4…"
            className={`w-full bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none resize-none leading-5 ${textColor} ${
              expanded ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
            style={expanded ? { height: '200px' } : { minHeight: '44px', maxHeight: '124px' }}
          />
          <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}
            className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${iconColor}`}>
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Bottom action row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <button onClick={() => setShowMenu(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showMenu ? (dark ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50') : iconColor}`}
            title="Attach file">
            <Plus size={18} />
          </button>
          <button onClick={onSend} disabled={(!input.trim() && !pendingFile && !pendingImage) || isChatting}
            className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all">
            <Send size={16} />
          </button>
        </div>
      </div>

      <p className={`text-[10px] text-center mt-2 ${textSecondary}`}>
        Powered by Gemma 4 via Ollama · runs locally · Gemma 4 may make mistakes, please verify important information.
      </p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ChatArea: React.FC<ChatAreaProps> = ({
  dark, messages, streamingContent, input, isChatting, isProcessingFile,
  qrCodeDataUrl, serverInfo, pendingImage, onClearImage, onImageSelected, onInputChange, onSend, sessionTitle, onRetryMessage, onEditMessage,
  onLikeMessage, onDislikeMessage
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [dislikeIdx, setDislikeIdx] = useState<number | null>(null);

  const handleSend = useCallback(() => {
    onSend(pendingFile);
    setPendingFile(null);
  }, [pendingFile, onSend]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  const bg = dark ? 'bg-gray-950' : 'bg-slate-50';
  const textPrimary = dark ? 'text-white' : 'text-slate-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-slate-500';

  // ── Empty state ─────────────────────────────────────────────────────────────
  // h-full works now because App.tsx root is h-screen with a proper flex chain
  if (messages.length === 0) {
    return (
      <div className={`flex flex-col h-full overflow-hidden ${bg}`}>
        {/* flex-1 + flex col + justify-center = true vertical center */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center text-center w-full max-w-xl">
            <img src="/logo.png" alt="Edusaku" className="w-24 h-24 object-contain" />
            <h2 className={`text-2xl font-bold mt-1 mb-1 ${textPrimary}`}>Edusaku</h2>
            <p className={`text-sm leading-relaxed max-w-sm mb-6 ${textSecondary}`}>
              Ask anything. Upload a document to start exploring its contents. Everything runs locally on your device.
            </p>
            <InputBar
              dark={dark}
              input={input}
              isChatting={isChatting}
              pendingFile={pendingFile}
              pendingImage={pendingImage}
              onInputChange={onInputChange}
              onSend={handleSend}
              onFileSelected={setPendingFile}
              onImageSelected={onImageSelected}
              onRemovePendingFile={() => setPendingFile(null)}
              onRemovePendingImage={onClearImage}
              onShowQR={() => setShowQR(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Active chat ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full overflow-hidden ${bg}`}>

      {/* Floating session title — no border, same bg as chat area, messages blur under */}
      {sessionTitle && (
        <div className={`shrink-0 sticky top-0 z-20 h-11 flex items-center justify-center pointer-events-none ${
          dark ? 'bg-gray-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
        }`}>
          <span className={`text-sm font-semibold tracking-tight ${
            sessionTitle === 'New Chat' ? 'opacity-0' : (dark ? 'text-gray-300' : 'text-slate-600')
          }`}>
            {sessionTitle}
          </span>
        </div>
      )}

      {/* Scrollable messages */}
      <div className="flex-1 overflow-y-auto relative min-h-0">

        {/* Fade gradient — messages blur as they approach the title */}
        <div className={`sticky top-0 left-0 right-0 h-8 z-10 pointer-events-none ${
          dark ? 'bg-gradient-to-b from-gray-950 to-transparent' : 'bg-gradient-to-b from-white to-transparent'
        }`} />

        <div className="max-w-3xl mx-auto px-6 pb-6 space-y-6">
          {(() => {
            let lastUserIdx = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === 'user') {
                lastUserIdx = i;
                break;
              }
            }
            return messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              const isLastUserMsg = idx === lastUserIdx;
              const textContent = Array.isArray(msg.content) ? msg.content.find(c=>c.type==='text')?.text || '' : msg.content;
            
            return (
            <div key={idx}>
              {msg.role === 'user' ? (
                <div className="flex flex-col items-end gap-1">
                  {msg.fileAttachment && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium mb-1 ${
                      dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {fileIcon(msg.fileAttachment.name)}
                      <span>{msg.fileAttachment.name}</span>
                    </div>
                  )}
                  {msg.content && Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url') && (
                    <div className="mb-1 rounded-xl overflow-hidden border border-slate-200 max-w-[200px]">
                      <img src={msg.content.find(c => c.type === 'image_url')?.image_url?.url} alt="Attached" className="w-full" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-none text-sm leading-relaxed ${
                    dark ? 'bg-gray-800 text-gray-100' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {textContent}
                  </div>
                  <div className={`flex gap-2 items-center mt-1`}>
                    {msg.timestamp && (
                      <span className={`text-[10px] mr-2 ${dark ? 'text-gray-500' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {!isChatting && (
                      <div className="flex gap-1">
                        <CopyButton text={textContent} dark={dark} />
                        <button onClick={() => onRetryMessage?.(idx)} title="Retry" className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                          <RotateCcw size={14} />
                        </button>
                        {isLastUserMsg && (
                          <button onClick={() => onEditMessage?.(idx)} title="Edit" className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1">
                  <div className="flex gap-3 items-start w-full">
                    <img
                      src="/logo.png"
                      alt="Edusaku"
                      className="w-7 h-7 object-contain shrink-0 mt-1"
                    />
                    <div className="flex-1 w-full min-w-0">
                      <div className={`text-sm ${textPrimary}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(dark)}>
                          {textContent}
                        </ReactMarkdown>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <CopyButton text={textContent} dark={dark} />
                        {!isChatting && isLast && (
                          <button
                            onClick={() => onRetryMessage?.(idx)}
                            title="Retry"
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                              dark
                                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onLikeMessage?.(msg);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          }}
                          title="Like"
                          className={`p-1.5 rounded-lg transition-colors ${
                            dark
                              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => setDislikeIdx(idx)}
                          title="Dislike"
                          className={`p-1.5 rounded-lg transition-colors ${
                            dark
                              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
            });
          })()}

          {/* Processing file notification */}
          {isProcessingFile && !isChatting && (
            <div className="flex gap-3 items-center">
              <img src="/logo.png" alt="Edusaku" className="w-7 h-7 object-contain shrink-0" />
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs ${
                dark ? 'bg-gray-800 text-gray-400' : 'bg-white text-slate-500'
              }`}>
                <Loader2 size={13} className="animate-spin text-blue-400" />
                Processing your file, please wait…
              </div>
            </div>
          )}

          {/* Typing indicator or streaming content */}
          {isChatting && (
            <div className="flex gap-3 items-start">
              <img src="/logo.png" alt="Edusaku" className="w-7 h-7 object-contain shrink-0 mt-1" />
              {streamingContent ? (
                <div className={`flex-1 text-sm ${textPrimary}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(dark)}>
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className={`rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center ${
                  dark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 py-4">
        <InputBar
          dark={dark}
          input={input}
          isChatting={isChatting}
          pendingFile={pendingFile}
          pendingImage={pendingImage}
          qrCodeDataUrl={qrCodeDataUrl}
          serverInfo={serverInfo}
          onInputChange={onInputChange}
          onSend={handleSend}
          onFileSelected={setPendingFile}
          onImageSelected={onImageSelected}
          onRemovePendingFile={() => setPendingFile(null)}
          onRemovePendingImage={onClearImage}
          onShowQR={() => setShowQR(true)}
        />
      </div>

      {/* QR Code Modal for when user clicks "Upload from Device" from the input menu */}
      {showQR && qrCodeDataUrl && (
        <QRPopup
          dark={dark}
          qrCodeDataUrl={qrCodeDataUrl}
          serverInfo={serverInfo || null}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Dislike Feedback Modal */}
      {dislikeIdx !== null && (
        <FeedbackModal
          dark={dark}
          onCancel={() => setDislikeIdx(null)}
          onSubmit={(feedback) => {
            onDislikeMessage?.(messages[dislikeIdx], feedback);
            setDislikeIdx(null);
          }}
        />
      )}

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl transition-all duration-300 ${
        showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      } ${dark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          Saved to Bookmarks <Check size={14} className="text-green-500" />
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
