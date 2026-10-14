export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message); this.status = status; this.code = code; this.details = details;
  }
}
export function asyncHandler(fn) {
  return (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
}
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number(err.status) || 500;
  if (status >= 500) console.error({ requestId: req.id, error: err.message });
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.id
    }
  });
}
