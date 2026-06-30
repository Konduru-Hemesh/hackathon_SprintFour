import React from 'react';

export const ShortcutHints: React.FC = () => {
  const shortcuts = [
    { keys: ['A', 'Enter'], label: 'Accept Redaction' },
    { keys: ['R', 'Backspace'], label: 'Reject Redaction' },
    { keys: ['Tab'], label: 'Next Identifier' },
    { keys: ['Shift', 'Tab'], label: 'Previous Identifier' },
    { keys: ['Space'], label: 'Toggle Focus Mode' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-sm w-full">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Keyboard Shortcuts
      </h3>
      <ul className="space-y-2.5">
        {shortcuts.map((s, idx) => (
          <li key={idx} className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{s.label}</span>
            <div className="flex gap-1">
              {s.keys.map((k, kIdx) => (
                <kbd
                  key={kIdx}
                  className="px-1.5 py-0.5 text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700 rounded shadow-sm"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
