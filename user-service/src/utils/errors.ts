export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export class UserNotValidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotValidPasswordError';
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class UserNotLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotLoginError';
  }
}

export class UserNotAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotAdminError';
  }
}

export class UserTokenVerificationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserTokenVerificationFailedError';
  }
}

export class UserImageUploadFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserImageUploadFailedError';
  }
}

export class UserImageDeleteFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserImageDeleteFailedError';
  }
}

export class UserForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserForbiddenError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthEmailVerifyFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthEmailVerifyFailedError';
  }
}

export class AuthUserAlreadyAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthUserAlreadyAdminError';
  }
} 