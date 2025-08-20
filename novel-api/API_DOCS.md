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


