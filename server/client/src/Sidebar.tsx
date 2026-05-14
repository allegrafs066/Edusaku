import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone, Upload, FileImage, RefreshCcw, Plus,
  MessageSquare, X, MoreHorizontal, Trash2, PanelLeftClose,
  MoreVertical, Pencil, Check,
} from 'lucide-react';

interface UploadFile {
  name: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface SidebarProps {
  dark: boolean;
  isOpen: boolean;
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
  onRefreshUploads: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getDisplayName = (filename: string) => {
  const parts = filename.split('-');
  return parts.length > 2 ? parts.slice(2).join('-') : filename;
};

const isImage = (filename: string) =>
  /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);

const getFileExt = (filename: string) => {
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
  return ext.length > 4 ? 'FILE' : ext;
};

// ── All Documents Modal ───────────────────────────────────────────────────────

const AllDocsModal: React.FC<{
  dark: boolean;
  uploads: UploadFile[];
  onDelete: (filename: string) => void;
  onClose: () => void;
}> = ({ dark, uploads, onDelete, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden ${
      dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        dark ? 'border-gray-700' : 'border-slate-100'
      }`}>
        <h3 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>
          All Documents ({uploads.length})
        </h3>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-full transition-colors ${
            dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X size={16} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-96 p-4 space-y-2">
        {uploads.map((file, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
              dark ? 'border-gray-700 hover:border-gray-600' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <a
              href={`/uploads/${file.name}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 flex-1 min-w-0 no-underline"
            >
              <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
                dark ? 'bg-gray-800 border-gray-600' : 'bg-slate-100 border-slate-200'
              }`}>
                {isImage(file.name) ? (
                  <img src={`/uploads/${file.name}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className={`text-[10px] font-bold ${dark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {getFileExt(file.name)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${dark ? 'text-gray-200' : 'text-slate-700'}`}>
                  {getDisplayName(file.name)}
                </p>
                <p className={`text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {new Date(file.timestamp).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </a>
            <button
              onClick={() => onDelete(file.name)}
              className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                dark ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-50 text-red-500'
              }`}
              title="Delete document"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Chat session row with context menu ────────────────────────────────────────

const ChatRow: React.FC<{
  dark: boolean;
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  sub: string;
  hoverBg: string;
}> = ({ dark, session, isActive, onSelect, onDelete, onRename, sub, hoverBg }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className={`group relative flex items-center rounded-xl transition-all ${
      isActive
        ? (dark ? 'bg-blue-900/50' : 'bg-blue-50')
        : hoverBg
    }`}>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 px-3 py-2">
          <MessageSquare size={14} className="shrink-0 opacity-40" />
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditing(false); setEditValue(session.title); }
            }}
            onBlur={commitRename}
            className={`flex-1 text-xs font-medium bg-transparent outline-none border-b ${
              dark ? 'text-white border-blue-400' : 'text-slate-800 border-blue-500'
            }`}
          />
          <button onClick={commitRename} className="text-blue-500">
            <Check size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0 text-left"
        >
          <MessageSquare size={14} className={`shrink-0 opacity-60 ${isActive ? (dark ? 'text-blue-300' : 'text-blue-600') : ''}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${
              isActive ? (dark ? 'text-blue-300' : 'text-blue-700') : (dark ? 'text-gray-300' : 'text-slate-700')
            }`}>{session.title}</p>
            <p className={`text-[10px] mt-0.5 ${sub}`}>
              {new Date(session.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </button>
      )}

      {/* 3-dot menu button */}
      {!editing && (
        <div className="relative pr-1.5" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
              dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-200 text-slate-500'
            } ${menuOpen ? 'opacity-100' : ''}`}
          >
            <MoreVertical size={13} />
          </button>

          {menuOpen && (
            <div className={`absolute right-0 top-8 z-50 w-36 rounded-2xl shadow-xl border overflow-hidden ${
              dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => { setMenuOpen(false); setEditing(true); setEditValue(session.title); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${
                  dark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Pencil size={13} />
                Rename
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${
                  dark ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-50 text-red-600'
                }`}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({
  dark, isOpen, onClose,
  qrCodeDataUrl, serverInfo,
  uploads, isUploading, uploadProgress, onUploadClick, onDrop, onDeleteUpload,
  sessions, activeChatId, onNewChat, onSelectChat, onDeleteChat, onRenameChat,
  onRefreshUploads,
}) => {
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const topUploads = uploads.slice(0, 3);

  const base = dark ? 'bg-gray-900 border-gray-700/60 text-white' : 'bg-white border-slate-200 text-slate-900';
  const sub = dark ? 'text-gray-500' : 'text-slate-400';
  const divider = dark ? 'border-gray-700/60' : 'border-slate-100';
  const hoverBg = dark ? 'hover:bg-gray-800' : 'hover:bg-slate-50';
  const sectionLabel = dark ? 'text-gray-500' : 'text-slate-400';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-72 flex flex-col border-r shadow-xl
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${base}
      `}>

        {/* ── Section 1: Connect Device ── */}
        <div className={`px-4 pt-4 pb-4 border-b ${divider}`}>
          {/* Row: label + close button */}
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${sectionLabel}`}>
              Connect Device
            </p>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${hoverBg} ${sub}`}
              title="Close sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>

          <div className={`flex justify-center mb-3 p-2 rounded-2xl ${dark ? 'bg-gray-800' : 'bg-slate-50'}`}>
            {qrCodeDataUrl
              ? <img src={qrCodeDataUrl} alt="QR" className="w-36 h-36 rounded-lg" />
              : <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-lg" />
            }
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold ${
            dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'
          }`}>
            <Smartphone size={13} />
            {serverInfo?.ip}:{serverInfo?.port}
          </div>
          <p className={`text-[10px] mt-2 leading-relaxed ${sub}`}>
            Scan QR dari HP untuk mengirim foto dokumen ke PC ini.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Section 2: Upload Document ── */}
          <div className={`px-4 pt-4 pb-4 border-b ${divider}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sectionLabel}`}>
              Upload Document
            </p>

            <div
              onClick={() => !isUploading && onUploadClick()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { setDragOver(false); onDrop(e); }}
              className={[
                'border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all',
                dragOver
                  ? (dark ? 'border-blue-400 bg-blue-900/30' : 'border-blue-400 bg-blue-50')
                  : (dark ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-800' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'),
                isUploading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={16} className="text-blue-500 animate-bounce" />
                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-slate-600'}`}>{uploadProgress}%</p>
                  <div className={`w-full rounded-full h-1 overflow-hidden ${dark ? 'bg-gray-700' : 'bg-slate-200'}`}>
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload size={16} className={sub} />
                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-slate-600'}`}>
                    {dragOver ? 'Drop here' : 'Click or drag file'}
                  </p>
                  <p className={`text-[10px] ${sub}`}>Images & PDF</p>
                </div>
              )}
            </div>

            {/* Top 3 uploads with delete */}
            {topUploads.length > 0 && (
              <div className="mt-3 space-y-1">
                {topUploads.map((file, i) => (
                  <div key={i} className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all ${hoverBg}`}>
                    <a
                      href={`/uploads/${file.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 flex-1 min-w-0 no-underline"
                    >
                      <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                        dark ? 'bg-gray-700' : 'bg-slate-100'
                      }`}>
                        {isImage(file.name)
                          ? <img src={`/uploads/${file.name}`} alt="" className="w-full h-full object-cover" />
                          : <span className={`text-[9px] font-bold ${dark ? 'text-gray-400' : 'text-slate-500'}`}>{getFileExt(file.name)}</span>
                        }
                      </div>
                      <p className={`text-xs font-medium truncate flex-1 ${dark ? 'text-gray-200' : 'text-slate-700'}`}>
                        {getDisplayName(file.name)}
                      </p>
                    </a>
                    <button
                      onClick={() => onDeleteUpload(file.name)}
                      className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0 ${
                        dark ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {uploads.length > 3 && (
                  <button
                    onClick={() => setShowAllDocs(true)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      dark ? 'text-blue-400 hover:bg-gray-800' : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <MoreHorizontal size={14} />
                    {uploads.length - 3} more documents
                  </button>
                )}
              </div>
            )}

            {uploads.length === 0 && (
              <div className={`flex items-center justify-center gap-1.5 mt-3 py-2 text-xs ${sub}`}>
                <FileImage size={13} />
                No documents yet
              </div>
            )}

            <button
              onClick={onRefreshUploads}
              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] transition-colors ${sub} ${hoverBg}`}
            >
              <RefreshCcw size={11} />
              Refresh
            </button>
          </div>

          {/* ── Section 3: Chat Sessions ── */}
          <div className="px-4 pt-4 pb-4">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sectionLabel}`}>
              Chats
            </p>

            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors mb-3"
            >
              <Plus size={16} />
              New Chat
            </button>

            <div className="space-y-0.5">
              {sessions.length === 0 ? (
                <p className={`text-xs text-center py-4 ${sub}`}>No chat history yet</p>
              ) : (
                sessions.map((s) => (
                  <ChatRow
                    key={s.id}
                    dark={dark}
                    session={s}
                    isActive={activeChatId === s.id}
                    onSelect={() => onSelectChat(s.id)}
                    onDelete={() => onDeleteChat(s.id)}
                    onRename={(title) => onRenameChat(s.id, title)}
                    sub={sub}
                    hoverBg={hoverBg}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {showAllDocs && (
        <AllDocsModal
          dark={dark}
          uploads={uploads}
          onDelete={onDeleteUpload}
          onClose={() => setShowAllDocs(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
