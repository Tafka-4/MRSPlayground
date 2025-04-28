class NovelError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NovelError";
    }
}

class NovelNotFoundError extends NovelError {
    constructor(message: string) {
        super(message);
        this.name = "NovelNotFoundError";
    }
}

class NovelNotAuthorError extends NovelError {
    constructor(message: string) {
        super(message);
        this.name = "NovelNotAuthorError";
    }
}

class NovelInteractionFailedError extends NovelError {
    constructor(message: string) {
        super(message);
        this.name = "NovelInteractionFailedError";
    }
}

class NovelImageUploadFailedError extends NovelError {
    constructor(message: string) {
        super(message);
        this.name = "NovelImageUploadFailedError";
    }
}

class NovelImageDeleteFailedError extends NovelError {
    constructor(message: string) {
        super(message);
        this.name = "NovelImageDeleteFailedError";
    }
}

export default {
    NovelError,
    NovelNotFoundError,
    NovelNotAuthorError,
    NovelInteractionFailedError,
    NovelImageUploadFailedError,
    NovelImageDeleteFailedError,
};



