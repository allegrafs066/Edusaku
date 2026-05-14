import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Smartphone, CheckCircle, RefreshCcw, Image as ImageIcon, HardDrive, Send, Bot, User } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchServerInfo = async () => {
    try {
      const response = await axios.get('/ping');
      setServerInfo({ ip: response.data.ip, port: 3000 });
      
      const serverUrl = `http://${response.data.ip}:3000`;
      const qrUrl = await QRCode.toDataURL(serverUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#2563eb',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch server info', error);
      const ip = window.location.hostname;
      setServerInfo({ ip, port: 3000 });
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await axios.get('/files');
      setUploads(response.data.files || []);
    } catch (error) {
      console.error('Failed to fetch uploads', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isChatting) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsChatting(true);

    try {
      const response = await axios.post('/chat', { prompt: input });
      const assistantMessage: Message = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = { 
        role: 'assistant', 
        content: `Error: ${error.response?.data?.error || 'AI model is not responding.'}` 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
            <CheckCircle size={16} />
            Server Online
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 overflow-hidden flex flex-col lg:flex-row gap-8">
        
        {/* Left Section: Connection & Uploads */}
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Connection Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Connect Device</h2>
            <div className="flex justify-center mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Pairing QR Code" className="w-full max-w-[200px] h-auto rounded-lg" />
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-200 animate-pulse rounded-lg" />
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 mb-4">
              <Smartphone size={18} />
              <p className="font-mono text-sm font-bold">{serverInfo?.ip}:{serverInfo?.port}</p>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Recent Uploads</h2>
              <button onClick={fetchUploads} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <RefreshCcw size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
                  <ImageIcon size={32} className="mb-2" />
                  <p className="text-xs">No documents yet</p>
                </div>
              ) : (
                uploads.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      <img src={`/uploads/${file.name}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-700">
                        {file.name.split('-').slice(2).join('-')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(file.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Section: AI Chat */}
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

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                      : 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown
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
                          code: ({ children }) => (
                            <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-slate-800 text-slate-100 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono">{children}</pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-blue-300 pl-3 my-2 text-blue-700 italic">{children}</blockquote>
                          ),
                          hr: () => <hr className="border-blue-200 my-3" />,
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
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={16} />
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

          {/* Chat Input */}
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
