/*
<@packageId:emojiId:small>
=>
<img src="uploads/emojis/packageId/emojiId.extension" alt="emojiId" width="200" height="200" />

<@packageId:emojiId:large>
=>
<img src="uploads/emojis/packageId/emojiId.extension" alt="emojiId" width="400" height="400" />
*/

import EmojiPackage from "../model/emojiModel.js";
import commentError from "./error/commentError.js";

export const parseEmojiToImgTag = async (content: string, isComment: boolean = false) => {
    const regex = /<@packageId:emojiId:small>|large>/g;
    const matches = content.match(regex);
    if (!matches) {
        return content;
    }
    if (isComment && matches.length > 2) {
        throw new commentError.CommentInteractionFailedError("Comment cannot contain more than 2 emojis");
    }
    for (const match of matches) {
        const [packageId, emojiId, size] = match.split(":");
        const emoji = await EmojiPackage.findOne({ packageId });
        if (!emoji) {
            continue;
        }
        const objectKeys = Object.keys(emoji.packageEmojis);
        if (!objectKeys.includes(emojiId)) {
            continue;
        }
        const location = emoji.packageEmojis[objectKeys.findIndex(key => key === emojiId)];
        if (size === "small") {
            content = content.replace(match, `<img src="${location}" alt="${emojiId}" width="200" height="200" />`);
        } else if (size === "large") {
            content = content.replace(match, `<img src="${location}" alt="${emojiId}" width="400" height="400" />`);
        }
    }
    return content;
};




