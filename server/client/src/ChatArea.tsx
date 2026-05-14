import React, { useRef, useEffect } from 'react';
import { Bot, User, Send } from 'lucide-react';
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
}

// ── Markdown components ───────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

const ChatArea: React.FC<ChatAreaProps> = ({
  dark, messages, input, isChatting, onInputChange, onSend,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  const bg = dark ? 'bg-gray-950' : 'bg-slate-50';
  const inputBg = dark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const inputFocus = dark ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-blue-500 focus:ring-blue-500/20';
  const footerBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-100';

  return (
    <div className={`flex flex-col flex-1 overflow-hidden ${bg}`}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-5 ${
              dark ? 'bg-blue-900/40' : 'bg-blue-50'
            }`}>
              <Bot size={32} className={dark ? 'text-blue-400' : 'text-blue-400'} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
              Gemma 4 AI Assistant
            </h3>
            <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
              Ask anything. Upload a document first to discuss its contents. Everything runs locally on this PC.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? (dark ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600')
                  : 'bg-blue-600 text-white'
              }`}>
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? (dark
                    ? 'bg-gray-800 text-gray-100 rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tr-none')
                  : (dark
                    ? 'bg-gray-800/80 text-gray-100 border border-gray-700 rounded-tl-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm')
              }`}>
                {msg.role === 'user' ? (
                  <span className="leading-relaxed">{msg.content}</span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents(dark)}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
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

      {/* Input bar */}
      <div className={`px-5 py-4 border-t ${footerBg}`}>
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Ask Gemma 4…"
            className={`w-full rounded-2xl py-3.5 pl-5 pr-14 border text-sm outline-none transition-all focus:ring-2 ${inputBg} ${inputFocus}`}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isChatting}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className={`text-[10px] text-center mt-2 ${dark ? 'text-gray-600' : 'text-slate-400'}`}>
          Powered by Gemma 4 via Ollama · runs locally
        </p>
      </div>
    </div>
  );
};

export default ChatArea;
