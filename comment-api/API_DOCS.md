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

## Headers & Auth

- Authorization: `Bearer <JWT>` for mutating endpoints
- Content-Type: `application/json`

## Examples

### Create Comment

```bash
curl -X POST "https://api.magicresearches.com/api/v1/comments" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "galleryId": "gal-1",
    "targetId": "<POST_ID>",
    "targetType": "post",
    "content": "nice post!",
    "isHidden": false
  }'
```

```json
{ "success": true, "comment": { "commentId": "...", "commentTargetId": "<POST_ID>" } }
```

### Get Replies (Pagination)

```bash
curl "https://api.magicresearches.com/api/v1/comments/<COMMENT_ID>/replies?page=1&limit=20&sort=latest"
```

```json
{
  "success": true,
  "comments": [ { "commentId": "..." } ],
  "pagination": { "currentPage": 1, "totalPages": 3, "totalComments": 50, "hasNext": true, "hasPrev": false }
}
```

## Error Codes

- 400 Bad Request (형식 오류, 삭제된 댓글 수정 등)
- 401 Unauthorized (로그인 필요)
- 403 Forbidden (권한 없음)
- 404 Not Found (댓글/대상 없음)
- 418 Processing Error (도메인 특화 실패)
- 500 Internal Server Error

