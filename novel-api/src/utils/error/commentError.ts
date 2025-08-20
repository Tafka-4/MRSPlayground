class CommentError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CommentError';
    }
}

class CommentNotFoundError extends CommentError {}
class CommentInteractionFailedError extends CommentError {}
class CommentUploadFailedError extends CommentError {}
class CommentDeleteFailedError extends CommentError {}
class CommentNotAuthorError extends CommentError {}

export default {
    CommentError,
    CommentNotFoundError,
    CommentInteractionFailedError,
    CommentUploadFailedError,
    CommentDeleteFailedError,
    CommentNotAuthorError
};


