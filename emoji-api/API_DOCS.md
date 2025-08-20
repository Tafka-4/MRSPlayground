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

## Headers & Auth

- Authorization: `Bearer <JWT>` (필수)
- Content-Type: `application/json` (파일 업로드 제외)

## Examples

### Create Emoji Package

```bash
curl -X POST "https://api.magicresearches.com/api/v1/emojis" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "packageName=Funny" \
  -F "packageDescription=desc" \
  -F "emojis=@emoji1.png" -F "emojis=@emoji2.png"
```

```json
{ "success": true, "emojiPackage": { "packageId": "...", "packageName": "Funny" } }
```

### List Favorite Emoji Packages (Self)

```bash
curl "https://api.magicresearches.com/api/v1/emojis/favorites/self?page=1&limit=10" -H "Authorization: Bearer <TOKEN>"
```

```json
{ "success": true, "items": [ { "packageId": "..." } ], "meta": { "page": 1, "limit": 10, "total": 20, "pages": 2 } }
```

## Error Codes

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found (이모지 패키지 없음)
- 418 Processing Error (업로드/검증 실패 등)
- 500 Internal Server Error

