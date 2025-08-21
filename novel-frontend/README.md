# Novel Frontend Service

마법연구회 아카이브 프론트엔드 서비스

## 개요

Novel Frontend는 마법연구회 플랫폼의 소설 아카이브 기능을 제공하는 EJS 기반 서버 사이드 렌더링 프론트엔드 서비스입니다.

## 기술 스택

- **Template Engine**: EJS
- **Language**: TypeScript
- **Framework**: Express.js
- **Styling**: Vanilla CSS
- **JavaScript**: Vanilla JS (ES6+)
- **Cache**: Redis

## 주요 기능

- 소설 목록 조회 및 검색
- 소설 상세 정보 표시
- 에피소드 읽기
- 댓글 시스템
- 좋아요/북마크 기능
- 내 서재 관리
- 랭킹 시스템
- 신고 기능

## 환경 변수

```env
PORT=3002
NODE_ENV=development
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password
```

## 설치 및 실행

### 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 프로덕션 환경

```bash
# 빌드
npm run build

# 서버 실행
npm start
```

### Docker

```bash
# 이미지 빌드
docker build -t novel-frontend .

# 컨테이너 실행
docker run -p 3002:3002 novel-frontend
```

## 라우트 구조

| 경로 | 설명 | 인증 필요 |
|------|------|----------|
| `/` | 홈페이지 | X |
| `/novels` | 소설 목록 | X |
| `/search` | 검색 페이지 | X |
| `/rank` | 랭킹 페이지 | X |
| `/library` | 내 서재 | O |
| `/mypage` | 마이페이지 | O |
| `/novel/upload` | 소설 업로드 | O |
| `/novel/:uuid` | 소설 상세 | X |
| `/novel/:uuid/edit` | 소설 수정 | O |
| `/novel/:uuid/comment` | 소설 댓글 | X |
| `/novel/:uuid/episode/upload` | 에피소드 업로드 | O |
| `/novel/:uuid/episode/:episodeId` | 에피소드 읽기 | X |
| `/novel/:uuid/episode/:episodeId/edit` | 에피소드 수정 | O |
| `/novel/:uuid/episode/:episodeId/comment` | 에피소드 댓글 | X |
| `/novel/:uuid/notice/upload` | 공지 작성 | O |
| `/novel/:uuid/notice/:noticeId` | 공지 상세 | X |
| `/novel/:uuid/notice/:noticeId/edit` | 공지 수정 | O |
| `/novel/:uuid/notice/:noticeId/comment` | 공지 댓글 | X |

## API 통신

모든 API 호출은 `/public/module/api.js`의 ApiClient를 통해 이루어집니다.

### 주요 API 엔드포인트

- **Novel API**: `/novel/v1/*`
- **Episode API**: `/episode/v1/*`
- **Comment API**: `/comment/v1/*`
- **User API**: `/api/v1/*`

### 인증

- JWT 기반 인증 (accessToken + refreshToken)
- 401 응답 시 자동 토큰 갱신
- 토큰 만료 시 로그인 페이지로 리다이렉트

## 디렉토리 구조

```
novel-frontend/
├── src/
│   ├── index.ts            # Express 서버 진입점
│   ├── views/
│   │   ├── pages/         # 페이지 템플릿
│   │   ├── partials/      # 재사용 가능한 컴포넌트
│   │   └── error/         # 에러 페이지
│   └── public/
│       ├── css/           # 스타일시트
│       ├── js/            # 클라이언트 JavaScript
│       └── module/        # ES6 모듈
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 재사용 가능한 Partials

- `header.ejs` - 공통 헤더 (현재 섹션 보라색 하이라이트)
- `footer.ejs` - 공통 푸터
- `novel-preview-card.ejs` - 소설 미리보기 카드
- `search-bar.ejs` - 검색 바
- `sort-tabs.ejs` - 정렬 탭
- `pagination.ejs` - 페이지네이션
- `report-modal.ejs` - 신고 모달
- `skeleton.ejs` - 로딩 스켈레톤
- `error-banner.ejs` - 에러 배너
- `empty-state.ejs` - 빈 상태 표시

## 스타일 가이드

### 색상 (CSS Variables)

- Primary: `--purple-color: #8b5cf6`
- Error: `--error-color: #f47c7c`
- Success: `--success-color: #28a745`

### 들여쓰기

- 4 spaces (모든 파일)

### 네이밍 컨벤션

- Variables/Functions: `camelCase`
- CSS Classes: `kebab-case`
- Constants: `UPPER_SNAKE_CASE`
- EJS Partials: `kebab-case.ejs`

## 보안

- XSS 방어: EJS 자동 이스케이핑
- CSRF 보호: 토큰 기반
- Rate Limiting: 15분당 100 요청
- 민감한 정보는 환경 변수로 관리

## 성능 최적화

- 이미지 Lazy Loading
- 코드 스플리팅 (페이지별)
- Redis 캐싱 (인기 콘텐츠 60초)
- 스켈레톤 UI로 체감 성능 향상
- Prefetch on hover

## 접근성 (A11Y)

- WCAG AA 대비율
- `aria-*` 속성 제공
- 키보드 네비게이션 지원
- 모달 포커스 트랩
- 스크린 리더 호환

## 국제화 (I18N)

- 기본 로케일: `ko-KR`
- 모든 UI 텍스트 한국어

## 테스트

```bash
# 테스트 실행
npm test
```

## 배포

프로덕션 배포는 CI/CD 파이프라인을 통해 자동화되어 있습니다.

```bash
# 수동 배포
./deploy.sh
```

## 라이선스

ISC

## 기여

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 커밋 스타일

Conventional Commits 사용:
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링
- `chore:` 빌드, 설정 등
- `test:` 테스트
- `docs:` 문서