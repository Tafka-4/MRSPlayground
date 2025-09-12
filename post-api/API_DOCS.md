## Post API

Base URL: `/api/v1/posts`

Auth: Bearer JWT required for all endpoints.

### POST /
- Create post
- Body: `{ galleryId, title, content, isHidden: boolean, tempPassword? }`
- 201: `{ success: true, post }`

### GET /:galleryId
- List posts in a gallery
- Query: `page?, limit?`
- 200: `{ success: true, posts }`

### GET /:galleryId/:postId
- Get post in gallery
- 200: `{ success: true, post }`

### GET /id/:postId
- Get post by postId only
- 200: `{ success: true, post }`

### PUT /:galleryId/:postId/:tempPassword?
- Update post (author or with temp password for hidden)
- Body: `{ title, content }`
- 200: `{ success: true, post }`

### DELETE /:galleryId/:postId/:tempPassword?
- Delete post (author, or gallery admin/manager)
- 200: `{ success: true, message }`

### POST /:galleryId/:postId/like | /:galleryId/:postId/dislike
- Interactions
- 200: `{ success: true, message }`

## Headers & Auth

- Authorization: `Bearer <JWT>` (필수)
- Content-Type: `application/json`

## Examples

### Create Post

```bash
curl -X POST "https://api.magicresearches.com/api/v1/posts" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "galleryId": "gal-1",
    "title": "Hello",
    "content": "<p>World</p>",
    "isHidden": false
  }'
```

```json
{ "success": true, "post": { "postId": "...", "galleryId": "gal-1" } }
```

### List Posts in Gallery

```bash
curl "https://api.magicresearches.com/api/v1/posts/gal-1?page=1&limit=10" -H "Authorization: Bearer <TOKEN>"
```

```json
{ "success": true, "posts": [ { "postId": "..." } ] }
```

## Error Codes

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 418 Processing Error
- 500 Internal Server Error

