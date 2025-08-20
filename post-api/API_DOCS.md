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


