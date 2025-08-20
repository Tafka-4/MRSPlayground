## Comment API

Base URL: `/api/v1/comments`

Auth: JWT required for mutating endpoints; some reads open.

### POST /
- Create comment
- Body: `{ galleryId? string, novelId? string, targetId: string, targetType: 'post'|'episode', content: string, parentId?: string, isHidden: boolean, tempPassword?: string }`
- 201: `{ success: true, comment }`

### GET /
- List comments by target
- Query: `{ galleryId?, novelId?, targetId, targetType, page?, limit? }`
- 200: `{ success: true, comments }`

### GET /:commentId
- Get single comment
- 200: `{ success: true, comment }`

### PUT /:commentId
- Update comment (author only; not deleted; hidden requires temp password)
- Body: `{ content }`
- 200: `{ success: true, message }`

### DELETE /:commentId
- Delete (author, gallery manager/admin for gallery thread, or novel author for novel thread)
- 200: `{ success: true, message }`

### POST /:commentId/like | /:commentId/dislike
- Interaction
- 200: `{ success: true, message }`

### GET /:commentId/replies
- Paginated replies
- Query: `page?, limit?, sort?=latest|oldest|likes`
- 200: `{ success: true, comments, pagination }`


