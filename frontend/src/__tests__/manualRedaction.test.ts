import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store/useStore';

vi.mock('../services/documentApi', () => ({
  fetchDocuments: vi.fn(),
  fetchDocumentById: vi.fn(),
}));

vi.mock('../services/reviewApi', () => ({
  submitDecisions: vi.fn().mockImplementation((_docId: string, decisions: any[]) => {
    return Promise.resolve(decisions.map((d: any) => ({
      ...d,
      id: d.id || 'mock-id',
      status: d.status || 'suggested'
    })));
  }),
}));

describe('Manual Redaction Store Action', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useStore.setState({
      currentDocument: {
        id: 'test-doc-id',
        title: 'Test Document',
        text: 'Hello Konduru Hemesh. Email: test@example.com. Other: 12345.',
        spans: []
      },
      propagationPrompt: null,
      selectedSpanId: null,
      toasts: []
    });
  });

  it('should successfully add a manual span with high risk for name', async () => {
    const store = useStore.getState();
    await store.addManualSpan('Konduru Hemesh', 6, 20, 'name');

    const updatedDoc = useStore.getState().currentDocument;
    expect(updatedDoc).not.toBeNull();
    expect(updatedDoc!.spans.length).toBe(1);
    
    const span = updatedDoc!.spans[0];
    expect(span.text).toBe('Konduru Hemesh');
    expect(span.type).toBe('name');
    expect(span.riskLevel).toBe('high');
    expect(span.status).toBe('suggested');
    expect(span.confidence).toBe(1.0);
    expect(span.source).toBe('manual');
  });

  it('should successfully add a manual span with low risk for other type', async () => {
    const store = useStore.getState();
    await store.addManualSpan('12345', 54, 59, 'other');

    const updatedDoc = useStore.getState().currentDocument;
    expect(updatedDoc).not.toBeNull();
    expect(updatedDoc!.spans.length).toBe(1);
    
    const span = updatedDoc!.spans[0];
    expect(span.text).toBe('12345');
    expect(span.type).toBe('other');
    expect(span.riskLevel).toBe('low');
  });

  it('should prevent adding an overlapping manual span', async () => {
    // Set initial span
    useStore.setState({
      currentDocument: {
        id: 'test-doc-id',
        title: 'Test Document',
        text: 'Hello Konduru Hemesh. Email: test@example.com.',
        spans: [{
          id: 'existing-span',
          start: 6,
          end: 20,
          text: 'Konduru Hemesh',
          type: 'name',
          confidence: 0.9,
          riskLevel: 'high',
          status: 'suggested'
        }]
      }
    });

    const store = useStore.getState();
    // Try to add span that overlaps
    await store.addManualSpan('Hemesh', 14, 20, 'name');

    const updatedDoc = useStore.getState().currentDocument;
    expect(updatedDoc!.spans.length).toBe(1); // No new span added
  });
});
