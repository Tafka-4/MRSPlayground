## Emoji API

Base URL: `/api/v1/emojis`

Auth: JWT required for all endpoints.

### POST /
- Create emoji package and upload images
- Body: `{ packageName, packageDescription, emojis: File[] }`
- 201: `{ success: true, emojiPackage }`

### GET /:packageId
- Get emoji package
- 200: `{ success: true, emojiPackage }`

### GET /
- List emoji packages
- Query: `limit?, page?, sort?=asc|desc, search?=packageName|author, searchQuery?`
- 200: `{ success: true, emojiPackages }`

### PATCH /:packageId
- Update emoji package meta or add images
- Body: `{ packageName?, packageDescription?, emojis? }`
- 200: `{ success: true, emojiPackage }`

### DELETE /emojis
- Delete specific emojis in a package
- Body: `{ packageId, emojis: string[] }`
- 200: `{ success: true, message }`

### DELETE /:packageId
- Delete emoji package
- 200: `{ success: true, message }`

### GET /favorites
- Get favorite packages (by query or self)
- Query supports `page, limit, sort, order, q, ids`
- 200: `{ success: true, items, meta }`

### GET /favorites/self
- List own favorite packages (by author)
- 200: `{ success: true, items, meta }`

### POST /favorites
- Mark favorite
- Body: `{ packageId }`
- 200: `{ success: true }`

### DELETE /favorites/:packageId
- Unmark favorite
- 200: `{ success: true }`


