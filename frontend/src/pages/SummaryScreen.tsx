import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  ArrowLeft, 
  CheckCircle, 
  Download, 
  AlertTriangle, 
  ClipboardCheck,
  Globe,
  Home,
  Upload,
  FileText
} from 'lucide-react';

export const SummaryScreen: React.FC = () => {
  const { currentDocument, setPage, selectSpan, addToast } = useStore();
  const [exportSuccess, setExportSuccess] = useState(false);

  const maskSpanText = (spanText: string) => {
    return spanText
      .split('')
      .map(char => (char === ' ' || char === '\t' || char === '\n' ? char : '█'))
      .join('');
  };

  // 1. Calculate checklist items
  const stats = useMemo(() => {
    if (!currentDocument) {
      return {
        totalHigh: 0,
        unresolvedHigh: 0,
        isHighResolved: true,
        totalLow: 0,
        unresolvedLow: 0,
        isLowResolved: true,
        acceptedCount: 0,
        rejectedCount: 0,
        unresolvedSpans: []
      };
    }

    let totalHigh = 0;
    let unresolvedHigh = 0;
    let totalLow = 0;
    let unresolvedLow = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    currentDocument.spans.forEach(s => {
      if (s.riskLevel === 'high') {
        totalHigh++;
        if (s.status === 'suggested') unresolvedHigh++;
      } else {
        totalLow++;
        if (s.status === 'suggested') unresolvedLow++;
      }

      if (s.status === 'accepted') acceptedCount++;
      if (s.status === 'rejected') rejectedCount++;
    });

    const isHighResolved = unresolvedHigh === 0;
    const isLowResolved = unresolvedLow === 0;

    return {
      totalHigh,
      unresolvedHigh,
      isHighResolved,
      totalLow,
      unresolvedLow,
      isLowResolved,
      acceptedCount,
      rejectedCount,
      unresolvedSpans: currentDocument.spans.filter(s => s.status === 'suggested')
    };
  }, [currentDocument]);

  // 2. Generate Redacted Text Output
  const redactedText = useMemo(() => {
    if (!currentDocument) return '';
    const text = currentDocument.originalText ?? currentDocument.text;
    const spans = currentDocument.spans;
    if (spans.length === 0) return text;

    // Filter only accepted redactions for replacement, sorted from end to start to avoid shifting indices
    const acceptedSpans = spans
      .filter(s => s.status === 'accepted')
      .sort((a, b) => b.start - a.start);

    let output = text;
    acceptedSpans.forEach(span => {
      // Preserve spaces and punctuation layout while masking the visible characters.
      const replacement = maskSpanText(text.slice(span.start, span.end));
      output = output.slice(0, span.start) + replacement + output.slice(span.end);
    });

    return output;
  }, [currentDocument]);

  if (!currentDocument) return null;

  // 3. Export trigger logic
  const handleExport = () => {
    if (stats.unresolvedHigh > 0) return; // Safety gate

    // Trigger downloads
    // A. Redacted Text File
    const textBlob = new Blob([redactedText], { type: 'text/plain;charset=utf-8;' });
    const textUrl = URL.createObjectURL(textBlob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.setAttribute('download', `redacted_${currentDocument.id}.txt`);
    document.body.appendChild(textLink);
    textLink.click();
    document.body.removeChild(textLink);

    // B. Audit Log File (JSON metadata)
    const auditData = {
      documentId: currentDocument.id,
      title: currentDocument.title,
      decisions: currentDocument.spans.map(s => ({
        id: s.id,
        text: s.text,
        type: s.type,
        status: s.status,
        riskLevel: s.riskLevel,
        confidence: s.confidence,
        source: s.source || 'ai'
      })),
      exportedAt: new Date().toISOString()
    };
    const jsonBlob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.setAttribute('download', `audit_log_${currentDocument.id}.json`);
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);

    setExportSuccess(true);
    addToast("Document and audit log exported successfully!", "success");
  };

  const handleJumpToSpan = (spanId: string) => {
    selectSpan(spanId);
    setPage('review');
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      
      {/* Top Header Row with Back link */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setPage('review')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500 rounded-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to review workspace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Checklist & Actions */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Enterprise Completion Card */}
          <div className={`bg-slate-900 border ${
            stats.unresolvedHigh === 0 
              ? 'border-emerald-900/60 bg-gradient-to-br from-slate-900 to-emerald-950/10' 
              : 'border-red-900/60 bg-gradient-to-br from-slate-900 to-red-950/10'
          } rounded-lg p-6 relative overflow-hidden shadow-lg`}>
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${
              stats.unresolvedHigh === 0 ? 'bg-emerald-500/5' : 'bg-red-500/5'
            } rounded-full blur-2xl pointer-events-none`} />
            
            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
              <div className={`w-8 h-8 rounded-full ${
                stats.unresolvedHigh === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              } flex items-center justify-center shrink-0`}>
                {stats.unresolvedHigh === 0 ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  {stats.unresolvedHigh === 0 ? 'Review Completed Successfully' : 'Review Incomplete'}
                </h2>
                <p className={`text-[10px] ${
                  stats.unresolvedHigh === 0 ? 'text-emerald-400' : 'text-red-400'
                } font-semibold tracking-wider uppercase mt-0.5`}>
                  {stats.unresolvedHigh === 0 ? 'Ready for Secure Export' : 'Safety Gate Active'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px]">Document:</span>
                <p className="font-semibold text-slate-200 truncate" title={currentDocument.title}>{currentDocument.title}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px]">Review Status:</span>
                {stats.unresolvedHigh === 0 ? (
                  <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                    PASSED
                  </p>
                ) : (
                  <p className="font-semibold text-red-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse" />
                    BLOCKED
                  </p>
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px]">Sensitive Entities Confirmed:</span>
                <p className="font-bold text-slate-200 text-sm">{stats.acceptedCount}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px]">False Positives Rejected:</span>
                <p className="font-bold text-slate-200 text-sm">{stats.rejectedCount}</p>
              </div>
            </div>
          </div>

          {/* Detailed Checklist Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-indigo-400" />
              Quality Checklist
            </h3>

            <div className="space-y-4">
              
              {/* Checklist 1: High risk */}
              <div className="flex gap-3">
                {stats.isHighResolved ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">High-Risk Suggestions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stats.isHighResolved
                      ? `All ${stats.totalHigh} high-risk items reviewed.`
                      : `${stats.unresolvedHigh} of ${stats.totalHigh} items still require decision.`
                    }
                  </p>
                </div>
              </div>

              {/* Checklist 2: Low risk */}
              <div className="flex gap-3">
                {stats.isLowResolved ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Low-Risk Suggestions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stats.isLowResolved
                      ? `All ${stats.totalLow} low-risk items reviewed.`
                      : `${stats.unresolvedLow} of ${stats.totalLow} low-risk suggestions unreviewed (optional).`
                    }
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Unresolved items jump list (Pre-export safety gate) */}
          {stats.unresolvedHigh > 0 && (
            <div className="bg-red-950/20 border border-red-900/60 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Unresolved High-Risk Items Remaining
              </h3>
              <p className="text-xs text-red-300/80 mb-3 leading-relaxed">
                The safety gate blocks document export while any high-risk identifier remains unresolved. Select an item below to resolve it:
              </p>
              <div className="max-h-[180px] overflow-y-auto divide-y divide-red-950/40">
                {currentDocument.spans
                  .filter(s => s.status === 'suggested' && s.riskLevel === 'high')
                  .map(span => (
                    <button
                      key={span.id}
                      onClick={() => handleJumpToSpan(span.id)}
                      className="w-full text-left py-2 px-1 hover:bg-slate-900/40 transition-colors flex items-center justify-between text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 rounded-sm"
                    >
                      <span className="font-mono text-slate-200 truncate max-w-[200px]">
                        "{span.text}"
                      </span>
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">
                        Jump to resolve
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Export Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={stats.unresolvedHigh > 0}
              className={`w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                stats.unresolvedHigh > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950/30'
              }`}
            >
              <Download className="w-4 h-4" />
              Download Redacted Files & Logs
            </button>
            {stats.unresolvedHigh > 0 && (
              <p className="text-center text-[11px] text-slate-500">
                Review all high-risk items listed above to enable export download.
              </p>
            )}
          </div>

          {exportSuccess && (
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs flex gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">✔ Export Complete</p>
                <p className="mt-1 leading-relaxed text-emerald-400/85">
                  Your redacted document and audit log have been successfully generated.
                  You can safely return to the workspace or review another document.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Redaction Side-by-Side Preview */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col min-h-[480px]">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-slate-400" />
            Redacted Document Preview
          </h3>
          
          <div className="flex-1 bg-slate-950 border border-slate-850 p-5 rounded-md overflow-y-auto max-h-[500px]">
            {(currentDocument.originalText ?? currentDocument.text) ? (
              <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-all">
                {redactedText}
              </p>
            ) : (
              <p className="text-slate-500 text-sm text-center py-20 italic">
                No text to display for empty document state.
              </p>
            )}
          </div>
          
          <div className="mt-4 text-xs text-slate-500 flex justify-between">
            <span>Click text above to select all for copy/paste</span>
            <span>Character count: {redactedText.length}</span>
          </div>

          {stats.unresolvedHigh > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-amber-950/20 border border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
              <span className="text-xs text-amber-400 font-medium">
                ⚠️ {stats.unresolvedHigh} high-risk safety gate items must be resolved before exporting.
              </span>
              <button
                onClick={() => setPage('review')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-amber-950/30 flex items-center gap-1.5 shrink-0"
              >
                Let's Fix These Issues
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Horizontal Action Bar (Always Visible) */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setPage('list')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-950/20 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Home className="w-3.5 h-3.5" />
            Back to Workspace
          </button>
          
          <button
            onClick={() => {
              setPage('list');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-upload-dialog'));
              }, 50);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Upload Another Document
          </button>

          <button
            onClick={() => setPage('list')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Review Another Document
          </button>
        </div>

        <button
          onClick={handleExport}
          disabled={stats.unresolvedHigh > 0}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
            stats.unresolvedHigh > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950/30'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          {exportSuccess ? 'Download Again' : 'Download Redacted Files & Logs'}
        </button>
      </div>

    </div>
  );
};
