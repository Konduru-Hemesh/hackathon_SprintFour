import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { SpanHighlight } from '../components/SpanHighlight';
import { RiskBadge } from '../components/RiskBadge';
import { ShortcutHints } from '../components/ShortcutHints';
import { getExplanation } from '../utils/risk';
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Eye, 
  EyeOff, 
  ListRestart,
  Sparkles,
  ShieldCheck,
  Pencil
} from 'lucide-react';
import type { RedactionSpan } from '../types';

export const ReviewScreen: React.FC = () => {
  const {
    currentDocument,
    selectedSpanId,
    focusMode,
    error,
    propagationPrompt,
    selectSpan,
    nextSpan,
    prevSpan,
    setFocusMode,
    updateSpanStatus,
    setPage,
    clearError,
    syncStatus,
    addToast,
    addManualSpan
  } = useStore();

  const [announcement, setAnnouncement] = useState('');
  
  // Selection and Modal State for Manual Redaction
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    x: number;
    y: number;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<RedactionSpan['type']>('name');

  // Compute character offset from text node selection
  const getCharOffsetFromNode = (node: Node, offset: number): number => {
    let element: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    while (element && !element.hasAttribute('data-start')) {
      element = element.parentElement;
    }
    if (element) {
      const dataStart = parseInt(element.getAttribute('data-start') || '0', 10);
      let offsetInParent = 0;
      if (node.nodeType === Node.TEXT_NODE) {
        let sibling = element.firstChild;
        while (sibling && sibling !== node) {
          offsetInParent += sibling.textContent?.length || 0;
          sibling = sibling.nextSibling;
        }
        offsetInParent += offset;
      }
      return dataStart + offsetInParent;
    }
    return -1;
  };

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !currentDocument) {
      setSelection(null);
      return;
    }

    const startOffset = getCharOffsetFromNode(sel.anchorNode!, sel.anchorOffset);
    const endOffset = getCharOffsetFromNode(sel.focusNode!, sel.focusOffset);

    if (startOffset !== -1 && endOffset !== -1) {
      const start = Math.min(startOffset, endOffset);
      const end = Math.max(startOffset, endOffset);
      const text = currentDocument.text.slice(start, end);
      
      if (!text.trim()) {
        setSelection(null);
        return;
      }

      // Check if there is an overlapping span already
      const hasOverlap = currentDocument.spans.some(s => s.status !== 'rejected' && start < s.end && s.start < end);
      if (hasOverlap) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelection({
        text,
        start,
        end,
        x: rect.left + window.scrollX + (rect.width / 2),
        y: rect.top + window.scrollY - 40
      });
    } else {
      setSelection(null);
    }
  };

  // Listen to document-wide mousedown to dismiss selection toolbar when clicking out
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.context-toolbar') || (e.target as HTMLElement).closest('.redact-modal')) {
        return;
      }
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setSelection(null);
        }
      }, 0);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  const handleUpdateSpanStatus = useCallback(async (
    spanId: string,
    status: 'suggested' | 'accepted' | 'rejected',
    propagateToAll?: boolean
  ) => {
    const targetSpan = currentDocument?.spans.find(s => s.id === spanId);
    if (!targetSpan) return;

    await updateSpanStatus(spanId, status, propagateToAll);

    // Formulate announcement message
    const spanText = targetSpan.text;
    const spanType = targetSpan.type.toUpperCase();
    let msg = '';

    if (propagateToAll) {
      msg = `Propagated decision: all occurrences of "${spanText}" have been ${status === 'accepted' ? 'redacted' : 'kept'}.`;
    } else {
      msg = `${spanType} "${spanText}" has been ${status === 'accepted' ? 'redacted' : 'kept'}.`;
    }

    if (currentDocument) {
      const updatedSpans = currentDocument.spans.map(s => {
        if (s.id === spanId) return { ...s, status };
        if (propagateToAll && s.entityGroupId === targetSpan.entityGroupId) return { ...s, status };
        return s;
      });
      const remainingHighRisk = updatedSpans.filter(s => s.status === 'suggested' && s.riskLevel === 'high').length;
      msg += ` ${remainingHighRisk} high-risk suggestions remaining.`;
    }

    setAnnouncement(msg);
  }, [currentDocument, updateSpanStatus]);

  // 1. Derived Review Metrics
  const metrics = useMemo(() => {
    if (!currentDocument) return { highRiskUnresolved: 0, lowRiskUnresolved: 0, accepted: 0, rejected: 0, total: 0 };
    
    let highRiskUnresolved = 0;
    let lowRiskUnresolved = 0;
    let accepted = 0;
    let rejected = 0;

    currentDocument.spans.forEach(s => {
      if (s.status === 'accepted') accepted++;
      else if (s.status === 'rejected') rejected++;
      else {
        if (s.riskLevel === 'high') highRiskUnresolved++;
        else lowRiskUnresolved++;
      }
    });

    return {
      highRiskUnresolved,
      lowRiskUnresolved,
      accepted,
      rejected,
      total: currentDocument.spans.length
    };
  }, [currentDocument]);

  const activeSpan = useMemo(() => {
    if (!currentDocument || !selectedSpanId) return null;
    return currentDocument.spans.find(s => s.id === selectedSpanId) || null;
  }, [currentDocument, selectedSpanId]);

  // List of unresolved high-risk items for quick jump navigation
  const unresolvedHighRiskSpans = useMemo(() => {
    if (!currentDocument) return [];
    return currentDocument.spans
      .filter(s => s.status === 'suggested' && s.riskLevel === 'high')
      .sort((a, b) => a.start - b.start);
  }, [currentDocument]);

  // 2. Keyboard Navigation Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isReviewElement = document.activeElement && (
        document.activeElement.getAttribute('data-review-span') === 'true' ||
        document.activeElement.getAttribute('data-review-container') === 'true' ||
        document.activeElement === document.body
      );

      if (!isReviewElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Case A: Propagation Prompt is active
      if (propagationPrompt) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleUpdateSpanStatus(propagationPrompt.span.id, propagationPrompt.status, true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleUpdateSpanStatus(propagationPrompt.span.id, propagationPrompt.status, false);
        }
        return;
      }

      // Case B: Manual redaction M keypress
      if (key === 'm' && selection && !showModal) {
        e.preventDefault();
        setShowModal(true);
        return;
      }

      // Case C: Regular Review Screen Keys
      if (key === 'a' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedSpanId) {
          handleUpdateSpanStatus(selectedSpanId, 'accepted');
        }
      } else if (key === 'r' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedSpanId) {
          handleUpdateSpanStatus(selectedSpanId, 'rejected');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextSpan();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSpan();
      } else if (e.key === ' ') {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSpanId, focusMode, propagationPrompt, handleUpdateSpanStatus, nextSpan, prevSpan, setFocusMode, currentDocument, selection, showModal]);

  // 3. Inline Rendering Text Chunks
  const renderedDocumentText = useMemo(() => {
    if (!currentDocument) return null;
    const text = currentDocument.text;
    const spans = currentDocument.spans;

    if (text.length === 0) {
      return (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-lg text-slate-500">
          <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm">Empty Document State. No text content to display.</p>
        </div>
      );
    }

    if (spans.length === 0) {
      return (
        <p 
          data-start={0}
          data-end={text.length}
          className="text-slate-300 leading-relaxed text-justify whitespace-pre-wrap"
        >
          {text}
        </p>
      );
    }

    // Sort spans to chunk text chronologically
    const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    sortedSpans.forEach((span, index) => {
      // Plain text preceding the span
      if (span.start > currentIndex) {
        const chunk = text.slice(currentIndex, span.start);
        elements.push(
          <span 
            key={`txt-${currentIndex}`} 
            data-start={currentIndex}
            data-end={span.start}
            className={`transition-opacity duration-200 leading-relaxed whitespace-pre-wrap ${
              focusMode ? 'opacity-30' : 'opacity-100'
            }`}
          >
            {chunk}
          </span>
        );
      }

      // Span highlighting
      const isSelected = selectedSpanId === span.id;
      const isHighRiskUnresolved = span.status === 'suggested' && span.riskLevel === 'high';
      
      // Determine focus mode opacity adjustment
      let opacityClass = 'opacity-100';
      if (focusMode && !isSelected && !isHighRiskUnresolved) {
        opacityClass = 'opacity-30';
      }

      elements.push(
        <span 
          key={`span-${span.id}-${index}`} 
          data-start={span.start}
          data-end={span.end}
          className={`transition-opacity duration-200 ${opacityClass}`}
        >
          <SpanHighlight
            span={span}
            isActive={isSelected}
            onClick={() => selectSpan(span.id)}
            onFocus={() => selectSpan(span.id)}
          />
        </span>
      );

      currentIndex = span.end;
    });

    // Remainder text
    if (currentIndex < text.length) {
      const chunk = text.slice(currentIndex);
      elements.push(
        <span 
          key={`txt-${currentIndex}`} 
          data-start={currentIndex}
          data-end={text.length}
          className={`transition-opacity duration-200 leading-relaxed whitespace-pre-wrap ${
            focusMode ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {chunk}
        </span>
      );
    }

    return <div className="leading-8 text-base text-slate-300 whitespace-pre-wrap">{elements}</div>;
  }, [currentDocument, selectedSpanId, focusMode, selectSpan]);

  if (!currentDocument) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('list')}
            className="p-1.5 rounded-sm hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Back to document list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <h2 className="font-semibold text-sm text-slate-200 max-w-xs md:max-w-md truncate">
            {currentDocument.title}
          </h2>
          {/* Sync Status Indicator */}
          <div className="flex items-center gap-1.5 ml-2.5 text-[11px] select-none" aria-live="polite">
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Syncing...
              </span>
            )}
            {syncStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                ✓ Changes Saved
              </span>
            )}
            {syncStatus === 'failed' && (
              <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                ✗ Save Failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              focusMode
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/80 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {focusMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Focus Mode (Space)
          </button>

          <button
            onClick={() => {
              setPage('summary');
              addToast("Review completed successfully!", "info");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-semibold shadow-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Finish Review
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Review Surface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-slate-900">
        
        {/* Document Panel (Left Column) */}
        <main className="lg:col-span-8 bg-slate-950 p-8 overflow-y-auto max-h-[calc(100vh-69px)] flex flex-col justify-between">
          <div>
            {error && (
              <div className="mb-6 p-3 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-sm flex items-center justify-between">
                <span>{error}</span>
                <button onClick={clearError} className="text-red-400 hover:text-red-200 underline cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}
            
            {/* Document Content */}
            <div 
              data-review-container="true"
              tabIndex={0}
              aria-label="Document review workspace"
              onMouseUp={handleTextSelection}
              className="p-8 bg-slate-900/20 border border-slate-900/60 rounded-lg min-h-[400px] focus:outline-none focus:ring-1 focus:ring-slate-800 select-text"
            >
              {renderedDocumentText}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-900 flex justify-between text-xs text-slate-500">
            <span>Select text directly with mouse to manually redact. Arrow keys to navigate. Enter to accept, Backspace to reject.</span>
            <span>Total identifiers: {metrics.total}</span>
          </div>
        </main>

        {/* Sidebar Controls & Meta (Right Column) */}
        <aside className="lg:col-span-4 bg-slate-950 p-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-69px)] border-l border-slate-900">
          
          {/* 1. Entity linking prompt (PAUSE STATE) */}
          {propagationPrompt && (
            <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-700/60 shadow-lg animate-fadeIn text-slate-200">
              <Sparkles className="w-5 h-5 text-indigo-400 mb-2" />
              <h4 className="font-semibold text-sm text-indigo-200">
                Propagate Redaction Decision?
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                We found <strong className="text-white">{propagationPrompt.occurrencesCount}</strong> other occurrences of 
                <strong className="bg-slate-900 px-1 py-0.5 rounded mx-1 text-white">"{propagationPrompt.span.text}"</strong> (case-insensitive) in the document.
              </p>
              
              <div className="flex gap-2.5 mt-4">
                <button
                  onClick={() => handleUpdateSpanStatus(propagationPrompt.span.id, propagationPrompt.status, true)}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-semibold cursor-pointer transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500"
                >
                  [Enter] Apply to All
                </button>
                <button
                  onClick={() => handleUpdateSpanStatus(propagationPrompt.span.id, propagationPrompt.status, false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-sm text-xs font-medium cursor-pointer transition-colors"
                >
                  [Esc] Keep Single
                </button>
              </div>
            </div>
          )}

          {/* 2. Active Identifier Detail Panel */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Selected Identifier
            </h3>

            {currentDocument && currentDocument.spans.length === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-5 text-emerald-300">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  No sensitive information detected
                </div>
                <p className="text-[11px] text-emerald-400/80 mb-4 leading-relaxed">
                  This document appears to contain no personally identifiable information.
                </p>
              </div>
            ) : activeSpan ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400 font-mono">Original Text</span>
                      {activeSpan.source === 'manual' && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 font-semibold border border-indigo-900/60 uppercase tracking-wider">
                          <Pencil className="w-2.5 h-2.5" />
                          Manual
                        </span>
                      )}
                    </div>
                    <RiskBadge riskLevel={activeSpan.riskLevel} status={activeSpan.status} type={activeSpan.type} />
                  </div>
                  <p className="text-lg font-mono font-bold text-white mt-1 break-all bg-slate-950 p-2 rounded border border-slate-900">
                    {activeSpan.text}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Confidence</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {(activeSpan.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Entity Group</span>
                    <span className="text-sm font-mono text-slate-400 truncate block text-slate-300">
                      {activeSpan.entityGroupId || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-3">
                  <span className="text-xs text-slate-500 block">
                    {activeSpan.source === 'manual' ? 'Manual Redaction Note' : 'AI Explanation'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {activeSpan.source === 'manual' 
                      ? 'Manually added by reviewer.' 
                      : getExplanation(activeSpan.type)}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                {activeSpan.status === 'suggested' && (
                  <div className="flex gap-2.5 border-t border-slate-900 pt-4">
                    <button
                      onClick={() => handleUpdateSpanStatus(activeSpan.id, 'accepted')}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm text-xs font-semibold cursor-pointer transition-colors focus:ring-2 focus:ring-emerald-500"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept [A]
                    </button>
                    <button
                      onClick={() => handleUpdateSpanStatus(activeSpan.id, 'rejected')}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-800/40 rounded-sm text-xs font-semibold cursor-pointer transition-colors focus:ring-2 focus:ring-red-500"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject [R]
                    </button>
                  </div>
                )}

                {(activeSpan.status === 'accepted' || activeSpan.status === 'rejected') && (
                  <div className="border-t border-slate-900 pt-4 text-center">
                    <button
                      onClick={() => handleUpdateSpanStatus(activeSpan.id, 'suggested')}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      <ListRestart className="w-3 h-3" />
                      Revert status to suggested
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-slate-850 rounded-lg text-slate-500 text-xs">
                <p className="font-semibold text-slate-300 mb-1">No identifier selected</p>
                <p className="leading-relaxed">Click a highlighted span or press Tab to navigate between detected identifiers.</p>
              </div>
            )}
          </div>

          {/* 3. Review Progress metrics */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Review Progress
            </h3>
            
            {metrics.total === 0 ? (
              <div className="bg-emerald-950/10 border border-emerald-900/40 rounded p-4 text-center text-emerald-300">
                <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wide">Ready for Export</span>
                <p className="text-[10px] text-emerald-400/80 mt-1 leading-relaxed">
                  This document has zero PII suggestions and is fully approved for redaction-free distribution.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High-Risk Unresolved
                    </span>
                    <span className={`font-bold ${metrics.highRiskUnresolved > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {metrics.highRiskUnresolved}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Low-Risk Unresolved
                    </span>
                    <span className="font-semibold text-slate-300">{metrics.lowRiskUnresolved}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Accepted / Redacted
                    </span>
                    <span className="font-semibold text-emerald-400">{metrics.accepted}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Rejected / Kept
                    </span>
                    <span className="font-semibold text-slate-400">{metrics.rejected}</span>
                  </div>
                </div>

                {/* Export Safety Warning in metrics */}
                {metrics.highRiskUnresolved > 0 && (
                  <div className="mt-4 p-2.5 rounded-sm bg-red-950/20 border border-red-900/40 text-[11px] text-red-300/90 leading-relaxed flex gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>
                      <strong>Safety Gate Active:</strong> Export remains blocked while unresolved High-Risk items exist.
                    </span>
                  </div>
                )}

                {metrics.highRiskUnresolved === 0 && metrics.total > 0 && (
                  <div className="mt-4 p-2.5 rounded-sm bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-300/90 leading-relaxed flex gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>
                      All high-risk items cleared! Ready to proceed.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Unresolved High-Risk Jump List (Guiding user attention) */}
          {unresolvedHighRiskSpans.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-5">
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2.5">
                Unresolved High-Risk Spans ({unresolvedHighRiskSpans.length})
              </h3>
              <div className="max-h-[150px] overflow-y-auto divide-y divide-slate-900">
                {unresolvedHighRiskSpans.map(span => (
                  <button
                    key={span.id}
                    onClick={() => selectSpan(span.id)}
                    className="w-full text-left py-2 hover:bg-slate-900/80 transition-colors flex items-center justify-between text-xs cursor-pointer focus:outline-none"
                  >
                    <span className="font-mono text-slate-200 truncate pr-2">
                      "{span.text}"
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 uppercase tracking-wider shrink-0">
                      {span.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Shortcuts Overlay */}
          <ShortcutHints />

        </aside>

      </div>

      {/* Contextual Floating Selection Toolbar */}
      {selection && !showModal && (
        <div 
          className="context-toolbar fixed bg-slate-950/95 border border-slate-800 shadow-2xl rounded-lg px-4 py-2 flex items-center gap-3 z-40 transform -translate-x-1/2 transition-all animate-fadeIn"
          style={{ left: `${selection.x}px`, top: `${selection.y - 12}px` }}
        >
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer transition-colors"
          >
            ➕ Create Redaction
          </button>
          <div className="w-px h-3 bg-slate-800" />
          <button
            onClick={() => {
              window.getSelection()?.removeAllRanges();
              setSelection(null);
            }}
            className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Create Manual Redaction Modal */}
      {showModal && selection && (
        <div className="redact-modal fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl animate-scaleUp">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              ➕ Create Manual Redaction
            </h3>
            <p className="text-xs text-slate-450 mb-4">
              Select the entity type to apply redaction for text: 
              <span className="block font-mono bg-slate-950 p-2 rounded border border-slate-850 mt-1.5 text-white truncate text-xs">
                "{selection.text}"
              </span>
            </p>

            <div className="space-y-2 mb-6">
              {[
                { label: 'Person Name', value: 'name' },
                { label: 'Email Address', value: 'email' },
                { label: 'Phone Number', value: 'phone' },
                { label: 'Address', value: 'address' },
                { label: 'SSN / Government ID', value: 'ssn' },
                { label: 'Other', value: 'other' }
              ].map(opt => (
                <label 
                  key={opt.value} 
                  className="flex items-center gap-3 px-3 py-2 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="entity-type"
                    value={opt.value}
                    checked={selectedType === opt.value}
                    onChange={() => setSelectedType(opt.value as any)}
                    className="accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-350">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  window.getSelection()?.removeAllRanges();
                  setSelection(null);
                }}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg text-xs font-semibold text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowModal(false);
                  await addManualSpan(selection.text, selection.start, selection.end, selectedType);
                  window.getSelection()?.removeAllRanges();
                  setSelection(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-950/30"
              >
                Create Redaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
};
