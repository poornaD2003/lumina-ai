import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err.message);

  // Check for Zod validation errors
  if (err.name === 'ZodError' && 'issues' in err) {
    const zodErr = err as any;
    return res.status(400).json({
      error: 'Validation Error',
      details: zodErr.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}
