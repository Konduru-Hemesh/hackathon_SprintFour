import { Request, Response, NextFunction } from 'express';

// Global error handler middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`[Error Handler] ${err.stack || err.message}`);
  
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
}

// Request validation helper
export function validateDecisionsPayload(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
