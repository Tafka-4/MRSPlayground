class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

class AuthEmailSendFailedError extends AuthError {}
class AuthEmailVerifyFailedError extends AuthError {}
class AuthUserAlreadyAdminError extends AuthError {}
class AuthUserNotAdminError extends AuthError {}

export default {
    AuthError,
    AuthEmailSendFailedError,
    AuthEmailVerifyFailedError,
    AuthUserAlreadyAdminError,
    AuthUserNotAdminError
};


