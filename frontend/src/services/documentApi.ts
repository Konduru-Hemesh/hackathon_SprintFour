import type { Document, DocumentSummary } from '../types';

const API_BASE = 'http://localhost:3001/api';

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch documents list');
  }
  return res.json();
}

export async function fetchDocumentById(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to fetch document ${id}`);
  }
  return res.json();
}
