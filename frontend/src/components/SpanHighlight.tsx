import React, { useEffect, useRef } from 'react';
import type { RedactionSpan } from '../types';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Lock, 
  CreditCard, 
  Globe, 
  Landmark, 
  Calendar, 
  Shield, 
  ShieldAlert,
  Pencil, 
  Check
} from 'lucide-react';

interface SpanHighlightProps {
  span: RedactionSpan;
  isActive: boolean;
  onClick: () => void;
  onFocus?: () => void;
}

const typeStyles: Record<string, { bg: string; border: string; text: string; shadow: string; icon: any }> = {
  name: {
    bg: 'bg-rose-500/10 dark:bg-rose-400/15',
    border: 'border-rose-400/50 dark:border-rose-400/40',
    text: 'text-rose-700 dark:text-rose-300',
    shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.45)]',
    icon: User,
  },
  email: {
    bg: 'bg-purple-500/10 dark:bg-purple-400/15',
    border: 'border-purple-400/50 dark:border-purple-400/40',
    text: 'text-purple-700 dark:text-purple-300',
    shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.45)]',
    icon: Mail,
  },
  phone: {
    bg: 'bg-blue-500/10 dark:bg-blue-400/15',
    border: 'border-blue-400/50 dark:border-blue-400/40',
    text: 'text-blue-700 dark:text-blue-300',
    shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.45)]',
    icon: Phone,
  },
  address: {
    bg: 'bg-orange-500/10 dark:bg-orange-400/15',
    border: 'border-orange-400/50 dark:border-orange-400/40',
    text: 'text-orange-700 dark:text-orange-300',
    shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.45)]',
    icon: MapPin,
  },
  ssn: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    border: 'border-red-500/50 dark:border-red-400/40',
    text: 'text-red-700 dark:text-red-300',
    shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.45)]',
    icon: Lock,
  },
  card: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/50 dark:border-rose-400/40',
    text: 'text-rose-700 dark:text-rose-300',
    shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.45)]',
    icon: CreditCard,
  },
  credit_card: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/50 dark:border-rose-400/40',
    text: 'text-rose-700 dark:text-rose-300',
    shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.45)]',
    icon: CreditCard,
  },
  passport: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-400/15',
    border: 'border-indigo-400/50 dark:border-indigo-400/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.45)]',
    icon: Globe,
  },
  bank: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/15',
    border: 'border-emerald-400/50 dark:border-emerald-400/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.45)]',
    icon: Landmark,
  },
  date: {
    bg: 'bg-teal-500/10 dark:bg-teal-400/15',
    border: 'border-teal-400/50 dark:border-teal-400/40',
    text: 'text-teal-700 dark:text-teal-300',
    shadow: 'shadow-[0_0_15px_rgba(20,184,166,0.45)]',
    icon: Calendar,
  },
  other: {
    bg: 'bg-slate-500/10 dark:bg-slate-400/15',
    border: 'border-slate-400/50 dark:border-slate-400/40',
    text: 'text-slate-700 dark:text-slate-300',
    shadow: 'shadow-[0_0_15px_rgba(100,116,139,0.45)]',
    icon: Shield,
  }
};

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

  const isManual = span.source === 'manual';

  const getStyleConfig = () => {
    if (span.status === 'rejected') {
      return {
        bg: 'bg-transparent',
        border: 'border-transparent',
        text: 'text-slate-300 dark:text-slate-300',
        shadow: 'shadow-none',
        icon: Shield
      };
    }

    if (span.status === 'accepted') {
      return {
        bg: 'bg-emerald-950/90 dark:bg-emerald-950/90',
        border: 'border-emerald-500/70 dark:border-emerald-400/60',
        text: 'text-transparent',
        shadow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_16px_rgba(16,185,129,0.22)]',
        icon: Check
      };
    }

    if (isManual) {
      return {
        bg: 'bg-cyan-500/10 dark:bg-cyan-400/15',
        border: 'border-cyan-400/70 dark:border-cyan-300/50 border-dashed',
        text: 'text-cyan-900 dark:text-cyan-100',
        shadow: 'shadow-[0_0_12px_rgba(6,182,212,0.18)]',
        icon: Pencil
      };
    }

    return typeStyles[span.type] || typeStyles.other;
  };

  const config = getStyleConfig();

  const getStyleClass = () => {
    let base = 'cursor-pointer transition-all duration-200 ease-out inline-flex items-center gap-1 px-2 py-0.75 rounded-md font-mono text-xs border mx-0.5 outline-none relative align-baseline max-w-full whitespace-pre-wrap ';

    let result = `${base} ${config.bg} ${config.text} ${config.border} `;

    // High risk suggested items have a pulse animation
    if (span.status === 'suggested' && span.riskLevel === 'high' && !isManual) {
      result += 'animate-risk-pulse ';
    }

    // Active/Focused Glow
    if (isActive) {
      result += `ring-2 ring-offset-2 ring-offset-bg-app font-bold scale-[1.03] ${config.shadow} `;
    }

    if (span.status === 'suggested' && !isManual) {
      result += 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/60 dark:border-amber-300/50 ';
      if (span.riskLevel === 'high') {
        result += 'shadow-[0_0_12px_rgba(245,158,11,0.15)] ';
      }
    }

    return result;
  };

  const renderContent = () => {
    if (span.status === 'accepted') {
      return (
        <span className="group/text relative inline-block align-baseline animate-fadeIn whitespace-pre-wrap">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 inset-y-[0.08em] rounded-md bg-slate-950 border border-emerald-500/35 transition-opacity duration-200 group-hover/text:opacity-30"
          />
          <span className="relative z-10 inline-block text-transparent group-hover/text:text-slate-50 transition-colors duration-200 whitespace-pre-wrap">
            {span.text}
          </span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5">
        {span.status === 'suggested' && span.riskLevel === 'high' && !isManual && (
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        {span.status === 'suggested' && span.riskLevel === 'low' && !isManual && (
          <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        {isManual && <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
        <span>{span.text}</span>
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
