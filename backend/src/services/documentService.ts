import { initialDocuments } from '../data/fixtures';
import { Document, RedactionSpan } from '../types';

// In-memory data store for the lifetime of the process
class DocumentService {
  private documents: Map<string, Document>;

  constructor() {
    this.documents = new Map();
    initialDocuments.forEach(doc => {
      // Deep clone fixtures to avoid mutating imported references
      this.documents.set(doc.id, JSON.parse(JSON.stringify(doc)));
    });
  }

  public getDocuments() {
    return Array.from(this.documents.values()).map(doc => {
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
  }

  public getDocumentById(id: string): Document | null {
    const doc = this.documents.get(id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  public updateDecisions(
    docId: string,
    decisions: Array<Partial<RedactionSpan> & { id: string; status: 'suggested' | 'accepted' | 'rejected' }>
  ): { success: boolean; spans?: RedactionSpan[]; error?: string } {
    const doc = this.documents.get(docId);
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }

    // Work on a copy of the spans first to validate transactionally
    const updatedSpans: RedactionSpan[] = JSON.parse(JSON.stringify(doc.spans));

    for (const decision of decisions) {
      const existingSpanIndex = updatedSpans.findIndex(s => s.id === decision.id);

      if (existingSpanIndex !== -1) {
        // Update existing span status and potential fields
        updatedSpans[existingSpanIndex] = {
          ...updatedSpans[existingSpanIndex],
          ...decision,
          status: decision.status
        };
      } else {
        // Create new span (typically from entity linking propagation)
        // Must check that all required fields are present
        if (
          decision.start === undefined ||
          decision.end === undefined ||
          !decision.text ||
          !decision.type ||
          decision.confidence === undefined ||
          !decision.riskLevel
        ) {
          return { success: false, error: `Invalid payload for new span ID: ${decision.id}. Missing required fields.` };
        }

        // Coordinate Validation
        const sourceText = doc.originalText ?? doc.text;

        if (decision.start < 0 || decision.end > sourceText.length || decision.start >= decision.end) {
          return { success: false, error: `Coordinate out of bounds: start ${decision.start}, end ${decision.end} for span ID ${decision.id}` };
        }

        // Text Verification
        const slicedText = sourceText.slice(decision.start, decision.end);
        if (slicedText.toLowerCase() !== decision.text.toLowerCase()) {
          return { success: false, error: `Text mismatch at [${decision.start}:${decision.end}]. Expected "${decision.text}" but got "${slicedText}"` };
        }

        updatedSpans.push({
          id: decision.id,
          start: decision.start,
          end: decision.end,
          text: decision.text,
          type: decision.type as any,
          confidence: decision.confidence,
          riskLevel: decision.riskLevel as any,
          status: decision.status,
          entityGroupId: decision.entityGroupId,
          source: decision.source || 'ai'
        });
      }
    }

    // Overlap Validation
    // Filter active spans (suggested + accepted) and sort by start
    const activeSpans = updatedSpans
      .filter(s => s.status !== 'rejected')
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < activeSpans.length - 1; i++) {
      const current = activeSpans[i];
      const next = activeSpans[i + 1];
      if (current.end > next.start) {
        return {
          success: false,
          error: `Overlap detected between span "${current.text}" [${current.start}:${current.end}] and "${next.text}" [${next.start}:${next.end}]`
        };
      }
    }

    // If all validation checks pass, save the updated spans
    doc.spans = updatedSpans;
    return { success: true, spans: doc.spans };
  }
}

export const documentService = new DocumentService();
