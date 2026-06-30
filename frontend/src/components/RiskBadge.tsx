import React from 'react';
import { Shield, ShieldAlert, Check } from 'lucide-react';

interface RiskBadgeProps {
  riskLevel: 'high' | 'low';
  status: 'suggested' | 'accepted' | 'rejected';
  type: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskLevel, status, type }) => {
  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        Redacted • {type.toUpperCase()}
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-slate-900 text-slate-400 border border-slate-700/60">
        Kept • {type.toUpperCase()}
      </span>
    );
  }

  // Suggested state
  if (riskLevel === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold bg-red-950/50 text-red-400 border border-red-800/80 animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="sr-only">High Risk: </span>
        HIGH RISK • {type.toUpperCase()}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-950/30 text-blue-400 border border-blue-900/50">
      <Shield className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">Low Risk: </span>
      LOW RISK • {type.toUpperCase()}
    </span>
  );
};
