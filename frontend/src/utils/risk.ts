import type { RedactionSpan } from '../types';

export function getRiskLevel(type: RedactionSpan['type']): 'high' | 'low' {
  switch (type) {
    case 'phone':
    case 'ssn':
    case 'email':
    case 'address':
    case 'name':
      return 'high';
    case 'date':
    case 'other':
    default:
      return 'low';
  }
}

export function getExplanation(type: RedactionSpan['type']): string {
  switch (type) {
    case 'phone':
      return 'Detected because it matches a phone number pattern.';
    case 'email':
      return 'Detected because it matches a valid email structure.';
    case 'name':
      return "Detected because it appears to be a person's name.";
    case 'ssn':
      return 'Detected because it matches a government ID pattern.';
    case 'address':
      return 'Detected because it matches a street address pattern.';
    case 'date':
      return 'Detected because it matches a date pattern.';
    case 'other':
    default:
      return 'Flagged as a potential identifier based on context.';
  }
}
