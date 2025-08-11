class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

class UserNotLoginError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotLoginError';
  }
}

class UserTokenVerificationFailedError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = 'UserTokenVerificationFailedError';
  }
}

class UserForbiddenError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = 'UserForbiddenError';
  }
}

class UserNotFoundError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

class UserAlreadyExistsEmailError extends UserError {}
class UserNotValidPasswordError extends UserError {}
class UserAlreadyLoginError extends UserError {}
class UserImageUploadFailedError extends UserError {}
class UserImageDeleteFailedError extends UserError {}

export default {
  UserError,
  UserNotLoginError,
  UserTokenVerificationFailedError,
  UserForbiddenError,
  UserNotFoundError,
  UserAlreadyExistsEmailError,
  UserNotValidPasswordError,
  UserAlreadyLoginError,
  UserImageUploadFailedError,
  UserImageDeleteFailedError
};


