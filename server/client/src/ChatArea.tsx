import React, { useRef, useEffect } from 'react';
import { Bot, User, Send, Plus, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachedFile?: string;
}

interface ChatAreaProps {
  dark: boolean;
  messages: Message[];
  input: string;
  isChatting: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onUploadClick: () => void;
}

// ── Markdown ──────────────────────────────────────────────────────────────────

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
    <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${dark ? 'bg-gray-700 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>{children}</code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-gray-900 text-gray-100 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap break-words">{children}</pre>
  ),
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
  tr: ({ children }: any) => <tr>{children}</tr>,
  th: ({ children }: any) => <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2">{children}</td>,
});

// ── File card ─────────────────────────────────────────────────────────────────

const FileCard: React.FC<{ filename: string; dark: boolean }> = ({ filename, dark }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium mb-1.5 max-w-[220px] ${
    dark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-slate-100 border-slate-200 text-slate-700'
  }`}>
    <FileText size={13} className="text-blue-500 shrink-0" />
    <span className="truncate">{filename}</span>
  </div>
);

// ── Auto-grow textarea ────────────────────────────────────────────────────────

const AutoTextarea: React.FC<{
  dark: boolean; value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  autoFocus?: boolean;
}> = ({ dark, value, onChange, onSend, autoFocus }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      }}
      placeholder="Ask Gemma 4…"
      autoFocus={autoFocus}
      className={`w-full resize-none py-2 px-1 text-sm outline-none overflow-y-auto leading-relaxed bg-transparent ${
        dark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'
      }`}
      style={{ maxHeight: '200px', minHeight: '46px' }}
    />
  );
};

// ── Input box ─────────────────────────────────────────────────────────────────

const InputBox: React.FC<{
  dark: boolean; input: string; isChatting: boolean;
  onInputChange: (v: string) => void; onSend: () => void;
  onUploadClick: () => void; centered?: boolean;
}> = ({ dark, input, isChatting, onInputChange, onSend, onUploadClick, centered }) => {
  const wrapperCls = centered ? 'w-full max-w-2xl mx-auto' : 'w-full max-w-4xl mx-auto';

  return (
    <div className={wrapperCls}>
      {/* Input container — like Claude: + button inside, send button inside */}
      <div className={`flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-all ${
        dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        {/* Textarea row */}
        <div className="px-4 pt-3 pb-1">
          <AutoTextarea
            dark={dark} value={input}
            onChange={onInputChange} onSend={onSend}
            autoFocus={centered}
          />
        </div>

        {/* Bottom toolbar: + on left, send on right */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <button
            onClick={onUploadClick}
            title="Upload document"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              dark ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <Plus size={18} />
          </button>

          <button
            onClick={onSend}
            disabled={!input.trim() || isChatting}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <p className={`text-[10px] text-center mt-2 ${dark ? 'text-gray-600' : 'text-slate-400'}`}>
        Powered by Gemma 4 via Ollama · runs locally
      </p>
    </div>
  );
};

// ── ChatArea ──────────────────────────────────────────────────────────────────

const ChatArea: React.FC<ChatAreaProps> = ({
  dark, messages, input, isChatting, onInputChange, onSend, onUploadClick,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0 && !isChatting;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  const bg = dark ? 'bg-gray-950' : 'bg-slate-50';
  const footerBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-100';

  // ── Empty: centered input ─────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className={`flex flex-col flex-1 overflow-hidden ${bg}`}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${dark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
            <Bot size={32} className="text-blue-400" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
            Gemma 4 AI Assistant
          </h2>
          <p className={`text-sm mb-10 text-center max-w-sm ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
            Ask anything. Upload documents to your library first to discuss their contents.
          </p>
          <InputBox
            dark={dark} input={input} isChatting={isChatting}
            onInputChange={onInputChange} onSend={onSend}
            onUploadClick={onUploadClick} centered
          />
        </div>
      </div>
    );
  }

  // ── Active chat ───────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col flex-1 overflow-hidden ${bg}`}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === 'user'
                ? (dark ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600')
                : 'bg-blue-600 text-white'
            }`}>
              {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
            </div>

            {/* Bubble + optional file card */}
            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              style={{ maxWidth: 'min(78%, 680px)' }}>
              {msg.attachedFile && (
                <FileCard filename={msg.attachedFile} dark={dark} />
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm break-words ${
                msg.role === 'user'
                  ? (dark ? 'bg-gray-800 text-gray-100 rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tr-none')
                  : (dark ? 'bg-gray-800/80 text-gray-100 border border-gray-700 rounded-tl-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm')
              }`}>
                {msg.role === 'user' ? (
                  <span className="leading-relaxed whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(dark)}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}

        {isChatting && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bot size={15} />
            </div>
            <div className={`rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center ${
              dark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-slate-200 shadow-sm'
            }`}>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom input */}
      <div className={`px-5 py-4 border-t ${footerBg}`}>
        <InputBox
          dark={dark} input={input} isChatting={isChatting}
          onInputChange={onInputChange} onSend={onSend}
          onUploadClick={onUploadClick}
        />
      </div>
    </div>
  );
};

export default ChatArea;
