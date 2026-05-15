import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone, Upload, FileImage, Plus, MessageSquare, X,
  Trash2, PanelLeftOpen, PanelLeftClose, MoreVertical, Pencil, Check,
  AlertTriangle, FolderOpen, QrCode, Grid3X3, Search, FileText,
} from 'lucide-react';

interface UploadFile { name: string; timestamp: string; }
interface ChatSession { id: string; title: string; createdAt: string; }

interface SidebarProps {
  dark: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  qrCodeDataUrl: string;
  serverInfo: { ip: string; port: number } | null;
  uploads: UploadFile[];
  isUploading: boolean;
  uploadProgress: number;
  onUploadClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDeleteUpload: (filename: string) => void;
  sessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
}

const getDisplayName = (f: string) => { const p = f.split('-'); return p.length > 2 ? p.slice(2).join('-') : f; };
const isImage = (f: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f);
const getFileExt = (f: string) => { const e = f.split('.').pop()?.toUpperCase() || 'FILE'; return e.length > 4 ? 'FILE' : e; };

// ── Highlight matching text ───────────────────────────────────────────────────
const Highlight: React.FC<{ text: string; query: string; dark: boolean }> = ({ text, query, dark }) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className={`rounded px-0.5 ${dark ? 'bg-yellow-500/40 text-yellow-200' : 'bg-yellow-200 text-yellow-900'}`}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
};

