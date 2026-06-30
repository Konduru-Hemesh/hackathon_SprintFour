import React, { useEffect, useRef } from 'react';
import type { RedactionSpan } from '../types';
import { AlertCircle, Shield, Check, Pencil } from 'lucide-react';

interface SpanHighlightProps {
  span: RedactionSpan;
  isActive: boolean;
  onClick: () => void;
  onFocus?: () => void;
}

export const SpanHighlight: React.FC<SpanHighlightProps> = ({ span, isActive, onClick, onFocus }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  // Scroll into view when active to support keyboard navigation
  useEffect(() => {
    if (isActive && spanRef.current) {
      spanRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      // Programmatically focus the span element if it's not already focused
      if (document.activeElement !== spanRef.current) {
        spanRef.current.focus();
      }
    }
  }, [isActive]);

  const getStyleClass = () => {
    let base = 'cursor-pointer transition-all duration-150 inline-flex items-center gap-1 px-1 py-0.5 rounded-sm font-mono text-sm border mx-0.5 outline-none relative ';

    if (isActive) {
      base += 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 font-bold scale-[1.02] ';
    }

    if (span.status === 'accepted') {
      return base + 'bg-emerald-950/20 text-emerald-400 border-emerald-800/60 hover:bg-emerald-950/40';
    }

    if (span.status === 'rejected') {
      return base + 'border-slate-800 border-dashed text-slate-400 bg-slate-950/30 hover:border-slate-700';
    }

    // Suggested status
    if (span.riskLevel === 'high') {
      return base + 'animate-risk-pulse text-red-300 border-red-500/50';
    }

    return base + 'bg-blue-950/10 text-blue-300 border-blue-900/40 border-dashed hover:bg-blue-950/20';
  };

  const renderContent = () => {
    if (span.status === 'accepted') {
      return (
        <span className="group/text flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
          <span className="hidden group-hover/text:inline">[ {span.text} ]</span>
          <span className="inline group-hover/text:hidden">█ REDACTED █</span>
        </span>
      );
    }

    if (span.status === 'rejected') {
      return (
        <span className="line-through decoration-slate-600/80 decoration-1 text-slate-400">
          {span.text}
        </span>
      );
    }

    // Suggested State icons
    return (
      <span className="flex items-center gap-1">
        {span.source === 'manual' ? (
          <Pencil className="w-3 h-3 text-indigo-400 shrink-0 animate-pulse" aria-hidden="true" />
        ) : span.riskLevel === 'high' ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
        )}
        <span>{span.text}</span>
        {span.source === 'manual' && (
          <span className="text-[9px] px-1 bg-indigo-950 text-indigo-300 rounded border border-indigo-800/40 uppercase font-semibold">
            Manual
          </span>
        )}
      </span>
    );
  };

  const getAriaLabel = () => {
    const riskText = span.riskLevel === 'high' ? 'High Risk' : 'Low Risk';
    const statusText = span.status === 'suggested' ? `Suggested ${riskText} Redaction` : `Resolved: ${span.status}`;
    return `${statusText} for text "${span.text}" of type ${span.type}`;
  };

  return (
    <span
      ref={spanRef}
      role="button"
      tabIndex={0}
      data-review-span="true"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={getAriaLabel()}
      aria-pressed={isActive}
      className={getStyleClass()}
    >
      {renderContent()}
    </span>
  );
};
