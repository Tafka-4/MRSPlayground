import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);

  if (err.name === 'UserNotLoginError' || 
      err.name === 'UserTokenVerificationFailedError') {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err.name === 'UserForbiddenError') {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err.name === 'UserNotFoundError') {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err.name === 'UserError' || 
      err.name === 'UserNotValidPasswordError' || 
      err.name === 'UserImageDeleteFailedError' || 
      err.name === 'UserImageUploadFailedError' || 
      err.name === 'AuthError' ||
      err.name === 'AuthEmailVerifyFailedError' ||
      err.name === 'AuthUserAlreadyAdminError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}; 