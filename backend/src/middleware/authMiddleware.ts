import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Token de autenticación requerido.'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new HttpError(401, 'Token de autenticación vacío.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { sub?: string; type?: string };
    if (!decoded.sub || decoded.type !== 'access') {
      next(new HttpError(401, 'Token inválido.'));
      return;
    }
    req.userId = decoded.sub;
    next();
  } catch {
    next(new HttpError(401, 'Token expirado o inválido.'));
  }
}
