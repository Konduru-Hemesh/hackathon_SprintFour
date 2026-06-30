import { describe, it, expect, vi } from 'vitest';
import { parseUploadedFile } from '../utils/fileParser';

// Mock pdfjs-dist and mammoth to avoid loading actual binary readers in node environment
vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    version: '4.1.9',
    getDocument: vi.fn().mockImplementation((_options) => {
      return {
        promise: Promise.resolve({
          numPages: 1,
          getPage: () => Promise.resolve({
            getTextContent: () => Promise.resolve({
              items: [{ str: 'Hello from mock PDF. Contact: test@example.com' }]
            })
          })
        })
      };
    })
  };
});

vi.mock('mammoth', () => {
  return {
    default: {
      extractRawText: vi.fn().mockResolvedValue({
        value: 'Hello from mock DOCX. Contact: 123-45-6789'
      })
    }
  };
});

describe('File Parser Module - Stateful Preprocessing PII Classifier Pipeline', () => {
  it('should detect legitimate human names and phone numbers, and semantic line preprocessor should ignore false positive project/tech/header lists', async () => {
    const text = `
      Resume of Konduru Hemesh.
      Variant formats: Konduru-Hemesh or Hemesh-Konduru.
      
      Education
      B.Tech in Computer Science from Narayana Institutions or Amrita Vishwa Vidyapeetham.
      
      Experience
      Led Responsive Web Development, Personal Portfolio, and Learning Path Generator.
      Worked with Model Context Protocol and Google Drive integrations.
      Designed APIs on Funding Platform using React, Node.js, MongoDB, JWT, and Git on Linux.
      Created Gemini AI assistant.
      
      * Integrated YouTube API with Express.js backend
      * GitHub Repo: http://github.com/hemesh/project
      
      Programming Languages: React, Node.js, Express.js, MongoDB, JWT, Git, Linux
      
      Contact: hemesh@example.com or +91 9876543210
    `;
    const file = new File([text], 'resume.txt', { type: 'text/plain' });

    const result = await parseUploadedFile(file);

    // 1. Expected Detections
    const detectedNames = result.spans.filter(s => s.type === 'name').map(s => s.text);
    expect(detectedNames).toContain('Konduru Hemesh');
    expect(detectedNames).toContain('Konduru-Hemesh');
    expect(detectedNames).toContain('Hemesh-Konduru');

    const emailSpan = result.spans.find(s => s.type === 'email');
    expect(emailSpan).toBeDefined();
    expect(emailSpan?.text).toBe('hemesh@example.com');

    const phoneSpan = result.spans.find(s => s.type === 'phone');
    expect(phoneSpan).toBeDefined();
    expect(phoneSpan?.text).toBe('+91 9876543210');
    expect(phoneSpan?.riskLevel).toBe('high');

    // 2. Expected NON-Detections
    const nonDetections = [
      'GitHub Repo',
      'Programming Languages',
      'Integrated YouTube',
      'Express.js',
      'React',
      'Node.js',
      'Git',
      'Linux',
      'APIs',
      'Model Context Protocol',
      'Personal Portfolio',
      'Learning Path Generator'
    ];

    nonDetections.forEach(term => {
      const found = result.spans.some(s => s.text.toLowerCase() === term.toLowerCase());
      expect(found).toBe(false);
    });

    // 3. Entity Grouping Variant Support
    const name1 = result.spans.find(s => s.text === 'Konduru Hemesh');
    const name2 = result.spans.find(s => s.text === 'Konduru-Hemesh');
    const name3 = result.spans.find(s => s.text === 'Hemesh-Konduru');

    expect(name1).toBeDefined();
    expect(name2).toBeDefined();
    expect(name3).toBeDefined();
    expect(name1?.entityGroupId).toBe(name2?.entityGroupId);
    expect(name1?.entityGroupId).toBe(name3?.entityGroupId);
  });

  it('should reject unsupported formats', async () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    await expect(parseUploadedFile(file)).rejects.toThrow('Unsupported file format: .json');
  });
});
