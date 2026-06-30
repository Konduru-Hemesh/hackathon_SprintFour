"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentService_1 = require("../services/documentService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/documents
 * @desc    Get a summary list of all available documents.
 * @req     None
 * @res     200 OK: Array of Document summaries (id, title, textLength, totalSpans, unreviewedSpans)
 * @error   500 Internal Server Error
 */
router.get('/documents', (req, res, next) => {
    try {
        const list = documentService_1.documentService.getDocuments();
        res.json(list);
    }
    catch (err) {
        next(err);
    }
});
/**
 * @route   GET /api/documents/:id
 * @desc    Get the full document object including its text and redaction spans by ID.
 * @req     Params: id
 * @res     200 OK: Full Document object (id, title, text, spans)
 * @error   404 Not Found: If document ID does not exist
 *          500 Internal Server Error
 */
router.get('/documents/:id', (req, res, next) => {
    try {
        const doc = documentService_1.documentService.getDocumentById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        res.json(doc);
    }
    catch (err) {
        next(err);
    }
});
/**
 * @route   POST /api/documents/:id/decisions
 * @desc    Apply status decisions (accept/reject) to spans and dynamically add new spans.
 * @req     Params: id
 *          Body: {
 *            decisions: Array<{
 *              id: string;
 *              status: 'suggested' | 'accepted' | 'rejected';
 *              start?: number;
 *              end?: number;
 *              text?: string;
 *              type?: string;
 *              confidence?: number;
 *              riskLevel?: string;
 *              entityGroupId?: string;
 *            }>
 *          }
 * @res     200 OK: { success: true, spans: Array<RedactionSpan> } (updated list of spans)
 * @error   400 Bad Request: Missing decisions, invalid status, coordinate out-of-bounds, or overlaps
 *          404 Not Found: Document not found
 *          500 Internal Server Error
 */
router.post('/documents/:id/decisions', errorHandler_1.validateDecisionsPayload, (req, res, next) => {
    try {
        const result = documentService_1.documentService.updateDecisions(req.params.id, req.body.decisions);
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({ success: true, spans: result.spans });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
