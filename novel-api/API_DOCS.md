## Novel API

Base URL: `/api/v1/novels`

Authentication: Bearer JWT required for mutating endpoints.

### POST /
- Create a novel
- Auth: required
- Body: `{ title: string, description: string, thumbnailImage?: string }`
- 201: `{ success: true, novel }`

### GET /:novelId
- Get novel by id
- 200: `{ success: true, novel }`

### PUT /:novelId
- Update novel title/description
- Auth: required
- Body: `{ title?: string, description?: string }`
- 200: `{ success: true, novel }`

### DELETE /:novelId
- Delete novel by author
- Auth: required
- 200: `{ success: true, message }`

### POST /:novelId/like | /:novelId/dislike | /:novelId/favorite
- Interactions
- Auth: required
- 200: `{ success: true, ... }`

### PUT /:novelId/thumbnail-image
- Upload thumbnail
- Auth: required
- multipart/form-data file `file`
- 200: `{ success: true, location }`

### DELETE /:novelId/thumbnail-image
- Remove thumbnail
- Auth: required
- 200: `{ success: true, message }`

### GET /
- Query novels
- Query: `query?, status?, sort?=createdAt|views|likes|favorites|episodes|recent, limit? (1..100), page?`
- 200: `{ success: true, novels, totalPages, currentPage }`

### GET /author/:author
- List novels by author
- 200: `{ success: true, novels }`

## Episode API

Base URL: `/api/v1/episodes`

### POST /
- Create episode
- Auth: required
- Body: `{ novelId, title, content, authorComment? }`
- 201: `{ success: true, episode }`

### GET /:episodeId
- Get episode and increase view
- 200: `{ success: true, episode }`

### PUT /:episodeId
- Update episode (author only)
- Auth: required
- Body: `{ title?, content?, authorComment? }`
- 200: `{ success: true, episode }`

### DELETE /:episodeId
- Delete last episode only (author)
- Auth: required
- 200: `{ success: true, message }`

### POST /:episodeId/like | /:episodeId/dislike
- Auth: required
- 200: `{ success: true, likeCount, dislikeCount }`

## Headers & Auth

- Authorization: `Bearer <JWT>` for all mutating endpoints
- Content-Type: `application/json` unless noted (file upload uses multipart/form-data)

## Examples

### Create Novel

Request

```bash
curl -X POST "https://api.magicresearches.com/api/v1/novels" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Novel",
    "description": "About...",
    "thumbnailImage": ""
  }'
```

Response

```json
{
  "success": true,
  "novel": {
    "novelId": "...",
    "title": "My Novel",
    "description": "About...",
    "author": "user123",
    "status": "ongoing",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### List Novels

```bash
curl "https://api.magicresearches.com/api/v1/novels?query=magic&sort=views&page=1&limit=10"
```

```json
{
  "success": true,
  "novels": [ { "novelId": "...", "title": "..." } ],
  "totalPages": 3,
  "currentPage": 1
}
```

### Create Episode

```bash
curl -X POST "https://api.magicresearches.com/api/v1/episodes" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "<NOVEL_ID>",
    "title": "Episode 1",
    "content": "<p>...</p>",
    "authorComment": "hello"
  }'
```

```json
{
  "success": true,
  "episode": { "episodeId": "...", "episodeNumber": 1, "novelId": "<NOVEL_ID>" }
}
```

### Like Episode

```bash
curl -X POST "https://api.magicresearches.com/api/v1/episodes/<EP_ID>/like" \
  -H "Authorization: Bearer <TOKEN>"
```

```json
{ "success": true, "message": "Episode liked successfully", "likeCount": 10, "dislikeCount": 1 }
```

## Error Codes

- 400 Bad Request: 잘못된 입력, 형식 오류
- 401 Unauthorized: 로그인 필요, 토큰 오류
- 403 Forbidden: 권한 없음(작성자 아님 등)
- 404 Not Found: 대상 없음(소설/에피소드 등)
- 409 Conflict: 중복·상태 충돌(일부 인증/유저 상황)
- 418 Processing Error: 업로드/상호작용 실패 등 도메인 특화 오류
- 500 Internal Server Error: 서버 내부 오류

주요 에러 매핑

- UserError: 401/403/404/409/418/400
- NovelError: 404/403/418/400
- EpisodeError: 404/418/400

