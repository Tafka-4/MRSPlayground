import { NextFunction, Request, Response } from 'express';

const allowedTypes = new Set(['post', 'episode']);

export const sanitizeTargetValidation = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const targetType = (req.params as any).targetType || (req.query as any).targetType || (req.body as any).targetType;
    const targetId = (req.params as any).targetId || (req.query as any).targetId || (req.body as any).targetId;
    if (targetType && !allowedTypes.has(String(targetType))) {
      return res.status(400).json({ message: 'Invalid target type' });
    }
    if (targetId && !/^[a-zA-Z0-9-_]{1,128}$/.test(String(targetId))) {
      return res.status(400).json({ message: 'Invalid target id' });
    }
  }
  next();
};


