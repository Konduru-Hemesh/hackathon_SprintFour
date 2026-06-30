import type { Document, RedactionSpan } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up the worker using local Vite bundled URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Candidate interface for two-stage parsing
interface Candidate {
  text: string;
  start: number;
  end: number;
  preClassifiedType?: 'EMAIL' | 'PHONE' | 'SSN' | 'ADDRESS' | 'URL';
}

// LineInfo interface for line-level preprocessing
interface LineInfo {
  text: string;
  index: number;
  type: 'SECTION_HEADER' | 'PROJECT_TITLE' | 'TECH_STACK' | 'BULLET_ITEM' | 'CONTACT_BLOCK' | 'NORMAL_TEXT';
  section: string;
}

// Dictionaries for semantic classification
const techDict = new Set([
  'react', 'node.js', 'express.js', 'express', 'mongodb', 'jwt', 'api', 'apis', 'github', 'youtube', 
  'google drive', 'langchain', 'gemini', 'mcp', 'bootstrap', 'python', 'javascript', 'typescript', 
  'mysql', 'git', 'linux', 'repo', 'repository'
]);

const sectionDict = new Set([
  'projects', 'skills', 'programming languages', 'education', 'certifications', 'experience', 
  'summary', 'objective', 'technologies', 'tools', 'contact'
]);

const projectVocab = new Set([
  'platform', 'repository', 'portfolio', 'generator', 'recognition', 'development', 'framework', 
  'protocol', 'application', 'system', 'tool', 'library', 'engine', 'repo', 'integration', 'integrated',
  'youtube', 'github', 'web', 'link'
]);

// Determine line type and update the active section context
function getLineTypeAndSection(lineText: string, currentSection: string): { type: LineInfo['type']; section: string } {
  const trimmed = lineText.trim();
  const lower = trimmed.toLowerCase();
  
  if (!trimmed) {
    return { type: 'NORMAL_TEXT', section: currentSection };
  }

  // 1. Check if line is a Section Header
  if (sectionDict.has(lower) || 
      (trimmed.length < 30 && Array.from(sectionDict).some(header => lower === header || lower.startsWith(header + ':') || lower.endsWith(header)))) {
    let foundSection = currentSection;
    for (const header of sectionDict) {
      if (lower.includes(header)) {
        foundSection = header;
        break;
      }
    }
    return { type: 'SECTION_HEADER', section: foundSection };
  }

  // 2. Check if line belongs to a Contact Block
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed);
  const hasPhone = /(?:\+?\d{1,3}[-\s]*)?\(?\d{2,5}\)?[-\s]*\d{2,5}[-\s]*\d{3,5}/.test(trimmed);
  const hasUrl = /linkedin\.com|github\.com/i.test(trimmed);
  if (hasEmail || hasPhone || hasUrl || lower.includes('contact:') || lower.includes('email:') || lower.includes('phone:')) {
    return { type: 'CONTACT_BLOCK', section: currentSection };
  }

  // 3. Check if line is a Tech Stack line (contains multiple technology listings)
  const techCount = Array.from(techDict).filter(tech => lower.includes(tech)).length;
  if (techCount >= 2 || lower.startsWith('languages:') || lower.startsWith('technologies:') || lower.startsWith('skills:') || lower.startsWith('tech:')) {
    return { type: 'TECH_STACK', section: currentSection };
  }

  // 4. Check if line is a Bullet Item
  if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.startsWith('+')) {
    return { type: 'BULLET_ITEM', section: currentSection };
  }

  // 5. Context-based default for ignored sections
  const ignoredSections = new Set(['skills', 'programming languages', 'projects', 'education', 'certifications', 'technologies', 'tools']);
  if (ignoredSections.has(currentSection)) {
    if (currentSection === 'projects') {
      return { type: 'PROJECT_TITLE', section: currentSection };
    }
    return { type: 'TECH_STACK', section: currentSection };
  }

  return { type: 'NORMAL_TEXT', section: currentSection };
}

