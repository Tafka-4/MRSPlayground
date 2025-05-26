# MRS Playground - Microservices Architecture with Nginx

Nginx 리버스 프록시를 통해 통합된 마이크로서비스 아키텍처로 구성된 소설 플랫폼 프로젝트입니다.

## 🏗️ 아키텍처

### 서비스 구성

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │◄──►│  Nginx Proxy    │◄──►│   Frontend      │
│   (Browser)     │    │   (Port 80)     │    │   (Port 3000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ├─────────────────────────────────┐
                                │                                 │
                                ▼                                 ▼
                       ┌─────────────────┐              ┌─────────────────┐
                       │  API Gateway    │              │  User Service   │
                       │   (Port 5000)   │              │   (Port 3001)   │
                       └─────────────────┘              └─────────────────┘
                                │                                 │
                                ▼                                 ▼
                       ┌─────────────────┐              ┌─────────────────┐
                       │    MongoDB      │              │     MySQL       │
                       │  (기타 서비스)    │              │   (userdb)      │
                       └─────────────────┘              └─────────────────┘
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │     Redis       │
                                                         │  (세션 관리)     │
                                                         └─────────────────┘
```

1. **Nginx Reverse Proxy**
   - 포트: 80 (HTTP), 443 (HTTPS)
   - 역할: 단일 진입점, 로드 밸런싱, SSL 종료, 정적 파일 서빙
   - 기능: Rate limiting, Security headers, Gzip compression

2. **Frontend** (`user/`)
   - 포트: 3000 (내부)
   - 역할: 사용자 인터페이스
   - 접근: `http://localhost/`

3. **API Gateway** (`api/`)
   - 포트: 5000 (내부)
   - 역할: 소설, 갤러리, 포스트 등 메인 API 서비스
   - 접근: `http://localhost/api/novel/v1/*`, `http://localhost/api/gallery/v1/*` 등

4. **User Service** (`user-service/`)
   - 포트: 3001 (내부)
   - 역할: 사용자 관리, 인증, 권한 관리
   - 접근: `http://localhost/api/user/*`, `http://localhost/api/auth/*`

### 데이터베이스

- **MySQL** (userdb): User Service 전용 데이터베이스
- **Redis**: 세션 관리, 캐싱
- **MongoDB**: 기타 서비스용 (소설, 갤러리, 포스트 등)

## 🚀 실행 방법

### Docker Compose로 전체 시스템 실행

```bash
# 전체 시스템 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f nginx
docker-compose logs -f user-service
```

### 개별 서비스 개발 모드 실행

```bash
# 데이터베이스 서비스만 시작
docker-compose up -d userdb redis mongodb

# User Service 개발 모드
cd user-service
npm install
npm run dev

# API Gateway 개발 모드
cd api
npm install
npm run dev

# Frontend 개발 모드
cd user
npm install
npm run dev
```

## 📡 API 엔드포인트

### 통합 접근 (Nginx를 통한 단일 진입점)

**Base URL**: `http://localhost`

#### Frontend
- `GET /` - 메인 페이지
- `GET /login` - 로그인 페이지
- `GET /register` - 회원가입 페이지

#### User & Auth API
- `POST /api/user/register` - 사용자 등록
- `POST /api/user/login` - 로그인
- `POST /api/user/logout` - 로그아웃
- `POST /api/user/refresh` - 토큰 갱신
- `GET /api/user/:userid` - 사용자 정보 조회
- `GET /api/user/` - 사용자 목록 조회
- `PUT /api/user/update` - 사용자 정보 수정
- `DELETE /api/user/delete` - 사용자 삭제

#### Auth API
- `POST /api/auth/send-verification` - 이메일 인증 코드 발송
- `POST /api/auth/verify-email` - 이메일 인증
- `PUT /api/auth/change-email` - 이메일 변경
- `PUT /api/auth/change-password` - 비밀번호 변경
- `POST /api/auth/reset-password-send` - 비밀번호 재설정 이메일 발송
- `POST /api/auth/reset-password` - 비밀번호 재설정
- `POST /api/auth/set-admin` - 관리자 권한 부여

#### Main API (소설, 갤러리 등)
- `GET /api/novel/v1/*` - 소설 관련 API
- `GET /api/gallery/v1/*` - 갤러리 관련 API
- `GET /api/post/v1/*` - 포스트 관련 API
- `GET /api/comment/v1/*` - 댓글 관련 API
- `GET /api/episode/v1/*` - 에피소드 관련 API
- `GET /api/emoji/v1/*` - 이모지 관련 API

#### Health Checks
- `GET /health` - Nginx 상태 확인
- `GET /api/health` - API Gateway 상태 확인
- `GET /api/users/health` - User Service 상태 확인

## 🔧 환경 변수

환경 변수 설정을 위해 `env.example` 파일을 참고하여 각 서비스에 맞는 `.env` 파일을 생성하세요.

### 주요 환경 변수

```env
# Database
DB_HOST=userdb
DB_USER=root
DB_PASSWORD=root
DB_NAME=userapi

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
```

## 📁 프로젝트 구조

```
MRSPlayground/
├── nginx/                  # Nginx 리버스 프록시
│   ├── nginx.conf          # Nginx 설정
│   └── logs/               # Nginx 로그
├── api/                    # API Gateway
│   ├── src/
│   │   ├── controller/     # 기타 서비스 컨트롤러
│   │   ├── router/         # 라우터
│   │   ├── model/          # MongoDB 모델
│   │   └── utils/          # 유틸리티
│   ├── Dockerfile
│   └── package.json
├── user-service/           # User & Auth Microservice
│   ├── src/
│   │   ├── config/         # 데이터베이스, Redis 설정
│   │   ├── controllers/    # 컨트롤러
│   │   ├── models/         # MySQL 모델
│   │   ├── routes/         # 라우터
│   │   ├── middleware/     # 미들웨어
│   │   └── utils/          # 유틸리티
│   ├── uploads/            # 업로드 파일
│   ├── Dockerfile
│   └── package.json
├── user/                   # Frontend
├── mysql/                  # MySQL 초기화
│   └── init/
│       └── 01-init.sql     # 데이터베이스 초기화 스크립트
├── docker-compose.yml      # 전체 시스템 구성
├── env.example             # 환경 변수 예시
└── README.md
```

## 🔄 마이그레이션 내용

### Nginx 리버스 프록시 추가
- 단일 진입점 (포트 80) 제공
- Rate limiting 및 보안 헤더 적용
- Gzip 압축 및 정적 파일 캐싱
- 서비스별 라우팅 및 로드 밸런싱

### MongoDB → MySQL 변경사항
- User 모델을 MongoDB에서 MySQL로 마이그레이션
- Mongoose 스키마를 MySQL 테이블 구조로 변경
- JSON 필드를 활용하여 배열 데이터 저장

### MSA 분리 내용
- User/Auth 관련 기능을 독립적인 마이크로서비스로 분리
- Nginx를 통한 API Gateway 패턴 적용
- 서비스 간 내부 네트워크 통신

## 🛠️ 개발 도구

- **Nginx**: 리버스 프록시, 로드 밸런서
- **Docker & Docker Compose**: 컨테이너화
- **TypeScript**: 타입 안전성
- **MySQL**: 관계형 데이터베이스
- **Redis**: 인메모리 데이터베이스
- **MongoDB**: 문서형 데이터베이스
- **JWT**: 인증 토큰
- **bcrypt**: 비밀번호 암호화

## 🔒 보안 기능

- Rate limiting (API: 10req/s, Auth: 5req/s)
- Security headers (XSS, CSRF, Content-Type 보호)
- CORS 설정
- JWT 기반 인증
- 비밀번호 해싱 (bcrypt)

## 📊 모니터링

- Nginx 액세스/에러 로그
- 각 서비스별 Health check 엔드포인트
- Docker 컨테이너 상태 모니터링

```bash
# 서비스 상태 확인
curl http://localhost/health
curl http://localhost/api/health
curl http://localhost/api/users/health

# 로그 모니터링
docker-compose logs -f nginx
docker-compose logs -f user-service
docker-compose logs -f api
```
