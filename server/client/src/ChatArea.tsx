import React, { useRef, useEffect, useState } from 'react';
import { Send, Plus, Copy, RotateCcw, Check, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAreaProps {
  dark: boolean;
  messages: Message[];
  input: string;
  isChatting: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onUploadClick?: () => void;
  sessionTitle?: string;
  onRetry?: () => void;
}

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
  code: ({ children }: any) => (
    <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
      dark ? 'bg-gray-700 text-blue-300' : 'bg-blue-100 text-blue-800'
    }`}>{children}</code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-gray-900 text-gray-100 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono">{children}</pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className={`border-l-2 pl-3 my-2 italic ${
      dark ? 'border-blue-500 text-gray-400' : 'border-blue-300 text-blue-700'
    }`}>{children}</blockquote>
  ),
  hr: () => <hr className={`my-3 ${dark ? 'border-gray-600' : 'border-blue-200'}`} />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-opacity-20 border-current">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className={dark ? 'bg-gray-700' : 'bg-blue-100'}>{children}</thead>
  ),
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

// ── Gemini-style input box ────────────────────────────────────────────────────
// Layout:
//   ┌─────────────────────────────────────────┐
//   │  textarea (grows, scrolls inside)  [⤢] │
//   ├─────────────────────────────────────────┤
//   │  [+]                          [→ send]  │
//   └─────────────────────────────────────────┘
const InputBar: React.FC<{
  dark: boolean;
  input: string;
  isChatting: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onUploadClick?: () => void;
}> = ({ dark, input, isChatting, onInputChange, onSend, onUploadClick }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-resize textarea height (1–5 rows), capped when expanded
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || expanded) return;
    el.style.height = 'auto';
    // ~20px line-height, 24px vertical padding → 5 rows ≈ 124px
    el.style.height = Math.min(el.scrollHeight, 124) + 'px';
  }, [input, expanded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const boxBg = dark
    ? 'bg-gray-900 border-gray-700'
    : 'bg-white border-slate-200';
  const textColor = dark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400';
  const iconColor = dark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600';
  const textSecondary = dark ? 'text-gray-500' : 'text-slate-400';

  return (
    <div className="w-full max-w-3xl mx-auto px-5">
      {/* Outer rounded box — matches Gemini card style */}
      <div className={`rounded-2xl border ${boxBg} overflow-hidden`}>

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
            style={
              expanded
                ? { height: '200px' }
                : { minHeight: '44px', maxHeight: '124px' }
            }
          />
          {/* Expand / collapse toggle — top-right of textarea */}
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse' : 'Expand'}
            className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${iconColor}`}
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Bottom action row — icon left, send right, nothing in middle */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <button
            onClick={onUploadClick}
            className={`p-1.5 rounded-lg transition-colors ${iconColor}`}
            title="Attach file"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={onSend}
            disabled={!input.trim() || isChatting}
            className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <p className={`text-[10px] text-center mt-2 ${textSecondary}`}>
        Powered by Gemma 4 via Ollama · runs locally
      </p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ChatArea: React.FC<ChatAreaProps> = ({
  dark, messages, input, isChatting, onInputChange, onSend, onUploadClick, sessionTitle, onRetry,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

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
              Ask anything. Upload a document first to discuss its contents. Everything runs locally on this PC.
            </p>
            <InputBar
              dark={dark}
              input={input}
              isChatting={isChatting}
              onInputChange={onInputChange}
              onSend={onSend}
              onUploadClick={onUploadClick}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Active chat ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full overflow-hidden ${bg}`}>

      {/* Sticky session title */}
      {sessionTitle && sessionTitle !== 'New Chat' && (
        <div className="shrink-0 h-14 flex items-center justify-center pointer-events-none">
          <span className={`text-sm font-medium ${textSecondary}`}>{sessionTitle}</span>
        </div>
      )}

      {/* Scrollable messages */}
      <div className="flex-1 overflow-y-auto relative min-h-0">

        {/* Fade gradient at top */}
        <div className={`sticky top-0 left-0 right-0 h-10 z-10 pointer-events-none ${
          dark
            ? 'bg-gradient-to-b from-gray-950 to-transparent'
            : 'bg-gradient-to-b from-slate-50 to-transparent'
        }`} />

        <div className="max-w-3xl mx-auto px-6 pb-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-none text-sm leading-relaxed ${
                    dark ? 'bg-gray-800 text-gray-100' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start">
                  <img
                    src="/logo.png"
                    alt="Edusaku"
                    className="w-7 h-7 object-contain shrink-0 mt-1"
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${textPrimary}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(dark)}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <CopyButton text={msg.content} dark={dark} />
                      {onRetry && idx === messages.length - 1 && (
                        <button
                          onClick={onRetry}
                          className={`p-1.5 rounded-lg transition-colors ${
                            dark
                              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isChatting && (
            <div className="flex gap-3 items-start">
              <img src="/logo.png" alt="Edusaku" className="w-7 h-7 object-contain shrink-0 mt-1" />
              <div className={`rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center ${
                dark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input — shrink-0, always at bottom */}
      <div className="shrink-0 py-4">
        <InputBar
          dark={dark}
          input={input}
          isChatting={isChatting}
          onInputChange={onInputChange}
          onSend={onSend}
          onUploadClick={onUploadClick}
        />
      </div>
    </div>
  );
};

export default ChatArea;
