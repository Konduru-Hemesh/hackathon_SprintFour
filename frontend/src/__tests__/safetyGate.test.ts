import { describe, it, expect } from 'vitest';
import type { RedactionSpan } from '../types';

// Pure logic mirroring the safety gate condition in SummaryScreen
function isExportAllowed(spans: RedactionSpan[]): boolean {
  const unresolvedHigh = spans.filter(s => s.riskLevel === 'high' && s.status === 'suggested').length;
  return unresolvedHigh === 0;
}

describe('Export Safety Gate Logic', () => {
  it('should block export when unresolved high-risk suggestions exist', () => {
    const mockSpans: RedactionSpan[] = [
      {
        id: '1',
        start: 0,
        end: 10,
        text: 'John Smith',
        type: 'name',
        confidence: 0.9,
        riskLevel: 'high',
        status: 'suggested'
      },
      {
        id: '2',
        start: 15,
        end: 25,
        text: 'Date',
        type: 'date',
        confidence: 0.8,
        riskLevel: 'low',
        status: 'accepted'
      }
    ];

    expect(isExportAllowed(mockSpans)).toBe(false);
  });

  it('should allow export when all high-risk suggestions are resolved (accepted or rejected)', () => {
    const mockSpans: RedactionSpan[] = [
      {
        id: '1',
        start: 0,
        end: 10,
        text: 'John Smith',
        type: 'name',
        confidence: 0.9,
        riskLevel: 'high',
        status: 'accepted'
      },
      {
        id: '2',
        start: 15,
        end: 25,
        text: 'Other Person',
        type: 'name',
        confidence: 0.9,
        riskLevel: 'high',
        status: 'rejected'
      },
      {
        id: '3',
        start: 30,
        end: 40,
        text: 'Date',
        type: 'date',
        confidence: 0.8,
        riskLevel: 'low',
        status: 'suggested' // low-risk remaining does NOT block export
      }
    ];

    expect(isExportAllowed(mockSpans)).toBe(true);
  });

  it('should allow export on a document with zero suggested spans', () => {
    expect(isExportAllowed([])).toBe(true);
  });
});
