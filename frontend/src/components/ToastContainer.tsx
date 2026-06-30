import React from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let bgClass = 'bg-slate-900 border-slate-800 text-slate-100';
        let Icon = Info;

        if (toast.type === 'success') {
          bgClass = 'bg-emerald-950/95 border-emerald-800/80 text-emerald-300';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bgClass = 'bg-red-950/95 border-red-850/80 text-red-300';
          Icon = XCircle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bgClass}`}
            role="alert"
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-sm hover:bg-slate-800/40 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
