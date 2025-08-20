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


