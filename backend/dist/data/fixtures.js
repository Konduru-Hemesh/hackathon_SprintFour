"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialDocuments = void 0;
// Helper to locate substring occurrences dynamically to prevent hardcoded index errors
function getCoords(text, search, occurrenceIndex) {
    let index = -1;
    for (let i = 0; i <= occurrenceIndex; i++) {
        index = text.indexOf(search, index + 1);
        if (index === -1) {
            throw new Error(`Substring "${search}" not found for occurrence ${occurrenceIndex}`);
        }
    }
    return { start: index, end: index + search.length };
}
const docAText = "Dear Partners,\n\n" +
    "I am writing to confirm that John Smith will be our main point of contact for the upcoming integration phase. " +
    "You can reach John Smith at his direct line +1 (555) 019-2834 during business hours. " +
    "Please note that john smith is authorized to sign off on architectural blueprints. " +
    "If john smith is unavailable, please dial +1 (555) 019-2834 immediately or contact our support team. " +
    "We look forward to working with JOHN SMITH.\n\n" +
    "Best regards,\n" +
    "Operations Team";
const johnSmith0 = getCoords(docAText, "John Smith", 0);
const johnSmith2 = getCoords(docAText, "john smith", 0);
const phone0 = getCoords(docAText, "+1 (555) 019-2834", 0);
const docASpans = [
    {
        id: "a-span-1",
        start: johnSmith0.start,
        end: johnSmith0.end,
        text: "John Smith",
        type: "name",
        confidence: 0.95,
        riskLevel: "high",
        status: "suggested",
        entityGroupId: "john_smith"
    },
    {
        id: "a-span-2",
        start: johnSmith2.start,
        end: johnSmith2.end,
        text: "john smith",
        type: "name",
        confidence: 0.82,
        riskLevel: "high",
        status: "suggested",
        entityGroupId: "john_smith"
    },
    {
        id: "a-span-3",
        start: phone0.start,
        end: phone0.end,
        text: "+1 (555) 019-2834",
        type: "phone",
        confidence: 0.99,
        riskLevel: "high",
        status: "suggested",
        entityGroupId: "phone_555_019_2834"
    }
];
const docBText = "CONFIDENTIAL RECORD OF INVESTIGATION\n\n" +
    "Case Identifier: CONFIDENTIAL 999-12-3456\n" +
    "Subject: Jane Doe+1-800-555-0199\n\n" +
    "Details: The record marked CONFIDENTIAL contains sensitive information.";
const confidentialFalsePos = getCoords(docBText, "CONFIDENTIAL", 1); // Second occurrence (Case Identifier: CONFIDENTIAL)
const janeDoeName = getCoords(docBText, "Jane Doe", 0);
const janeDoePhone = getCoords(docBText, "+1-800-555-0199", 0);
const docBSpans = [
    {
        id: "b-span-1",
        start: confidentialFalsePos.start,
        end: confidentialFalsePos.end,
        text: "CONFIDENTIAL",
        type: "other",
        confidence: 0.91,
        riskLevel: "low",
        status: "suggested",
        entityGroupId: "confidential_flag"
    },
    {
        id: "b-span-2",
        start: janeDoeName.start,
        end: janeDoeName.end,
        text: "Jane Doe",
        type: "name",
        confidence: 0.96,
        riskLevel: "high",
        status: "suggested",
        entityGroupId: "jane_doe"
    },
    {
        id: "b-span-3",
        start: janeDoePhone.start,
        end: janeDoePhone.end,
        text: "+1-800-555-0199",
        type: "phone",
        confidence: 0.98,
        riskLevel: "high",
        status: "suggested",
        entityGroupId: "phone_800_555_0199"
    }
];
exports.initialDocuments = [
    {
        id: "doc-a",
        title: "Document A: Business Letter (Repeat Entity Blind Spot)",
        text: docAText,
        spans: docASpans
    },
    {
        id: "doc-b",
        title: "Document B: Investigation Record (False Positive & Adjacent PII)",
        text: docBText,
        spans: docBSpans
    },
    {
        id: "doc-c-empty",
        title: "Document C: Empty Document State",
        text: "",
        spans: []
    },
    {
        id: "doc-d-clean",
        title: "Document D: No Suggested Redactions",
        text: "This document is clean and has absolutely no sensitive identifiers contained in it.",
        spans: []
    }
];
