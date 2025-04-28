class GalleryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GalleryError";
    }
}

class GalleryNotFoundError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryNotFoundError";
    }
}

class GalleryImageUploadFailedError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryImageUploadFailedError";
    }
}

class GalleryImageDeleteFailedError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryImageDeleteFailedError";
    }
}

class GalleryInteractionFailedError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryInteractionFailedError";
    }
}

class GalleryIsNotAdminError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryIsNotAdminError";
    }
}

class GalleryIsNotManagerError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryIsNotManagerError";
    }
}

class GalleryIsNotSubscribedError extends GalleryError {
    constructor(message: string) {
        super(message);
        this.name = "GalleryIsNotSubscribedError";
    }
}

export default {
    GalleryError,
    GalleryNotFoundError,
    GalleryImageUploadFailedError,
    GalleryImageDeleteFailedError,
    GalleryInteractionFailedError,
    GalleryIsNotAdminError,
    GalleryIsNotManagerError,
    GalleryIsNotSubscribedError,
};