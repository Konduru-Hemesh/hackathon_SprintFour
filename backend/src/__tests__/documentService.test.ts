import { describe, it, expect, beforeEach } from 'vitest';
import { documentService } from '../services/documentService';

describe('Backend DocumentService Tests', () => {
  // Let's reset the service store before each test to ensure tests are isolated
  beforeEach(() => {
    // We can instantiate a new DocumentService instance or clear it, but since it's a singleton,
    // we can reset it by accessing the map if possible or testing on specific doc ids.
    // In our service, constructor initializes it with fixtures. We can manually reset it.
    (documentService as any).documents.clear();
    const docAText = "Dear Partners, John Smith is authorize.";
    const docBText = "Subject: Jane Doe+1-800-555-0199";

    (documentService as any).documents.set("doc-a", {
      id: "doc-a",
      title: "Doc A",
      text: docAText,
      spans: [
        {
          id: "span-1",
          start: 15,
          end: 25,
          text: "John Smith",
          type: "name",
          confidence: 0.95,
          riskLevel: "high",
          status: "suggested"
        }
      ]
    });

    (documentService as any).documents.set("doc-b", {
      id: "doc-b",
      title: "Doc B",
      text: docBText,
      spans: [
        {
          id: "span-b1",
          start: 9,
          end: 17,
          text: "Jane Doe",
          type: "name",
          confidence: 0.96,
          riskLevel: "high",
          status: "suggested"
        }
      ]
    });
  });

  describe('Span Validation', () => {
    it('should successfully update status of an existing span', () => {
      const res = documentService.updateDecisions("doc-a", [
        { id: "span-1", status: "accepted" }
      ]);
      expect(res.success).toBe(true);
      expect(res.spans?.[0].status).toBe("accepted");
    });

    it('should reject new span with missing required fields', () => {
      const res = documentService.updateDecisions("doc-a", [
        {
          id: "new-span",
          status: "accepted",
          start: 0,
          end: 4
          // missing text, type, confidence, riskLevel
        }
      ]);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Missing required fields");
    });

    it('should reject span with out of bounds coordinates', () => {
      const res = documentService.updateDecisions("doc-a", [
        {
          id: "new-span",
          status: "accepted",
          start: -5,
          end: 10,
          text: "Dear Partners",
          type: "other",
          confidence: 0.8,
          riskLevel: "low"
        }
      ]);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Coordinate out of bounds");
    });

    it('should reject span if text verification fails', () => {
      const res = documentService.updateDecisions("doc-a", [
        {
          id: "new-span",
          status: "accepted",
          start: 0,
          end: 4,
          text: "MismatchedText",
          type: "other",
          confidence: 0.8,
          riskLevel: "low"
        }
      ]);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Text mismatch");
    });
  });

  describe('Overlap Validation', () => {
    it('should reject adding a new span that overlaps with an existing suggested/accepted span', () => {
      // Existing span is "John Smith" at [15:25]
      const res = documentService.updateDecisions("doc-a", [
        {
          id: "new-span",
          status: "accepted",
          start: 20, // starts inside [15:25]
          end: 30,
          text: "Smith is a",
          type: "other",
          confidence: 0.8,
          riskLevel: "low"
        }
      ]);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Overlap detected");
    });

    it('should allow adding a span that overlaps only with a rejected span', () => {
      // Reject existing span first
      documentService.updateDecisions("doc-a", [
        { id: "span-1", status: "rejected" }
      ]);

      // Now add a span that overlaps with [15:25]
      const res = documentService.updateDecisions("doc-a", [
        {
          id: "new-span",
          status: "accepted",
          start: 20,
          end: 30,
          text: "Smith is a",
          type: "other",
          confidence: 0.8,
          riskLevel: "low"
        }
      ]);
      expect(res.success).toBe(true);
      expect(res.spans?.find(s => s.id === "new-span")).toBeDefined();
    });
  });
});
