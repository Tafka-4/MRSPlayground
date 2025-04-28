class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthError";
    }
}

class AuthEmailSendFailedError extends AuthError {
    constructor(message: string) {
        super(message);
        this.name = "AuthEmailSendFailedError";
    }
}

class AuthEmailVerifyFailedError extends AuthError {
    constructor(message: string) {
        super(message);
        this.name = "AuthEmailVerifyFailedError";
    }
}

class AuthUserAlreadyAdminError extends AuthError {
    constructor(message: string) {
        super(message);
        this.name = "AuthUserAlreadyAdminError";
    }
}

class AuthUserNotAdminError extends AuthError {
    constructor(message: string) {
        super(message);
        this.name = "AuthUserNotAdminError";
    }
}

export default {
    AuthError,
    AuthEmailSendFailedError,
    AuthEmailVerifyFailedError,
    AuthUserAlreadyAdminError,
    AuthUserNotAdminError,
};



