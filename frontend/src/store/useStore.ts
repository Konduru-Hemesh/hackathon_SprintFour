import { create } from 'zustand';
import type { Document, DocumentSummary, RedactionSpan } from '../types';
import { fetchDocuments, fetchDocumentById } from '../services/documentApi';
import { submitDecisions } from '../services/reviewApi';
import type { DecisionPayload } from '../services/reviewApi';
import { findEntityOccurrences } from '../utils/entity';

interface PropagationPrompt {
  span: RedactionSpan;
  status: 'accepted' | 'rejected';
  occurrencesCount: number;
  matchedSpans: RedactionSpan[];
  unflaggedMatches: Array<{ start: number; end: number; text: string }>;
}

interface StoreState {
  documents: DocumentSummary[];
  uploadedDocuments: Document[];
  currentDocument: Document | null;
  selectedSpanId: string | null;
  focusMode: boolean;
  isLoading: boolean;
  error: string | null;
  propagationPrompt: PropagationPrompt | null;
  currentPage: 'list' | 'review' | 'summary';
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'failed';
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;

  // Actions
  loadDocuments: () => Promise<void>;
  loadDocument: (id: string) => Promise<void>;
  selectSpan: (id: string | null) => void;
  nextSpan: () => void;
  prevSpan: () => void;
  setFocusMode: (mode: boolean) => void;
  setPropagationPrompt: (prompt: PropagationPrompt | null) => void;
  updateSpanStatus: (spanId: string, status: 'suggested' | 'accepted' | 'rejected', propagateToAll?: boolean) => Promise<void>;
  clearError: () => void;
  setPage: (page: 'list' | 'review' | 'summary') => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addUploadedDocument: (doc: Document) => void;
  addManualSpan: (text: string, start: number, end: number, type: RedactionSpan['type'], propagateToAll?: boolean) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => {
  // Helper to select the first unresolved high-risk span, or first unresolved low-risk, or first span
  const selectInitialSpan = (spans: RedactionSpan[]) => {
    if (spans.length === 0) return null;
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    const unresolvedHigh = sorted.find(s => s.status === 'suggested' && s.riskLevel === 'high');
    if (unresolvedHigh) return unresolvedHigh.id;
    const unresolvedLow = sorted.find(s => s.status === 'suggested' && s.riskLevel === 'low');
    if (unresolvedLow) return unresolvedLow.id;
    return sorted[0].id;
  };

  // Helper to auto-advance focus to the next unresolved span
  const autoAdvance = () => {
    const { currentDocument, selectedSpanId, focusMode } = get();
    if (!currentDocument || currentDocument.spans.length === 0) return;

    const sortedSpans = [...currentDocument.spans].sort((a, b) => a.start - b.start);
    const currentIndex = sortedSpans.findIndex(s => s.id === selectedSpanId);

    // Filter logic: In focusMode, we only advance to unresolved high-risk. Otherwise, any unresolved span.
    const isTarget = (s: RedactionSpan) => {
      if (focusMode) {
        return s.status === 'suggested' && s.riskLevel === 'high';
      }
      return s.status === 'suggested';
    };

    // Find the next matching span starting from the index after current
    let nextIndex = (currentIndex + 1) % sortedSpans.length;
    for (let i = 0; i < sortedSpans.length; i++) {
      const span = sortedSpans[nextIndex];
      if (isTarget(span) && span.id !== selectedSpanId) {
        set({ selectedSpanId: span.id });
        return;
      }
      nextIndex = (nextIndex + 1) % sortedSpans.length;
    }

    // If no more unresolved matching spans exist, leave it as is or deselect
  };

  return {
    documents: [],
    uploadedDocuments: [],
    currentDocument: null,
    selectedSpanId: null,
    focusMode: false,
    isLoading: false,
    error: null,
    propagationPrompt: null,
    currentPage: 'list',
    isSyncing: false,
    syncStatus: 'idle',
    toasts: [],

    loadDocuments: async () => {
      set({ isLoading: true, error: null });
      try {
        const docs = await fetchDocuments();
        const uploadedSummaries = get().uploadedDocuments.map(doc => {
          const totalSpans = doc.spans.length;
          const unreviewedSpans = doc.spans.filter(s => s.status === 'suggested').length;
          return {
            id: doc.id,
            title: doc.title,
            textLength: doc.text.length,
            totalSpans,
            unreviewedSpans,
          };
        });
        set({ documents: [...uploadedSummaries, ...docs], isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load documents list', isLoading: false });
      }
    },

    loadDocument: async (id: string) => {
      set({ isLoading: true, error: null, currentDocument: null, selectedSpanId: null, propagationPrompt: null });
      if (id.startsWith('upload_')) {
        const doc = get().uploadedDocuments.find(d => d.id === id);
        if (doc) {
          const selectedId = selectInitialSpan(doc.spans);
          set({ currentDocument: doc, selectedSpanId: selectedId, isLoading: false });
          return;
        }
      }
      try {
        const doc = await fetchDocumentById(id);
        const selectedId = selectInitialSpan(doc.spans);
        set({ currentDocument: doc, selectedSpanId: selectedId, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || `Failed to load document ${id}`, isLoading: false });
      }
    },

    selectSpan: (id: string | null) => {
      set({ selectedSpanId: id });
    },

    nextSpan: () => {
      const { currentDocument, selectedSpanId, focusMode } = get();
      if (!currentDocument || currentDocument.spans.length === 0) return;

      const sortedSpans = [...currentDocument.spans].sort((a, b) => a.start - b.start);
      if (sortedSpans.length === 0) return;

      const currentIndex = sortedSpans.findIndex(s => s.id === selectedSpanId);

      // If focus mode is active, we only cycle through unresolved high-risk spans.
      // Otherwise, we cycle through all spans.
      const matchesFilter = (s: RedactionSpan) => {
        return !focusMode || (s.status === 'suggested' && s.riskLevel === 'high');
      };

      let nextIndex = (currentIndex + 1) % sortedSpans.length;
      for (let i = 0; i < sortedSpans.length; i++) {
        if (matchesFilter(sortedSpans[nextIndex])) {
          set({ selectedSpanId: sortedSpans[nextIndex].id });
          return;
        }
        nextIndex = (nextIndex + 1) % sortedSpans.length;
      }
    },

    prevSpan: () => {
      const { currentDocument, selectedSpanId, focusMode } = get();
      if (!currentDocument || currentDocument.spans.length === 0) return;

      const sortedSpans = [...currentDocument.spans].sort((a, b) => a.start - b.start);
      if (sortedSpans.length === 0) return;

      const currentIndex = sortedSpans.findIndex(s => s.id === selectedSpanId);

      const matchesFilter = (s: RedactionSpan) => {
        return !focusMode || (s.status === 'suggested' && s.riskLevel === 'high');
      };

      let prevIndex = (currentIndex - 1 + sortedSpans.length) % sortedSpans.length;
      for (let i = 0; i < sortedSpans.length; i++) {
        if (matchesFilter(sortedSpans[prevIndex])) {
          set({ selectedSpanId: sortedSpans[prevIndex].id });
          return;
        }
        prevIndex = (prevIndex - 1 + sortedSpans.length) % sortedSpans.length;
      }
    },

    setFocusMode: (mode: boolean) => {
      set({ focusMode: mode });
      // When enabling focus mode, if the currently selected span is not an unresolved high-risk one,
      // move selection to the first unresolved high-risk span.
      if (mode && get().currentDocument) {
        const spans = get().currentDocument!.spans;
        const current = spans.find(s => s.id === get().selectedSpanId);
        if (!current || current.status !== 'suggested' || current.riskLevel !== 'high') {
          const firstHighId = selectInitialSpan(spans);
          set({ selectedSpanId: firstHighId });
        }
      }
    },

    setPropagationPrompt: (prompt: PropagationPrompt | null) => {
      set({ propagationPrompt: prompt });
    },

    updateSpanStatus: async (
      spanId: string,
      status: 'suggested' | 'accepted' | 'rejected',
      propagateToAll?: boolean
    ) => {
      const { currentDocument, setPropagationPrompt } = get();
      if (!currentDocument) return;

      const activeSpan = currentDocument.spans.find(s => s.id === spanId);
      if (!activeSpan) return;

      // Handle resetting status back to suggested
      if (status === 'suggested') {
        const backupSpans = [...currentDocument.spans];
        const decisions: DecisionPayload[] = [
          {
            id: activeSpan.id,
            status,
            start: activeSpan.start,
            end: activeSpan.end,
            text: activeSpan.text,
            type: activeSpan.type,
            confidence: activeSpan.confidence,
            riskLevel: activeSpan.riskLevel,
            entityGroupId: activeSpan.entityGroupId,
          },
        ];

        const updatedSpans = currentDocument.spans.map(span =>
          span.id === activeSpan.id ? { ...span, status } : span
        );

        set({
          currentDocument: {
            ...currentDocument,
            spans: updatedSpans,
          },
        });

        const isUploaded = currentDocument.id.startsWith('upload_');
        if (isUploaded) {
          set(state => {
            const updatedUploadedDocs = state.uploadedDocuments.map(doc =>
              doc.id === currentDocument.id ? { ...doc, spans: updatedSpans } : doc
            );
            return {
              currentDocument: {
                ...currentDocument,
                spans: updatedSpans,
              },
              uploadedDocuments: updatedUploadedDocs,
              isSyncing: false,
              syncStatus: 'saved',
            };
          });
          return;
        }

        try {
          const responseSpans = await submitDecisions(currentDocument.id, decisions);
          set({
            currentDocument: {
              ...currentDocument,
              spans: responseSpans,
            },
            isSyncing: false,
            syncStatus: 'saved',
          });
        } catch (err: any) {
          set({
            currentDocument: {
              ...currentDocument,
              spans: backupSpans,
            },
            error: err.message || 'API request failed. Rolled back decisions.',
            isSyncing: false,
            syncStatus: 'failed',
          });
          get().addToast(err.message || 'Failed to save changes. Rolled back decisions.', 'error');
        }
        return;
      }

      // Find all matches for entity linking (case-insensitive text search)
      const allMatches = findEntityOccurrences(currentDocument.text, activeSpan.text);

      // Identify other spans that match the same text (case-insensitive)
      const matchedSpans = currentDocument.spans.filter(
        s => s.id !== activeSpan.id && s.text.toLowerCase() === activeSpan.text.toLowerCase()
      );

      // Identify unflagged text occurrences (i.e. those index ranges that do not overlap with any existing spans)
      const unflaggedMatches = allMatches.filter(match => {
        return !currentDocument.spans.some(
          s => match.start < s.end && s.start < match.end
        );
      });

      const totalOthers = matchedSpans.length + unflaggedMatches.length;

      // If there are other occurrences and we haven't decided on propagation yet, open prompt
      if (totalOthers > 0 && propagateToAll === undefined) {
        setPropagationPrompt({
          span: activeSpan,
          status,
          occurrencesCount: totalOthers,
          matchedSpans,
          unflaggedMatches,
        });
        return;
      }

      // Close propagation prompt if open
      setPropagationPrompt(null);

      // Build decisions payload batch (Optimistic UI)
      const backupSpans = [...currentDocument.spans];
      const decisions: DecisionPayload[] = [
        {
          id: activeSpan.id,
          status,
          start: activeSpan.start,
          end: activeSpan.end,
          text: activeSpan.text,
          type: activeSpan.type,
          confidence: activeSpan.confidence,
          riskLevel: activeSpan.riskLevel,
          entityGroupId: activeSpan.entityGroupId,
        },
      ];

      // If propagating, add matches to the decisions batch
      if (propagateToAll) {
        // Update matched existing spans
        matchedSpans.forEach(span => {
          decisions.push({
            id: span.id,
            status,
            start: span.start,
            end: span.end,
            text: span.text,
            type: span.type,
            confidence: span.confidence,
            riskLevel: span.riskLevel,
            entityGroupId: span.entityGroupId || activeSpan.entityGroupId,
          });
        });

        // Add new spans for unflagged occurrences
        unflaggedMatches.forEach((match, idx) => {
          const newSpanId = `prop-${Date.now()}-${idx}`;
          decisions.push({
            id: newSpanId,
            status,
            start: match.start,
            end: match.end,
            text: match.text,
            type: activeSpan.type,
            confidence: activeSpan.confidence, // Propagate metadata
            riskLevel: activeSpan.riskLevel,
            entityGroupId: activeSpan.entityGroupId || `group-${activeSpan.text.toLowerCase().replace(/\s+/g, '_')}`,
          });
        });
      }

      // 1. Optimistic Update locally
      const updatedSpans = currentDocument.spans.map(span => {
        const dec = decisions.find(d => d.id === span.id);
        return dec ? { ...span, status: dec.status } : span;
      });

      // Add any newly created spans to local state
      const newSpansToAdd: RedactionSpan[] = decisions
        .filter(d => !currentDocument.spans.some(s => s.id === d.id))
        .map(d => ({
          id: d.id,
          start: d.start!,
          end: d.end!,
          text: d.text!,
          type: d.type as any,
          confidence: d.confidence!,
          riskLevel: d.riskLevel as any,
          status: d.status,
          entityGroupId: d.entityGroupId,
        }));

      const finalSpans = [...updatedSpans, ...newSpansToAdd];

      set({
        currentDocument: {
          ...currentDocument,
          spans: finalSpans,
        },
      });

      // Auto-advance to the next unresolved item
      autoAdvance();

      const isUploaded = currentDocument.id.startsWith('upload_');
      if (isUploaded) {
        set(state => {
          const updatedUploadedDocs = state.uploadedDocuments.map(doc =>
            doc.id === currentDocument.id ? { ...doc, spans: finalSpans } : doc
          );
          return {
            uploadedDocuments: updatedUploadedDocs,
            isSyncing: false,
            syncStatus: 'saved'
          };
        });
        if (propagateToAll) {
          get().addToast(`Propagated decisions: all occurrences of "${activeSpan.text}" updated.`, 'success');
        }
        return;
      }

      // 2. Submit to backend API
      set({ isSyncing: true, syncStatus: 'syncing' });
      try {
        const responseSpans = await submitDecisions(currentDocument.id, decisions);
        // Sync local state with exact backend IDs and records
        set({
          currentDocument: {
            ...currentDocument,
            spans: responseSpans,
          },
          isSyncing: false,
          syncStatus: 'saved',
        });
        if (propagateToAll) {
          get().addToast(`Propagated decisions: all occurrences of "${activeSpan.text}" updated.`, 'success');
        }
      } catch (err: any) {
        // Rollback state on error
        set({
          currentDocument: {
            ...currentDocument,
            spans: backupSpans,
          },
          error: err.message || 'API request failed. Rolled back decisions.',
          isSyncing: false,
          syncStatus: 'failed',
        });
        get().addToast(err.message || 'Failed to save changes. Rolled back decisions.', 'error');
      }
    },

    clearError: () => set({ error: null }),
    setPage: (page: 'list' | 'review' | 'summary') => set({ currentPage: page }),
    addToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
      setTimeout(() => {
        get().removeToast(id);
      }, 3000);
    },
    removeToast: (id: string) => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
    addUploadedDocument: (doc: Document) => {
      set(state => ({
        uploadedDocuments: [...state.uploadedDocuments, doc]
      }));
      get().loadDocuments(); // Refresh summaries listing
    },

    addManualSpan: async (
      text: string,
      start: number,
      end: number,
      type: RedactionSpan['type'],
      propagateToAll?: boolean
    ) => {
      const { currentDocument, setPropagationPrompt, addToast } = get();
      if (!currentDocument) return;

      const riskLevel = ['name', 'phone', 'email', 'address', 'ssn'].includes(type) ? 'high' : 'low';
      const entityGroupId = `group-${text.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const newSpanId = `span-manual-${Date.now()}`;

      const newSpan: RedactionSpan = {
        id: newSpanId,
        start,
        end,
        text,
        type,
        confidence: 1.0,
        riskLevel,
        status: 'suggested',
        entityGroupId,
        source: 'manual'
      };

      // Check if there is an overlapping span already
      const hasOverlap = currentDocument.spans.some(s => s.status !== 'rejected' && start < s.end && s.start < end);
      if (hasOverlap) {
        addToast('Cannot redact overlapping text.', 'error');
        return;
      }

      // 1. Optimistic Update locally
      const backupSpans = [...currentDocument.spans];
      const finalSpans = [...currentDocument.spans, newSpan].sort((a, b) => a.start - b.start);

      set({
        currentDocument: {
          ...currentDocument,
          spans: finalSpans
        },
        selectedSpanId: newSpanId
      });

      const isUploaded = currentDocument.id.startsWith('upload_');
      
      // Determine propagation availability
      const allMatches = findEntityOccurrences(currentDocument.text, text);
      const matchedSpans = finalSpans.filter(
        s => s.id !== newSpanId && s.text.toLowerCase() === text.toLowerCase()
      );
      const unflaggedMatches = allMatches.filter(match => {
        return !finalSpans.some(
          s => match.start < s.end && s.start < match.end
        );
      });
      const totalOthers = matchedSpans.length + unflaggedMatches.length;

      // Handle propagation choice
      if (propagateToAll === undefined && totalOthers > 0) {
        setPropagationPrompt({
          span: newSpan,
          status: 'accepted',
          occurrencesCount: totalOthers,
          matchedSpans,
          unflaggedMatches
        });
      }

      if (isUploaded) {
        set(state => {
          const updatedUploadedDocs = state.uploadedDocuments.map(doc =>
            doc.id === currentDocument.id ? { ...doc, spans: finalSpans } : doc
          );
          return {
            uploadedDocuments: updatedUploadedDocs,
            isSyncing: false,
            syncStatus: 'saved'
          };
        });
        addToast('Manual redaction added successfully.', 'success');
        
        if (propagateToAll) {
          await get().updateSpanStatus(newSpanId, 'suggested', true);
        }
        return;
      }

      // For backend documents: submit decision
      set({ isSyncing: true, syncStatus: 'syncing' });
      try {
        const decisions = [{
          id: newSpanId,
          status: 'suggested' as const,
          start,
          end,
          text,
          type,
          confidence: 1.0,
          riskLevel,
          entityGroupId,
          source: 'manual' as const
        }];
        const responseSpans = await submitDecisions(currentDocument.id, decisions);
        set({
          currentDocument: {
            ...currentDocument,
            spans: responseSpans
          },
          isSyncing: false,
          syncStatus: 'saved'
        });
        addToast('Manual redaction added successfully.', 'success');

        if (propagateToAll) {
          await get().updateSpanStatus(newSpanId, 'suggested', true);
        }
      } catch (err: any) {
        set({
          currentDocument: {
            ...currentDocument,
            spans: backupSpans
          },
          selectedSpanId: null,
          isSyncing: false,
          syncStatus: 'failed'
        });
        addToast(err.message || 'Failed to save manual redaction.', 'error');
      }
    },
  };
});
