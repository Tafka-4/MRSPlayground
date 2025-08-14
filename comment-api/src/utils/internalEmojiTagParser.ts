import commentError from './error/commentError.js';

const callEmojiApi = async (endpoint: string, options: RequestInit = {}) => {
	const base = process.env.EMOJI_API_URL || 'http://emoji-api:5005';
	const response = await fetch(`${base}${endpoint}`, {
		headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
		...options
	});
	return response;
};

export const parseEmojiToImgTag = async (content: string, isComment: boolean = false) => {
	const regex = /<@packageId:emojiId:(small|large)>/g;
	const matches = content.match(regex);
	if (!matches) return content;
	if (isComment && matches.length > 2) throw new commentError.CommentInteractionFailedError('Comment cannot contain more than 2 emojis');
	for (const match of matches) {
		const normalized = match.replace('<@', '').replace('>', '');
		const [packageId, emojiId, size] = normalized.split(':');
		const resp = await callEmojiApi(`/emoji/v1/${packageId}`);
		if (!resp.ok) continue;
		const pkg = await resp.json();
		const objectKeys: string[] = Object.keys(pkg.packageEmojis || {});
		if (!objectKeys.includes(emojiId)) continue;
		const location = pkg.packageEmojis[objectKeys.findIndex((key: string) => key === emojiId)];
		if (size === 'small') content = content.replace(match, `<img src="${location}" alt="${emojiId}" width="200" height="200" />`);
		else if (size === 'large') content = content.replace(match, `<img src="${location}" alt="${emojiId}" width="400" height="400" />`);
	}
	return content;
};