// Classifier function evaluating candidate text and surrounding context
function classifyCandidate(text: string, context: { start: number; docText: string }): {
  type: 'PERSON' | 'UNKNOWN';
  confidence: number;
} {
  const norm = text.toLowerCase().trim();
  
  // Rule: Ignore if text matches technology or section dictionary exactly or as sub-components
  if (techDict.has(norm) || Array.from(techDict).some(tech => norm === tech || norm.startsWith(tech + ' ') || norm.endsWith(' ' + tech))) {
    return { type: 'UNKNOWN', confidence: 0.0 };
  }
  if (sectionDict.has(norm) || Array.from(sectionDict).some(sec => norm === sec)) {
    return { type: 'UNKNOWN', confidence: 0.0 };
  }

  const nameTokens = text.split(/[-\s.]+/).filter(Boolean);
  const tokenCount = nameTokens.length;

  // Rule: Check negative keywords
  const hasNegativeWord = nameTokens.some(tok => {
    const t = tok.toLowerCase();
    return techDict.has(t) || sectionDict.has(t) || projectVocab.has(t);
  });

  if (hasNegativeWord) {
    return { type: 'UNKNOWN', confidence: 0.0 };
  }

  // Evaluate token count constraints (person names have 2-4 tokens)
  if (tokenCount >= 2 && tokenCount <= 4) {
    const surroundingText = context.docText.slice(Math.max(0, context.start - 120), Math.min(context.docText.length, context.start + text.length + 120));
    const isNearContact = /contact|email|phone|address|about|resume/i.test(surroundingText);
    const isNearBeginning = context.start < 250;
    const hasInitials = nameTokens.some(tok => tok.length <= 2 || tok.endsWith('.'));
    const hasHyphen = text.includes('-');

    let confidence = 0.70; // Weak Person Guess
    if (isNearBeginning || isNearContact || hasInitials || hasHyphen) {
      confidence = 0.92; // Strong Person Name
    }

    return { type: 'PERSON', confidence };
  }

  // Single token name candidate
  if (tokenCount === 1) {
    const surroundingText = context.docText.slice(Math.max(0, context.start - 80), Math.min(context.docText.length, context.start + text.length + 80));
    const isNearContact = /contact|email|phone|address/i.test(surroundingText);
    const isNearBeginning = context.start < 150;
    if (isNearContact || isNearBeginning) {
      return { type: 'PERSON', confidence: 0.70 }; // Weak Person Guess
    }
  }

  return { type: 'UNKNOWN', confidence: 0.0 };
}

// Extract text from TXT file using standard Promise-based Blob/File text() method
const parseTxt = async (file: File): Promise<string> => {
  try {
    return await file.text();
  } catch {
    throw new Error('Failed to read TXT file');
  }
};

// Extract text from PDF file while preserving structure and formatting
const parsePdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let text = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];
    
    // Sort items by Y descending (top-to-bottom) then X ascending (left-to-right)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 4) {
        return yDiff; // different line
      }
      return a.transform[4] - b.transform[4]; // same line
    });

    let pageText = '';
    let lastY = -1;
    
    for (const item of items) {
      if (!item.str || (!item.str.trim() && item.str !== ' ')) continue;
      
      if (lastY !== -1) {
        const yDiff = lastY - item.transform[5];
        if (yDiff > 18) {
          // Large vertical gap -> paragraph break
          pageText += '\n\n';
        } else if (yDiff > 6) {
          // Normal vertical gap -> line break
          pageText += '\n';
        } else {
          // Same horizontal line -> word space separator
          pageText += ' ';
        }
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    
    text += pageText + '\n\n';
  }
  return text.trim();
};

// Extract text from DOCX file
const parseDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

