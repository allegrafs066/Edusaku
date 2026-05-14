import React, { useState } from 'react';
import {
  Smartphone, Upload, FileImage, RefreshCcw, Plus,
  MessageSquare, ChevronRight, X, MoreHorizontal,
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
  sessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRefreshUploads: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  onClose: () => void;
}> = ({ dark, uploads, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
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
          <a
            key={i}
            href={`/uploads/${file.name}`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all group no-underline ${
              dark
                ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-900/20'
                : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/40'
            }`}
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
        ))}
      </div>
    </div>
  </div>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({
  dark, isOpen, onClose,
  qrCodeDataUrl, serverInfo,
  uploads, isUploading, uploadProgress, onUploadClick, onDrop,
  sessions, activeChatId, onNewChat, onSelectChat,
  onRefreshUploads,
}) => {
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const topUploads = uploads.slice(0, 3);

  const base = dark
    ? 'bg-gray-900 border-gray-700/60 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  const sub = dark ? 'text-gray-400' : 'text-slate-500';
  const divider = dark ? 'border-gray-700/60' : 'border-slate-100';
  const hoverBg = dark ? 'hover:bg-gray-800' : 'hover:bg-slate-50';
  const sectionLabel = dark ? 'text-gray-500' : 'text-slate-400';

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 w-72 flex flex-col border-r shadow-xl
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${base}
      `}>

        {/* Sidebar header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <span className="font-bold text-sm tracking-wide">Edusaku</span>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${hoverBg} ${sub}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Section 1: Connect Device ── */}
          <div className={`px-4 pt-5 pb-4 border-b ${divider}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sectionLabel}`}>
              Connect Device
            </p>
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

          {/* ── Section 2: Upload Document ── */}
          <div className={`px-4 pt-5 pb-4 border-b ${divider}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sectionLabel}`}>
              Upload Document
            </p>

            {/* Drop zone */}
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
                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-slate-600'}`}>
                    {uploadProgress}%
                  </p>
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

            {/* Top 3 uploads */}
            {topUploads.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {topUploads.map((file, i) => (
                  <a
                    key={i}
                    href={`/uploads/${file.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all group no-underline ${hoverBg}`}
                  >
                    <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                      dark ? 'bg-gray-700' : 'bg-slate-100'
                    }`}>
                      {isImage(file.name)
                        ? <img src={`/uploads/${file.name}`} alt="" className="w-full h-full object-cover" />
                        : <span className={`text-[9px] font-bold ${dark ? 'text-gray-400' : 'text-slate-500'}`}>{getFileExt(file.name)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${dark ? 'text-gray-200' : 'text-slate-700'}`}>
                        {getDisplayName(file.name)}
                      </p>
                    </div>
                  </a>
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
          <div className="px-4 pt-5 pb-4">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${sectionLabel}`}>
              Chats
            </p>

            {/* New chat button */}
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors mb-3"
            >
              <Plus size={16} />
              New Chat
            </button>

            {/* Session list */}
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className={`text-xs text-center py-4 ${sub}`}>No chat history yet</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectChat(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                      activeChatId === s.id
                        ? (dark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-50 text-blue-700')
                        : `${hoverBg} ${dark ? 'text-gray-300' : 'text-slate-700'}`
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.title}</p>
                      <p className={`text-[10px] mt-0.5 ${sub}`}>
                        {new Date(s.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short',
                        })}
                      </p>
                    </div>
                    {activeChatId === s.id && <ChevronRight size={12} className="shrink-0 opacity-50" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* All docs modal */}
      {showAllDocs && (
        <AllDocsModal
          dark={dark}
          uploads={uploads}
          onClose={() => setShowAllDocs(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
