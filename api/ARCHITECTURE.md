# MRS Playground Architecture Overview

## Service Architecture

### 1. API Gateway (`api` - Port 5000)
**MongoDB + Redis**

#### Novel Service (`/novel/v1`)
- `POST /` - 소설 생성 (인증 필요)
- `GET /:novelid` - 소설 조회
- `PUT /:novelid` - 소설 수정 (인증 필요)
- `DELETE /:novelid` - 소설 삭제 (인증 필요)
- `POST /:novelid/like` - 좋아요 (인증 필요)
- `POST /:novelid/dislike` - 좋아요 취소 (인증 필요)
- `POST /:novelid/favorite` - 즐겨찾기 (인증 필요)
- `PUT /:novelid/thumbnail-image` - 썸네일 업로드 (인증 필요)
- `DELETE /:novelid/thumbnail-image` - 썸네일 삭제 (인증 필요)
- `GET /` - 소설 목록
- `GET /author/:author` - 작가별 소설 목록

#### Episode Service (`/episode/v1`)
- `POST /` - 에피소드 생성 (인증 필요)
- `GET /:episodeId` - 에피소드 조회
- `PUT /:episodeId` - 에피소드 수정 (인증 필요)
- `DELETE /:episodeId` - 에피소드 삭제 (인증 필요)
- `POST /:episodeId/like` - 좋아요 (인증 필요)
- `POST /:episodeId/dislike` - 좋아요 취소 (인증 필요)

#### Comment Service (`/comment/v1`)
- `POST /` - 댓글 생성 (인증 필요)
- `GET /` - 댓글 목록
- `GET /:commentId` - 댓글 조회
- `PUT /:commentId` - 댓글 수정 (인증 필요)
- `DELETE /:commentId` - 댓글 삭제 (인증 필요)
- `POST /:commentId/like` - 좋아요 (인증 필요)
- `POST /:commentId/dislike` - 좋아요 취소 (인증 필요)
- `GET /:commentId/replies` - 답글 목록

#### Gallery Service (`/gallery/v1`)
- 갤러리 CRUD 기능

#### Post Service (`/post/v1`)
- 게시글 CRUD 기능

#### Emoji Service (`/emoji/v1`)
- 이모지/반응 관리 기능

### 2. User Service (`user-service` - Port 3001)
**MySQL (userdb, requestdb) + Redis**

#### Auth Routes (`/api/v1/auth`)
- `POST /register` - 회원가입
- `POST /login` - 로그인
- `POST /logout` - 로그아웃
- `POST /refresh` - 토큰 갱신
- `POST /verify-email` - 이메일 인증
- `POST /reset-password` - 비밀번호 재설정

#### User Routes (`/api/v1/users`)
- `GET /` - 사용자 목록
- `GET /:id` - 사용자 조회
- `PUT /:id` - 사용자 수정
- `DELETE /:id` - 사용자 삭제
- `GET /me` - 내 정보
- `PUT /me` - 내 정보 수정

#### Other Routes
- `/api/v1/logs` - 로그 관리
- `/api/v1/contact` - 문의 관리
- `/api/v1/feedback` - 피드백 관리

#### WebSocket
- `/ws/keygen` - 키 생성 실시간 브로드캐스팅
- `/ws/logs` - 로그 실시간 스트리밍

### 3. Frontend Service (`user` - Port 3000)
**Redis**
- EJS 템플릿 기반 서버 사이드 렌더링
- 사용자 인터페이스 제공

### 4. Bot Service (`bot`)
**Discord Bot**
- Discord 통합
- 사용자 인증 연동

## Data Flow

1. **Client → Nginx → Frontend/API**
   - 정적 컨텐츠: `/` → Frontend (Port 3000)
   - API 요청: `/api/*` → User Service (Port 3001)
   - 컨텐츠 API: `/novel/`, `/comment/`, etc → API Gateway (Port 5000)

2. **Authentication Flow**
   - JWT 기반 인증 (accessToken + refreshToken)
   - User Service에서 토큰 발급
   - API Gateway에서 토큰 검증 후 요청 전달

3. **Data Storage**
   - User/Auth 데이터: MySQL (userdb)
   - Request 추적: MySQL (requestdb)
   - 컨텐츠 데이터: MongoDB
   - 세션/캐시: Redis

## Response Format
```json
{
    "code": 200,
    "message": "성공",
    "data": {},
    "details": {}
}
```

## Rate Limiting
- 모든 API에 rate limiting 적용
- Redis 기반 요청 횟수 추적

## Security
- JWT 토큰 인증
- CORS 설정
- Request ID 추적
- SQL Injection 방어
- XSS 방어 (HTML 이스케이핑)