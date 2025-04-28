class EmojiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EmojiError";
    }
}

class EmojiInvalidExtensionError extends EmojiError {
    constructor(message: string) {
        super(message);
        this.name = "EmojiInvalidExtensionError";
    }
}

class EmojiUploadFailedError extends EmojiError {
    constructor(message: string) {
        super(message);
        this.name = "EmojiUploadFailedError";
    }
}

class EmojiDeleteFailedError extends EmojiError {
    constructor(message: string) {
        super(message);
        this.name = "EmojiDeleteFailedError";
    }
}

class EmojiPackageNotFoundError extends EmojiError {
    constructor(message: string) {
        super(message);
        this.name = "EmojiPackageNotFoundError";
    }
}

class EmojiNotFoundError extends EmojiError {
    constructor(message: string) {
        super(message);
        this.name = "EmojiNotFoundError";
    }
}

export default {
    EmojiError,
    EmojiInvalidExtensionError,
    EmojiUploadFailedError,
    EmojiDeleteFailedError,
    EmojiPackageNotFoundError,
    EmojiNotFoundError
}; 