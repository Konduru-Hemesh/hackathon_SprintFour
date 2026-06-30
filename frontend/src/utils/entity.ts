/**
 * Finds all occurrences of targetText within text, respecting word boundaries
 * and special characters (like + or parenthesis in phone numbers).
 */
export function findEntityOccurrences(
  text: string,
  targetText: string
): Array<{ start: number; end: number; text: string }> {
  if (!targetText || !targetText.trim()) return [];

  // Escape special regex characters
  const escaped = targetText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  // If the target text starts/ends with alphanumeric characters, use standard word boundaries (\b).
  // Otherwise, use lookbehinds/lookaheads asserting non-alphanumeric character or string start/end.
  const prefix = /^\w/.test(targetText) ? '\\b' : '(?<=^|[^a-zA-Z0-9])';
  const suffix = /\w$/.test(targetText) ? '\\b' : '(?=$|[^a-zA-Z0-9])';

  const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'gi');
  const matches: Array<{ start: number; end: number; text: string }> = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  return matches;
}
