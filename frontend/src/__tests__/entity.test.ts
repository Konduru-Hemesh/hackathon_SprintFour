import { describe, it, expect } from 'vitest';
import { findEntityOccurrences } from '../utils/entity';

describe('findEntityOccurrences (Entity Matching Utility)', () => {
  const text = 'Dear John Smith, John Smithson and john smith are here. Call +1 (555) 019-2834 or support@example.com.';

  it('should find case-insensitive exact matches', () => {
    const results = findEntityOccurrences(text, 'John Smith');
    // Should match "John Smith" (starts at index 5) and "john smith" (starts at 35)
    // but NOT "John Smithson"
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ start: 5, end: 15, text: 'John Smith' });
    expect(results[1]).toEqual({ start: 35, end: 45, text: 'john smith' });
  });

  it('should respect alphanumeric word boundaries', () => {
    const results = findEntityOccurrences(text, 'Smith');
    // Should match "Smith" in "John Smith", but NOT in "Smithson"
    expect(results).toHaveLength(2);
    expect(results[0].start).toBe(10);
    expect(results[1].start).toBe(40);
  });

  it('should match entities with regex special characters (phone numbers)', () => {
    const results = findEntityOccurrences(text, '+1 (555) 019-2834');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      start: 61,
      end: 78,
      text: '+1 (555) 019-2834'
    });
  });

  it('should match entities with boundary symbols like emails', () => {
    const results = findEntityOccurrences(text, 'support@example.com');
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('support@example.com');
  });

  it('should return empty array for empty inputs', () => {
    expect(findEntityOccurrences(text, '')).toEqual([]);
    expect(findEntityOccurrences(text, '   ')).toEqual([]);
  });
});
