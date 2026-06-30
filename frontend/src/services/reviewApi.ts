import type { RedactionSpan } from '../types';

const API_BASE = 'http://localhost:3001/api';

export interface DecisionPayload {
  id: string;
  status: 'suggested' | 'accepted' | 'rejected';
  start?: number;
  end?: number;
  text?: string;
  type?: string;
  confidence?: number;
  riskLevel?: string;
  entityGroupId?: string;
}

export async function submitDecisions(
  documentId: string,
  decisions: DecisionPayload[]
): Promise<RedactionSpan[]> {
  const res = await fetch(`${API_BASE}/documents/${documentId}/decisions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decisions }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit decisions to server');
  }

  return data.spans;
}
