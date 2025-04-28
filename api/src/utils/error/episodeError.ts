class EpisodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EpisodeError";
    }
}

class EpisodeNotFoundError extends EpisodeError {
    constructor(message: string) {
        super(message);
        this.name = "EpisodeNotFoundError";
    }
}

class EpisodeInteractionFailedError extends EpisodeError {
    constructor(message: string) {
        super(message);
        this.name = "EpisodeInteractionFailedError";
    }
}

class EpisodeUploadFailedError extends EpisodeError {
    constructor(message: string) {
        super(message);
        this.name = "EpisodeUploadFailedError";
    }
}

class EpisodeDeleteFailedError extends EpisodeError {
    constructor(message: string) {
        super(message);
        this.name = "EpisodeDeleteFailedError";
    }
}

export default {
    EpisodeError,
    EpisodeNotFoundError,
    EpisodeInteractionFailedError,
    EpisodeUploadFailedError,
    EpisodeDeleteFailedError,
};