// Main parser function with two-stage candidate-classification pipeline
export const parseUploadedFile = async (file: File): Promise<Document> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  let text = '';

  if (extension === 'txt') {
    text = await parseTxt(file);
  } else if (extension === 'pdf') {
    text = await parsePdf(file);
  } else if (extension === 'docx') {
    text = await parseDocx(file);
  } else {
    throw new Error(`Unsupported file format: .${extension}`);
  }

  if (!text.trim()) {
    throw new Error('Document contains no readable text.');
  }

  const id = `upload_${Date.now()}`;

  // Preprocessing: Classify each line statefully
  const lines: LineInfo[] = [];
  let currentSection = '';
  let charIndex = 0;
  
  const rawLines = text.split('\n');
  rawLines.forEach((lineText) => {
    const { type, section } = getLineTypeAndSection(lineText, currentSection);
    currentSection = section;
    lines.push({
      text: lineText,
      index: charIndex,
      type,
      section
    });
    charIndex += lineText.length + 1; // +1 for newline character
  });

  // Helper to determine if a character index is inside a permitted line type
  const isPermittedForName = (pos: number): boolean => {
    const line = lines.find(l => pos >= l.index && pos < l.index + l.text.length + 1);
    if (!line) return true;
    return line.type === 'NORMAL_TEXT' || line.type === 'CONTACT_BLOCK';
  };

  const rawCandidates: Candidate[] = [];

  // Stage 1: Candidate Extraction
  // 1. Email pattern matching
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    rawCandidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      preClassifiedType: 'EMAIL'
    });
  }

  // 2. SSN pattern matching
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  while ((match = ssnRegex.exec(text)) !== null) {
    rawCandidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      preClassifiedType: 'SSN'
    });
  }

  // 3. URLs (LinkedIn / GitHub) pattern matching
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in|github\.com)\/[a-zA-Z0-9_-]+\b/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    rawCandidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      preClassifiedType: 'URL'
    });
  }

  // 4. Addresses pattern matching
  const addressRegexes = [
    /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\s.,]{3,30}\s+(?:Street|St|Avenue|Ave|Road|Rd|Way|Drive|Dr|Boulevard|Blvd|Lane|Ln|Court|Ct|Circle|Cir)\b/g,
    /\b[A-Z][a-zA-Z\s]+,\s+[A-Z]{2}\s+\d{5}\b/g
  ];
  addressRegexes.forEach(reg => {
    reg.lastIndex = 0;
    while ((match = reg.exec(text)) !== null) {
      rawCandidates.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        preClassifiedType: 'ADDRESS'
      });
    }
  });

  // 5. Phone numbers pattern matching
  const phoneRegex = /(?:\+(?:\d{1,3})[-\s]*)?(?:\(\+?\d{1,3}\)[-\s]*)?(?:\(\d{2,5}\)[-\s]*)?\b\d{2,5}(?:[-\s]?\d{2,5}){2,4}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    rawCandidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      preClassifiedType: 'PHONE'
    });
  }

  // 6. TitleCase potential name/project phrases
  const titleCaseRegex = /\b(?:[A-Z][a-zA-Z0-9.*#-]*|[A-Z]\.)(?:[ \t-]+(?:[A-Z][a-zA-Z0-9.*#-]*|[A-Z]\.))*\b/g;
  while ((match = titleCaseRegex.exec(text)) !== null) {
    rawCandidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Sort candidates by start index ascending and length descending
  rawCandidates.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  // Overlap resolution
  const resolvedCandidates: Candidate[] = [];
  rawCandidates.forEach(cand => {
    const overlaps = resolvedCandidates.some(res => cand.start < res.end && res.start < cand.end);
    if (!overlaps) {
      resolvedCandidates.push(cand);
    }
  });

  // Stage 2: Candidate Classification & Span Creation
  const spans: RedactionSpan[] = [];
  let spanCounter = 0;

  // Track assigned entityGroupIds per normalized matched text
  const entityGroupMap = new Map<string, string>();
  let entityGroupCounter = 0;

  // Normalized grouping helper: strips case, whitespace, dashes, and sorts tokens alphabetically
  const getEntityGroupId = (rawText: string): string => {
    const tokens = rawText.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/[-\s]+/).filter(Boolean);
    tokens.sort();
    const normalized = tokens.join('');
    if (!entityGroupMap.has(normalized)) {
      entityGroupMap.set(normalized, `entity-group-${entityGroupCounter++}`);
    }
    return entityGroupMap.get(normalized)!;
  };

  resolvedCandidates.forEach(cand => {
    if (cand.preClassifiedType) {
      // Process pre-classified high-confidence PII
      let type: 'email' | 'phone' | 'ssn' | 'address' | 'other' = 'other';
      let confidence = 0.95;
      let riskLevel: 'high' | 'low' = 'high';

      switch (cand.preClassifiedType) {
        case 'EMAIL':
          type = 'email';
          confidence = 0.99;
          break;
        case 'PHONE':
          type = 'phone';
          confidence = 0.99;
          riskLevel = 'high';
          break;
        case 'SSN':
          type = 'ssn';
          confidence = 1.0;
          break;
        case 'ADDRESS':
          type = 'address';
          confidence = 0.95;
          break;
        case 'URL':
          type = 'other';
          confidence = 0.95;
          break;
      }

      spans.push({
        id: `span-upload-${spanCounter++}`,
        start: cand.start,
        end: cand.end,
        text: cand.text,
        type,
        confidence,
        riskLevel,
        status: 'suggested',
        entityGroupId: getEntityGroupId(cand.text),
      });
    } else {
      // Semantic Filter: Only NORMAL_TEXT and CONTACT_BLOCK lines are permitted to trigger PERSON spans
      if (isPermittedForName(cand.start)) {
        const classification = classifyCandidate(cand.text, { start: cand.start, docText: text });
        
        if (classification.type === 'PERSON') {
          spans.push({
            id: `span-upload-${spanCounter++}`,
            start: cand.start,
            end: cand.end,
            text: cand.text,
            type: 'name',
            confidence: classification.confidence,
            riskLevel: 'high',
            status: 'suggested',
            entityGroupId: getEntityGroupId(cand.text),
          });
        }
      }
    }
  });

  spans.sort((a, b) => a.start - b.start);

  return {
    id,
    title: file.name,
    text,
    spans,
  };
};
