class PostError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PostError";
    }
}

class PostNotFoundError extends PostError {
    constructor(message: string) {
        super(message);
        this.name = "PostNotFoundError";
    }
}

class PostUploadFailedError extends PostError {
    constructor(message: string) {
        super(message);
        this.name = "PostUploadFailedError";
    }
}

class PostInteractionFailedError extends PostError {
    constructor(message: string) {
        super(message);
        this.name = "PostInteractionFailedError";
    }
}

class PostDeleteFailedError extends PostError {
    constructor(message: string) {
        super(message);
        this.name = "PostDeleteFailedError";
    }
}

class PostNotAuthorError extends PostError {
    constructor(message: string) {
        super(message);
        this.name = "PostNotAuthorError";
    }
}

export default {
    PostError,
    PostNotFoundError,
    PostUploadFailedError,
    PostInteractionFailedError,
    PostDeleteFailedError,
    PostNotAuthorError,
};




