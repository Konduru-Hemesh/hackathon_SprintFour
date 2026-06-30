export interface RedactionSpan {
  id: string;
  start: number;            // char offset in document text
  end: number;
  text: string;
  type: 'name' | 'phone' | 'email' | 'address' | 'ssn' | 'date' | 'other';
  confidence: number;        // 0–1
  riskLevel: 'high' | 'low'; // product decision, not detection logic
  status: 'suggested' | 'accepted' | 'rejected';
  entityGroupId?: string;    // links repeated occurrences of the same entity, normalized for case
  source?: 'ai' | 'manual';
}

export interface Document {
  id: string;
  title: string;
  text: string;
  spans: RedactionSpan[];
}

export interface DocumentSummary {
  id: string;
  title: string;
  textLength: number;
  totalSpans: number;
  unreviewedSpans: number;
}
