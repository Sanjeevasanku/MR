import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
  });
  next();
}
