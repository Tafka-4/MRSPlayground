class CommentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CommentError";
    }
}

class CommentNotFoundError extends CommentError {
    constructor(message: string) {
        super(message);
        this.name = "CommentNotFoundError";
    }
}

class CommentUploadFailedError extends CommentError {
    constructor(message: string) {
        super(message);
        this.name = "CommentUploadFailedError";
    }
}

class CommentInteractionFailedError extends CommentError {
    constructor(message: string) {
        super(message);
        this.name = "CommentInteractionFailedError";
    }
}

class CommentDeleteFailedError extends CommentError {
    constructor(message: string) {
        super(message);
        this.name = "CommentDeleteFailedError";
    }
}

class CommentNotAuthorError extends CommentError {
    constructor(message: string) {
        super(message);
        this.name = "CommentNotAuthorError";
    }
}

export default {
    CommentError,
    CommentNotFoundError,
    CommentUploadFailedError,
    CommentInteractionFailedError,
    CommentDeleteFailedError,
    CommentNotAuthorError,
};




