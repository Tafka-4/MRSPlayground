class EmojiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmojiError';
  }
}

class EmojiNotFoundError extends EmojiError {}
class EmojiPackageNotFoundError extends EmojiError {}
class EmojiInvalidExtensionError extends EmojiError {}
class EmojiUploadFailedError extends EmojiError {}
class EmojiDeleteFailedError extends EmojiError {}

export default {
  EmojiError,
  EmojiNotFoundError,
  EmojiPackageNotFoundError,
  EmojiInvalidExtensionError,
  EmojiUploadFailedError,
  EmojiDeleteFailedError
};