// ── Search Popup ──────────────────────────────────────────────────────────────
const SearchPopup: React.FC<{
  dark: boolean; uploads: UploadFile[]; sessions: ChatSession[];
  onSelectChat: (id: string) => void; onClose: () => void;
}> = ({ dark, uploads, sessions, onSelectChat, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filteredDocs = q.trim() ? uploads.filter(f => getDisplayName(f.name).toLowerCase().includes(q.toLowerCase())) : [];
  const filteredChats = q.trim() ? sessions.filter(s => s.title.toLowerCase().includes(q.toLowerCase())) : [];
  const hasResults = filteredDocs.length > 0 || filteredChats.length > 0;

  const bg = dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200';
  const sub = dark ? 'text-gray-500' : 'text-slate-400';
  const hov = dark ? 'hover:bg-gray-800' : 'hover:bg-slate-50';
  const label = dark ? 'text-gray-500' : 'text-slate-400';

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${bg}`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-slate-100'}`}>
          <Search size={16} className={sub} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search documents and chats…"
            className={`flex-1 text-sm outline-none bg-transparent ${dark ? 'text-white placeholder-gray-500' : 'text-slate-800 placeholder-slate-400'}`}
          />
          {q && <button onClick={() => setQ('')} className={sub}><X size={14} /></button>}
          <button onClick={onClose} className={`${sub} hover:opacity-70`}><X size={16} /></button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!q.trim() && (
            <p className={`text-xs text-center py-8 ${sub}`}>Type to search documents and chats</p>
          )}
          {q.trim() && !hasResults && (
            <p className={`text-xs text-center py-8 ${sub}`}>No results for "{q}"</p>
          )}

          {filteredDocs.length > 0 && (
            <div className="py-2">
              <p className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 ${label}`}>Documents</p>
              {filteredDocs.map((f, i) => (
                <a key={i} href={`/uploads/${f.name}`} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors no-underline ${hov}`}
                  onClick={onClose}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-gray-700' : 'bg-slate-100'}`}>
                    {isImage(f.name)
                      ? <img src={`/uploads/${f.name}`} alt="" className="w-full h-full object-cover rounded-lg" />
                      : <span className={`text-[9px] font-bold ${dark ? 'text-gray-400' : 'text-slate-500'}`}>{getFileExt(f.name)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${dark ? 'text-gray-200' : 'text-slate-700'}`}>
                      <Highlight text={getDisplayName(f.name)} query={q} dark={dark} />
                    </p>
                    <p className={`text-[10px] ${sub}`}>Document</p>
                  </div>
                  <FileText size={13} className="text-blue-500 shrink-0" />
                </a>
              ))}
            </div>
          )}

          {filteredChats.length > 0 && (
            <div className="py-2">
              <p className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 ${label}`}>Chats</p>
              {filteredChats.map((s) => (
                <button key={s.id}
                  onClick={() => { onSelectChat(s.id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${hov}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-gray-700' : 'bg-slate-100'}`}>
                    <MessageSquare size={14} className={dark ? 'text-gray-400' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${dark ? 'text-gray-200' : 'text-slate-700'}`}>
                      <Highlight text={s.title} query={q} dark={dark} />
                    </p>
                    <p className={`text-[10px] ${sub}`}>Chat · {new Date(s.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <MessageSquare size={13} className="text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<{
  dark: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void;
}> = ({ dark, title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className={`relative z-10 w-full max-w-sm rounded-3xl shadow-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start gap-4 mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${dark ? 'bg-red-900/40' : 'bg-red-50'}`}>
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className={`font-bold text-base mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
          <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-slate-500'}`}>{message}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-colors border ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── QR Popup ──────────────────────────────────────────────────────────────────
const QRPopup: React.FC<{
  dark: boolean; qrCodeDataUrl: string;
  serverInfo: { ip: string; port: number } | null; onClose: () => void;
}> = ({ dark, qrCodeDataUrl, serverInfo, onClose }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-sm rounded-3xl shadow-2xl border overflow-hidden ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-gray-700' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2"><Smartphone size={16} className="text-blue-500" /><h3 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>Connect Device</h3></div>
        <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={16} /></button>
      </div>
      <div className="p-6 flex flex-col items-center gap-4">
        <div className={`p-3 rounded-2xl ${dark ? 'bg-gray-800' : 'bg-slate-50'}`}>
          {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="QR" className="w-48 h-48 rounded-xl" /> : <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-xl" />}
        </div>
        <div className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-mono font-bold ${dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
          <Smartphone size={14} />{serverInfo?.ip}:{serverInfo?.port}
        </div>
        <div className={`text-xs text-center leading-relaxed space-y-1 ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
          <p className="font-medium">How to connect your phone:</p>
          <p>1. Same Wi-Fi network as your PC.</p>
          <p>2. Scan the QR code with your phone camera.</p>
          <p>3. Edusaku app connects automatically.</p>
        </div>
      </div>
    </div>
  </div>
);

// ── Library Modal ─────────────────────────────────────────────────────────────
const LibraryModal: React.FC<{
  dark: boolean; uploads: UploadFile[];
  isUploading: boolean; uploadProgress: number;
  onUploadClick: () => void; onDrop: (e: React.DragEvent) => void;
  onDelete: (f: string) => void; onClose: () => void;
}> = ({ dark, uploads, isUploading, uploadProgress, onUploadClick, onDrop, onDelete, onClose }) => {
  const [confirmFile, setConfirmFile] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const sub = dark ? 'text-gray-400' : 'text-slate-500';
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-3xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`} style={{ maxHeight: '85vh' }}>
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${dark ? 'border-gray-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2"><FolderOpen size={18} className="text-blue-500" /><h3 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>Document Library{uploads.length > 0 && <span className={`ml-2 text-sm font-normal ${sub}`}>({uploads.length})</span>}</h3></div>
          <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={16} /></button>
        </div>
        <div className="px-6 pt-4 pb-3 shrink-0">
          <div onClick={() => !isUploading && onUploadClick()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { setDragOver(false); onDrop(e); }}
            className={['border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all',
              dragOver ? (dark ? 'border-blue-400 bg-blue-900/30' : 'border-blue-400 bg-blue-50') : (dark ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'),
              isUploading ? 'pointer-events-none opacity-60' : ''].join(' ')}>
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Upload size={20} className="text-blue-500 animate-bounce" />
                <p className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-slate-600'}`}>Uploading… {uploadProgress}%</p>
                <div className={`w-48 rounded-full h-1.5 overflow-hidden ${dark ? 'bg-gray-700' : 'bg-slate-200'}`}><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Upload size={18} className={sub} />
                <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-slate-600'}`}>{dragOver ? 'Drop to upload' : 'Click to upload or drag & drop'}</span>
                <span className={`text-xs ${sub}`}>PDF, Images</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {uploads.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 gap-3 ${sub}`}><FileImage size={40} className="opacity-30" /><p className="text-sm">No documents yet.</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {uploads.map((file, i) => (
                <div key={i} className={`group relative border rounded-2xl overflow-hidden transition-all ${dark ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                  <a href={`/uploads/${file.name}`} target="_blank" rel="noreferrer" className="block no-underline">
                    <div className={`aspect-[4/3] flex items-center justify-center ${dark ? 'bg-gray-700/50' : 'bg-slate-50'}`}>
                      {isImage(file.name) ? <img src={`/uploads/${file.name}`} alt="" className="w-full h-full object-cover" /> : <div className={`w-12 h-14 rounded-lg flex items-center justify-center ${dark ? 'bg-gray-600' : 'bg-slate-200'}`}><span className={`text-xs font-bold ${dark ? 'text-gray-300' : 'text-slate-600'}`}>{getFileExt(file.name)}</span></div>}
                    </div>
                    <div className="p-2.5"><p className={`text-xs font-medium truncate ${dark ? 'text-gray-200' : 'text-slate-700'}`}>{getDisplayName(file.name)}</p><p className={`text-[10px] mt-0.5 ${sub}`}>{new Date(file.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</p></div>
                  </a>
                  <button onClick={e => { e.preventDefault(); setConfirmFile(file.name); }} className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm ${dark ? 'bg-gray-900/80 hover:bg-red-900/60 text-red-400' : 'bg-white/90 hover:bg-red-50 text-red-500'}`}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {confirmFile && <ConfirmDialog dark={dark} title="Delete Document" message={`"${getDisplayName(confirmFile)}" will be permanently deleted.`} onConfirm={() => { onDelete(confirmFile); setConfirmFile(null); }} onCancel={() => setConfirmFile(null)} />}
    </div>
  );
};

// ── Chat Row ──────────────────────────────────────────────────────────────────
const ChatRow: React.FC<{
  dark: boolean; session: ChatSession; isActive: boolean;
  onSelect: () => void; onDelete: () => void; onRename: (t: string) => void;
  sub: string; hoverBg: string;
}> = ({ dark, session, isActive, onSelect, onDelete, onRename, sub, hoverBg }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { const t = editValue.trim(); if (t && t !== session.title) onRename(t); setEditing(false); };
  return (
    <>
      <div className={`group relative flex items-center rounded-xl transition-all ${isActive ? (dark ? 'bg-blue-900/50' : 'bg-blue-50') : hoverBg}`}>
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 px-3 py-2">
            <MessageSquare size={13} className="shrink-0 opacity-40" />
            <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setEditValue(session.title); } }}
              onBlur={commit} className={`flex-1 text-xs bg-transparent outline-none border-b ${dark ? 'text-white border-blue-400' : 'text-slate-800 border-blue-500'}`} />
            <button onClick={commit} className="text-blue-500"><Check size={12} /></button>
          </div>
        ) : (
          <button onClick={onSelect} className="flex items-center gap-2 px-3 py-2.5 flex-1 min-w-0 text-left">
            <MessageSquare size={13} className={`shrink-0 opacity-50 ${isActive ? (dark ? 'text-blue-300' : 'text-blue-600') : ''}`} />
            <p className={`text-xs font-medium truncate flex-1 ${isActive ? (dark ? 'text-blue-300' : 'text-blue-700') : (dark ? 'text-gray-300' : 'text-slate-700')}`}>{session.title}</p>
          </button>
        )}
        {!editing && (
          <div className="relative pr-1.5" ref={menuRef}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${menuOpen ? 'opacity-100' : ''} ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-200 text-slate-500'}`}><MoreVertical size={12} /></button>
            {menuOpen && (
              <div className={`absolute right-0 top-8 z-50 w-32 rounded-2xl shadow-xl border overflow-hidden ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <button onClick={() => { setMenuOpen(false); setEditing(true); setEditValue(session.title); }} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${dark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}><Pencil size={12} /> Rename</button>
                <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${dark ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-50 text-red-600'}`}><Trash2 size={12} /> Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
      {confirmDelete && <ConfirmDialog dark={dark} title="Delete Chat" message={`"${session.title}" and all its messages will be permanently deleted.`} onConfirm={() => { setConfirmDelete(false); onDelete(); }} onCancel={() => setConfirmDelete(false)} />}
    </>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({
  dark, isOpen, onOpen, onClose,
  qrCodeDataUrl, serverInfo,
  uploads, isUploading, uploadProgress, onUploadClick, onDrop, onDeleteUpload,
  sessions, activeChatId, onNewChat, onSelectChat, onDeleteChat, onRenameChat,
}) => {
  const [showQR, setShowQR] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const railBg = dark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-slate-200';
  const panelBg = dark ? 'bg-gray-900' : 'bg-white';
  const sub = dark ? 'text-gray-500' : 'text-slate-400';
  const hoverBg = dark ? 'hover:bg-gray-800' : 'hover:bg-slate-50';
  const railBtn = (active = false) => `w-10 h-10 rounded-xl transition-all flex items-center justify-center ${active ? (dark ? 'bg-gray-700 text-white' : 'bg-slate-100 text-slate-800') : `${hoverBg} ${sub}`}`;

  const menuItem = `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${hoverBg} ${dark ? 'text-gray-300' : 'text-slate-600'}`;

  return (
    <>
      {/* Icon rail — only when closed */}
      {!isOpen && (
        <div className={`fixed top-0 left-0 z-30 w-14 flex flex-col items-center py-3 gap-1 border-r ${railBg}`} style={{ height: '100vh' }}>
          <button onClick={onOpen} className={railBtn()} title="Open sidebar"><PanelLeftOpen size={18} /></button>
          <button onClick={() => setShowQR(true)} className={railBtn()} title="Connect Device"><QrCode size={18} /></button>
          <button onClick={() => setShowLibrary(true)} className={railBtn()} title="Document Library"><Grid3X3 size={18} /></button>
          <button onClick={onNewChat} className={railBtn()} title="New Chat"><Plus size={18} /></button>
        </div>
      )}

      {/* Full panel — only when open */}
      {isOpen && (
        <aside className={`fixed top-0 left-0 z-30 w-64 flex flex-col border-r shadow-xl ${panelBg} ${dark ? 'border-gray-700/60' : 'border-slate-200'}`} style={{ height: '100vh' }}>

          {/* Header: "Edusaku" left, toggle right — NO border */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>Edusaku</span>
            <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${hoverBg} ${sub}`} title="Close sidebar">
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col px-2">

            {/* Connect Device — no border */}
            <button onClick={() => setShowQR(true)} className={menuItem}>
              <Smartphone size={14} className="text-blue-500" />Connect Device
            </button>

            {/* Search */}
            <button onClick={() => setShowSearch(true)} className={menuItem}>
              <Search size={14} className="text-blue-500" />Search
            </button>

            {/* Document Library — no border */}
            <button onClick={() => setShowLibrary(true)} className={menuItem}>
              <FolderOpen size={14} className="text-blue-500" />Document Library
              {uploads.length > 0 && <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dark ? 'bg-gray-700 text-gray-400' : 'bg-slate-100 text-slate-500'}`}>{uploads.length}</span>}
            </button>

            {/* Divider ONLY above New Chat */}
            <div className={`my-2 h-px mx-1 ${dark ? 'bg-gray-700/60' : 'bg-slate-100'}`} />

            {/* Chats section */}
            <div className="mb-1 px-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>Chats</span>
            </div>

            <button onClick={onNewChat} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-1 ${dark ? 'text-gray-300 hover:bg-gray-800 border border-gray-700' : 'text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
              <Plus size={14} />New Chat
            </button>

            <div className="space-y-0.5 flex-1">
              {sessions.length === 0
                ? <p className={`text-xs text-center py-4 ${sub}`}>No chats yet</p>
                : sessions.map(s => (
                  <ChatRow key={s.id} dark={dark} session={s} isActive={activeChatId === s.id}
                    onSelect={() => onSelectChat(s.id)} onDelete={() => onDeleteChat(s.id)}
                    onRename={t => onRenameChat(s.id, t)} sub={sub} hoverBg={hoverBg} />
                ))
              }
            </div>
          </div>
        </aside>
      )}

      {showQR && <QRPopup dark={dark} qrCodeDataUrl={qrCodeDataUrl} serverInfo={serverInfo} onClose={() => setShowQR(false)} />}
      {showLibrary && <LibraryModal dark={dark} uploads={uploads} isUploading={isUploading} uploadProgress={uploadProgress} onUploadClick={onUploadClick} onDrop={onDrop} onDelete={onDeleteUpload} onClose={() => setShowLibrary(false)} />}
      {showSearch && <SearchPopup dark={dark} uploads={uploads} sessions={sessions} onSelectChat={id => { onSelectChat(id); }} onClose={() => setShowSearch(false)} />}
    </>
  );
};

export default Sidebar;
