/**
 * Zustand store — Edusaku global state
 *
 * Slices:
 *  - documents  : uploaded PDF list + active selection
 *  - chat       : per-document conversation history
 *  - ui         : lightweight UI flags (loading, etc.)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Document {
  id: string;            // UUID
  title: string;
  fileName: string;
  filePath: string;      // local FS path after copy
  sizeBytes: number;
  pageCount: number;
  chunkCount: number;    // populated after embedding
  embeddedAt: string | null;  // ISO string, null = not yet embedded
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceChunks?: string[];  // chunk IDs used for RAG context
  createdAt: string;
}

export interface ChatSession {
  documentId: string;
  messages: ChatMessage[];
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface DocumentSlice {
  documents: Document[];
  activeDocumentId: string | null;

  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  setActiveDocument: (id: string | null) => void;
  getActiveDocument: () => Document | undefined;
}

interface ChatSlice {
  sessions: Record<string, ChatSession>;  // keyed by documentId

  appendMessage: (documentId: string, message: ChatMessage) => void;
  clearSession: (documentId: string) => void;
  getSession: (documentId: string) => ChatSession | undefined;
}

interface UISlice {
  isInferring: boolean;
  isEmbedding: boolean;
  isUploadingPDF: boolean;

  setInferring: (v: boolean) => void;
  setEmbedding: (v: boolean) => void;
  setUploadingPDF: (v: boolean) => void;
}

type AppStore = DocumentSlice & ChatSlice & UISlice;

// ─── Store implementation ─────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Document slice ──────────────────────────────────────────────────────
      documents: [],
      activeDocumentId: null,

      addDocument: (doc) =>
        set((s) => ({ documents: [...s.documents, doc] })),

      removeDocument: (id) =>
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          activeDocumentId: s.activeDocumentId === id ? null : s.activeDocumentId,
        })),

      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      setActiveDocument: (id) => set({ activeDocumentId: id }),

      getActiveDocument: () => {
        const { documents, activeDocumentId } = get();
        return documents.find((d) => d.id === activeDocumentId);
      },

      // ── Chat slice ──────────────────────────────────────────────────────────
      sessions: {},

      appendMessage: (documentId, message) =>
        set((s) => {
          const existing = s.sessions[documentId];
          return {
            sessions: {
              ...s.sessions,
              [documentId]: {
                documentId,
                messages: existing ? [...existing.messages, message] : [message],
              },
            },
          };
        }),

      clearSession: (documentId) =>
        set((s) => {
          const next = { ...s.sessions };
          delete next[documentId];
          return { sessions: next };
        }),

      getSession: (documentId) => get().sessions[documentId],

      // ── UI slice ────────────────────────────────────────────────────────────
      isInferring: false,
      isEmbedding: false,
      isUploadingPDF: false,

      setInferring: (v) => set({ isInferring: v }),
      setEmbedding: (v) => set({ isEmbedding: v }),
      setUploadingPDF: (v) => set({ isUploadingPDF: v }),
    }),
    {
      name: 'edusaku-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-ephemeral slices
      partialize: (s) => ({
        documents: s.documents,
        activeDocumentId: s.activeDocumentId,
        sessions: s.sessions,
      }),
    },
  ),
);
