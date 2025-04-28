class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserError";
    }
}

class UserNotFoundError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserNotFoundError";
    }
}

class UserForbiddenError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserForbiddenError";
    }
}

class UserAlreadyExistsEmailError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserAlreadyExistsEmailError";
    }
}

class UserNotValidPasswordError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserNotValidPasswordError";
    }
}

class UserAlreadyLoginError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserAlreadyLoginError";
    }
}

class UserNotLoginError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserNotLoginError";
    }
}

class UserImageUploadFailedError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserImageUploadFailedError";
    }
}

class UserImageDeleteFailedError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserImageDeleteFailedError";
    }
}

class UserTokenVerificationFailedError extends UserError {
    constructor(message: string) {
        super(message);
        this.name = "UserTokenVerificationFailedError";
    }
}

export default {
    UserError,
    UserNotFoundError, 
    UserForbiddenError,
    UserAlreadyExistsEmailError, 
    UserNotValidPasswordError, 
    UserAlreadyLoginError,
    UserNotLoginError,
    UserImageUploadFailedError,
    UserImageDeleteFailedError,
    UserTokenVerificationFailedError,
};
