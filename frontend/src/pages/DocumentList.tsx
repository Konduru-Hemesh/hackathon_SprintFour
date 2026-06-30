import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  FileText,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Upload,
  Sparkles,
  CheckCircle2,
  Search,
  Database,
  Clock,
  Check,
  Shield,
  Activity,
  RefreshCw
} from 'lucide-react';
import { parseUploadedFile } from '../utils/fileParser';

export const DocumentList: React.FC = () => {
  const {
    documents,
    uploadedDocuments,
    isLoading,
    error,
    loadDocuments,
    loadDocument,
    setPage,
    addUploadedDocument,
    addToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'demos'>('documents');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'extracting' | 'detecting' | 'complete'>('idle');
  const [latestAnalysisSummary, setLatestAnalysisSummary] = useState<{
    id: string;
    title: string;
    pages: number;
    totalSpans: number;
    highRisk: number;
    lowRisk: number;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, uploadedDocuments]);

  useEffect(() => {
    const handler = () => {
      fileInputRef.current?.click();
    };
    window.addEventListener('trigger-upload-dialog', handler);
    return () => window.removeEventListener('trigger-upload-dialog', handler);
  }, []);

  const handleSelectDoc = async (id: string) => {
    await loadDocument(id);
    setPage('review');
  };

  // Filtered lists
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const sessionDocs = useMemo(() => {
    return filteredDocuments.filter(doc => doc.id.startsWith('upload_'));
  }, [filteredDocuments]);

  const sampleDocs = useMemo(() => {
    return filteredDocuments.filter(doc => !doc.id.startsWith('upload_'));
  }, [filteredDocuments]);

  // Derive workspace stats
  const stats = useMemo(() => {
    const total = documents.length;
    const totalSuggestions = documents.reduce((acc, d) => acc + d.totalSpans, 0);
    const unreviewed = documents.reduce((acc, d) => acc + d.unreviewedSpans, 0);
    const readyCount = documents.filter(d => d.unreviewedSpans === 0).length;
    const reviewed = totalSuggestions - unreviewed;
    const progressPercent = totalSuggestions > 0 ? Math.round((reviewed / totalSuggestions) * 100) : 100;

    return {
      total,
      totalSuggestions,
      unreviewed,
      readyCount,
      progressPercent
    };
  }, [documents]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // File parsing handler
  const handleProcessFile = async (file: File) => {
    if (!file) return;
    const allowedExtensions = ['txt', 'docx', 'pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExtensions.includes(extension)) {
      addToast('Unsupported file type. Please upload a PDF, DOCX, or TXT file.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('File exceeds the 5MB size limit.', 'error');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setLatestAnalysisSummary(null);

    try {
      // Step 1: Uploading
      setUploadStage('uploading');
      await sleep(600);

      // Step 2: Extracting text
      setUploadStage('extracting');
      const parsedDoc = await parseUploadedFile(file);
      await sleep(600);

      // Step 3: Detecting identifiers
      setUploadStage('detecting');
      await sleep(600);

      // Step 4: Complete
      setUploadStage('complete');
      await sleep(500);

      addUploadedDocument(parsedDoc);
      addToast(`"${file.name}" analyzed successfully.`, 'success');

      // Estimate page count
      let pages = 1;
      if (extension === 'pdf') {
        pages = Math.max(1, Math.ceil(parsedDoc.text.length / 2500));
      } else {
        pages = Math.max(1, Math.ceil(parsedDoc.text.length / 3000));
      }

      setLatestAnalysisSummary({
        id: parsedDoc.id,
        title: parsedDoc.title,
        pages,
        totalSpans: parsedDoc.spans.length,
        highRisk: parsedDoc.spans.filter(s => s.riskLevel === 'high').length,
        lowRisk: parsedDoc.spans.filter(s => s.riskLevel === 'low').length,
      });
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Unable to extract text from this document.');
      addToast('Text extraction failed.', 'error');
      setUploadStage('idle');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const getDocMeta = (title: string) => {
    if (title.includes('Document A')) {
      return {
        scenario: 'Repeat Entity Blind Spot',
        desc: 'Illustrates occurrences where an entity repeats but only some matches were caught by the AI.',
        duration: '2 min read',
        icon: 'repeat'
      };
    }
    if (title.includes('Document B')) {
      return {
        scenario: 'False Positive & Adjacent PII',
        desc: 'Demonstrates false positive alerts and adjacent contextual PII patterns requiring reviewer adjustments.',
        duration: '3 min read',
        icon: 'alert'
      };
    }
    if (title.includes('Document C')) {
      return {
        scenario: 'Adjacent PII',
        desc: 'Validates safety boundary responses and edge rendering on blank content configurations.',
        duration: '1 min read',
        icon: 'file'
      };
    }
    return {
      scenario: 'Clean Document',
      desc: 'Tests safety checklist behaviors when zero suggested redaction candidates are pre-flagged.',
      duration: '1 min read',
      icon: 'shield'
    };
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 flex-1 flex flex-col justify-start">
      
      {/* Hero Header */}
      <header className="mb-12 text-center max-w-4xl mx-auto space-y-6 pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
          🛡 ConSeals
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-350">
          Human-in-the-Loop Privacy Review
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Protect sensitive documents before they leave your organization. Review AI-generated redactions, catch missed sensitive information, manually correct mistakes, and safely export verified documents.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <button
            onClick={() => {
              setActiveTab('documents');
              fileInputRef.current?.click();
            }}
            className="px-6 py-3 rounded-lg bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-indigo-950/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={() => {
              setActiveTab('demos');
            }}
            className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-400" />
            Try Demo Scenario
          </button>
        </div>
      </header>

      {/* Trust & Privacy Row */}
      <div className="mb-14 border-y border-slate-900/60 py-5 max-w-5xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-around gap-y-3.5 gap-x-6 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Local Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No Cloud Upload</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Reviewer Controlled</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Audit Trail Enabled</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-900/60 max-w-5xl mx-auto mb-10 w-full">
        <div className="flex">
          <button
            onClick={() => {
              setActiveTab('documents');
              setSearchQuery('');
            }}
            className={`px-8 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-indigo-500 text-white bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Database className="w-4 h-4" />
            Active Workspace
          </button>
          <button
            onClick={() => {
              setActiveTab('demos');
              setSearchQuery('');
            }}
            className={`px-8 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'demos'
                ? 'border-indigo-500 text-white bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Demo Scenarios
          </button>
        </div>

      </div>

      {error && (
        <div className="mb-8 p-4 rounded-lg bg-red-950/20 border border-red-900/50 text-red-300 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold">Error Syncing Workspace Documents</p>
            <p className="text-[11px] text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {latestAnalysisSummary && (
        <div className="mb-8 p-6 rounded-xl bg-indigo-950/20 border border-indigo-900/50 text-slate-200 animate-fadeIn flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block animate-pulse" />
              <h3 className="font-bold text-sm text-slate-100">
                {latestAnalysisSummary.totalSpans > 0 ? 'Analysis Complete' : 'Analysis Complete: No PII detected'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Document:</span> <strong className="text-slate-300">{latestAnalysisSummary.title}</strong>
              </div>
              <div>
                <span className="text-slate-500">Pages:</span> <strong className="text-slate-300">{latestAnalysisSummary.pages}</strong>
              </div>
              <div>
                <span className="text-slate-500">Identifiers:</span> <strong className="text-slate-300">{latestAnalysisSummary.totalSpans}</strong>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <strong className={latestAnalysisSummary.totalSpans > 0 ? 'text-indigo-400' : 'text-emerald-450'}>
                  {latestAnalysisSummary.totalSpans > 0 ? 'Ready for review' : 'Ready for export'}
                </strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {latestAnalysisSummary.totalSpans > 0 ? (
                <span>
                  Detected <strong className="text-red-400">{latestAnalysisSummary.highRisk} High Risk</strong> and{' '}
                  <strong className="text-blue-400">{latestAnalysisSummary.lowRisk} Low Risk</strong> suggestions.
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">✓ No sensitive identifiers detected.</span>
              )}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setLatestAnalysisSummary(null)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-450 hover:text-slate-200 border border-slate-800 text-xs font-bold cursor-pointer transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={async () => {
                await loadDocument(latestAnalysisSummary.id);
                setLatestAnalysisSummary(null);
                setPage('review');
              }}
              className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Enter Review Workspace
            </button>
          </div>
        </div>
      )}

      {/* Conditional Layouts: Separated Workspace vs Demos Pages */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Upload & Documents List (span 7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Upload Area */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-900 rounded-xl p-8 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-400" />
                Upload Document
              </h2>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-250 flex flex-col items-center justify-center min-h-[260px] ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_30px_rgba(99,102,241,0.06)]'
                    : 'border-slate-800/80 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/40 hover:shadow-md'
                } ${isParsing ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.pdf,.docx"
                  className="hidden"
                  disabled={isParsing}
                />
                {isParsing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-2 border-slate-900 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-355 uppercase tracking-wider">
                      {uploadStage === 'uploading' && 'Uploading File...'}
                      {uploadStage === 'extracting' && 'Extracting structure...'}
                      {uploadStage === 'detecting' && 'Running AI models...'}
                      {uploadStage === 'complete' && 'Analysis complete'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4.5 rounded-full bg-slate-900/60 border border-slate-850 mb-5 transition-all duration-200">
                      <Upload className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-base font-semibold text-slate-200">
                      Drag & drop your document here, or <span className="text-indigo-400 hover:underline hover:text-indigo-350">browse files</span>
                    </p>
                    <p className="text-xs text-slate-505 mt-3 max-w-xs leading-relaxed">
                      Supports <strong className="text-slate-400">PDF, DOCX, TXT</strong> up to 5MB.
                    </p>
                    <div className="mt-5 px-3 py-1 rounded-full bg-slate-900 text-[10px] text-slate-405 font-mono border border-slate-850 uppercase tracking-wider">
                      Current Session Only
                    </div>
                  </>
                )}
              </div>

              {parseError && (
                <div className="mt-4 p-3.5 rounded-lg bg-red-950/20 border border-red-900/50 text-red-300 text-xs flex flex-col gap-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Unable to parse this document.
                  </p>
                  <p className="text-[11px] text-red-455/80 leading-normal">{parseError}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setParseError(null);
                      fileInputRef.current?.click();
                    }}
                    className="mt-1 self-start px-3 py-1.5 bg-red-955 hover:bg-red-900 text-red-300 rounded border border-red-900/50 font-semibold cursor-pointer text-xs transition-colors"
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </div>

            {/* Search & Documents Section */}
            <div className="space-y-6">
              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search uploaded documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl py-3.5 pl-12 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all focus:bg-slate-900/50"
                />
                <Search className="absolute left-4.5 top-4 w-4 h-4 text-slate-505" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 p-1.5 rounded-lg hover:bg-slate-800 text-slate-450 hover:text-slate-205 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-slate-900 rounded-xl bg-slate-900/10">
                  <div className="w-8 h-8 border-2 border-slate-900 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-slate-500 text-xs">Loading workspace documents...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-slate-400" />
                    Your Documents ({sessionDocs.length})
                  </h3>
                  
                  {sessionDocs.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-900 rounded-xl bg-slate-950/20 p-8">
                      <p className="text-slate-400 text-xs mb-4">
                        {searchQuery ? 'No matching documents found.' : 'No documents uploaded yet.'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow-md shadow-indigo-950/30"
                        >
                          Upload a document to begin
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3.5">
                      {sessionDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleSelectDoc(doc.id)}
                          className="group text-left p-5 bg-gradient-to-br from-slate-900/30 to-slate-950/20 hover:from-slate-900/50 hover:to-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700 hover:translate-y-[-1px]"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-3.5 rounded-lg bg-slate-950 text-indigo-400 border border-slate-900 group-hover:text-indigo-350 transition-colors">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white truncate">
                                {doc.title}
                              </h4>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                                <span>User Uploaded</span>
                                <span>•</span>
                                <span>{doc.totalSpans} suggestions</span>
                                {doc.unreviewedSpans > 0 ? (
                                  <span className="text-amber-505 font-medium flex items-center gap-0.5">
                                    <ShieldAlert className="w-3 h-3" />
                                    {doc.unreviewedSpans} remaining
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* Right Column: stats, activity (span 5) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Workspace Overview */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-505 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Workspace Overview
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900/60 hover:border-slate-800 transition-all duration-200 flex flex-col justify-between min-h-[100px] hover:translate-y-[-1px] hover:shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Documents</span>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-white tracking-tight">{stats.total}</span>
                    <p className="text-[9px] text-slate-505 mt-1">Total active files</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900/60 hover:border-slate-800 transition-all duration-200 flex flex-col justify-between min-h-[100px] hover:translate-y-[-1px] hover:shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-semibold">Suggestions</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-white tracking-tight">{stats.totalSuggestions}</span>
                    <p className="text-[9px] text-slate-505 mt-1">PII entities flagged</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900/60 hover:border-slate-800 transition-all duration-200 flex flex-col justify-between min-h-[100px] hover:translate-y-[-1px] hover:shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-semibold">Needs Review</span>
                    <AlertTriangle className="w-4 h-4 text-amber-505" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-amber-400 tracking-tight">{stats.unreviewed}</span>
                    <p className="text-[9px] text-slate-505 mt-1">Pending decisions</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900/60 hover:border-slate-800 transition-all duration-200 flex flex-col justify-between min-h-[100px] hover:translate-y-[-1px] hover:shadow-sm">
                  <div className="flex items-center justify-between text-slate-505">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-semibold">Ready to Export</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-emerald-450 tracking-tight">{stats.readyCount}</span>
                    <p className="text-[9px] text-slate-550 mt-1">Safe to download</p>
                  </div>
                </div>
              </div>

              {/* Full-width progress bar */}
              <div className="mt-6 border-t border-slate-900/60 pt-5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 font-medium">Average Review Progress</span>
                  <span className="text-slate-200 font-bold font-mono">{stats.progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div
                    className="h-full bg-indigo-505 transition-all duration-500 rounded-full"
                    style={{ width: `${stats.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-950/60">
                  <span className="text-slate-500">Last reviewed</span>
                  <span className="text-slate-300 font-medium max-w-[180px] truncate">
                    {documents.find(d => d.unreviewedSpans < d.totalSpans)?.title || 'No documents reviewed yet'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-955/60">
                  <span className="text-slate-550">Last export</span>
                  <span className="text-slate-350 font-medium">Just now</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-955/60">
                  <span className="text-slate-550">Uploaded this session</span>
                  <span className="text-slate-300 font-mono font-semibold">{sessionDocs.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-550">Documents ready</span>
                  <span className="text-emerald-450 font-mono font-semibold">{stats.readyCount}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'demos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Curated Demo scenarios list (span 7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Quick Demo Banner */}
            <div className="bg-gradient-to-r from-slate-900/40 to-indigo-950/10 border border-slate-900 rounded-xl p-6 flex gap-4 items-start shadow-sm">
              <div className="p-3 rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">✨ Quick Demo</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  New to ConSeals? Open one of these curated scenarios to experience common AI redaction failure modes in under two minutes.
                </p>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search demo scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl py-3.5 pl-12 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all focus:bg-slate-900/50"
              />
              <Search className="absolute left-4.5 top-4 w-4 h-4 text-slate-505" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 p-1.5 rounded-lg hover:bg-slate-800 text-slate-455 hover:text-slate-205 transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Demo Scenarios ({sampleDocs.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Curated environments designed to evaluate key features of our redaction workflow.
                </p>
              </div>

              {sampleDocs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-900 rounded-xl bg-slate-950/20 p-6">
                  <p className="text-slate-500 text-xs">
                    {searchQuery ? 'No matching demo scenarios found.' : 'No demo scenarios found.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sampleDocs.map((doc) => {
                    const meta = getDocMeta(doc.title);
                    
                    // Render Icon dynamically
                    let IconComponent = FileText;
                    if (meta.icon === 'repeat') IconComponent = RefreshCw;
                    else if (meta.icon === 'alert') IconComponent = AlertTriangle;
                    else if (meta.icon === 'shield') IconComponent = Shield;

                    return (
                      <div
                        key={doc.id}
                        className="group bg-gradient-to-br from-slate-900/30 to-slate-950/20 hover:from-slate-900/50 hover:to-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl p-6 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="p-3.5 rounded-lg bg-slate-950 text-slate-400 group-hover:text-indigo-400 transition-colors border border-slate-900 mt-0.5 shrink-0">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h4 className="font-semibold text-sm text-slate-200">
                                {meta.scenario}
                              </h4>
                              {doc.unreviewedSpans === 0 ? (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/40">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Reviewed
                                </span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-505 bg-amber-955/20 px-2 py-0.5 rounded border border-amber-900/40">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Needs Review
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-455 mt-2 leading-relaxed">
                              {meta.desc}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] text-slate-550 mt-3">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-slate-600" />
                                {meta.duration}
                              </span>
                              <span>•</span>
                              <span>{doc.totalSpans} suggestions</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleSelectDoc(doc.id)}
                          className="w-full md:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                        >
                          Open Scenario
                          <ChevronRight className="w-3.5 h-3.5 text-slate-550 group-hover:text-slate-350 transition-colors" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Why these demo scenarios panel (span 5) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Why these demo scenarios panel */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Why these demo scenarios?</h4>
              <p className="text-xs text-slate-455 leading-relaxed">
                Each scenario demonstrates a real-world AI redaction failure:
              </p>
              <ul className="space-y-2 text-xs text-slate-455 pl-4 list-disc marker:text-indigo-500">
                <li><strong>Repeat entity blind spots:</strong> Where AI redactions flag an entity once but miss subsequent occurrences.</li>
                <li><strong>False positives:</strong> Where non-sensitive technology terms or headers are incorrectly flagged as personal names.</li>
                <li><strong>Adjacent contextual PII:</strong> Where context clues contain sensitive information bordering ignored sections.</li>
                <li><strong>Clean document validation:</strong> Checking pipeline behaviors and safety checklist gates with zero pre-flagged PII.</li>
              </ul>
              <p className="text-xs text-slate-455 leading-relaxed pt-3 border-t border-slate-950">
                These scenarios help reviewers quickly evaluate the product without uploading their own files.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
