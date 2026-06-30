"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.validateDecisionsPayload = validateDecisionsPayload;
// Global error handler middleware
function errorHandler(err, req, res, _next) {
    console.error(`[Error Handler] ${err.stack || err.message}`);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
}
// Request validation helper
function validateDecisionsPayload(req, res, next) {
    const { decisions } = req.body;
    if (!decisions || !Array.isArray(decisions)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid payload: "decisions" field must be an array of updates.'
        });
    }
    for (const item of decisions) {
        if (!item.id || typeof item.id !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid decision item: "id" must be a string.'
            });
        }
        if (!item.status || !['suggested', 'accepted', 'rejected'].includes(item.status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid decision item status for ID ${item.id}: status must be suggested, accepted, or rejected.`
            });
        }
    }
    next();
}
