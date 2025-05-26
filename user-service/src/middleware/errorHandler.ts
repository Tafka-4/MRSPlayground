import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);

  if (err.name === 'UserError' || 
      err.name === 'UserNotValidPasswordError' || 
      err.name === 'UserNotFoundError' || 
      err.name === 'UserNotLoginError' || 
      err.name === 'UserForbiddenError' || 
      err.name === 'UserImageDeleteFailedError' || 
      err.name === 'UserImageUploadFailedError' || 
      err.name === 'UserTokenVerificationFailedError' ||
      err.name === 'AuthError' ||
      err.name === 'AuthEmailVerifyFailedError' ||
      err.name === 'AuthUserAlreadyAdminError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}; 