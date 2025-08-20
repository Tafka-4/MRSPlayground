## Gallery API

Base URL: `/api/v1/galleries`

Auth: JWT required for all endpoints.

### POST /
- Create gallery
- Body: `{ galleryId, title, description }`
- 201: `{ success: true, message }`

### GET /:galleryId
- Get gallery
- 200: `{ success: true, gallery }`

### GET /
- List galleries
- Query: `page?, limit?, search?`
- 200: `{ success: true, galleries }`

### PUT /:galleryId | DELETE /:galleryId
- Update/Delete (admin only)
- 200: `{ success: true, message }`

### POST /:galleryId/subscribe | DELETE /:galleryId/subscribe
- Subscribe/Unsubscribe
- 200: `{ success: true, message }`

### PUT /:galleryId/admin
- Change admin
- Body: `{ admin }`
- 200: `{ success: true, message }`

### POST /:galleryId/manager | DELETE /:galleryId/manager
- Add/Delete manager
- Body: `{ manager }`
- 200: `{ success: true, message }`

### POST /:galleryId/thumbnail | DELETE /:galleryId/thumbnail
- Upload/Delete thumbnail
- 200: `{ success: true, message }`

### POST /:galleryId/block-user | DELETE /:galleryId/block-user
- Add/Delete blocked user
- Body: `{ userid, time? }`
- 200: `{ success: true, message }`

### POST /:galleryId/block-ip | DELETE /:galleryId/block-ip
- Add/Delete blocked IP
- Body: `{ ip, time? }`
- 200: `{ success: true, message }`

## Headers & Auth

- Authorization: `Bearer <JWT>` (필수)
- Content-Type: `application/json`

## Examples

### Create Gallery

```bash
curl -X POST "https://api.magicresearches.com/api/v1/galleries" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "galleryId": "gal-1", "title": "Title", "description": "Desc" }'
```

```json
{ "success": true, "message": "Gallery created successfully" }
```

### List Galleries

```bash
curl "https://api.magicresearches.com/api/v1/galleries?page=1&limit=10&search=art" -H "Authorization: Bearer <TOKEN>"
```

```json
{ "success": true, "galleries": [ { "galleryId": "gal-1" } ] }
```

## Error Codes

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden (관리자/매니저 권한 필요 등)
- 404 Not Found
- 418 Processing Error
- 500 Internal Server Error

