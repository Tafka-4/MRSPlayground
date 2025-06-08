# MRS Playground 컴포넌트 라이브러리

재사용 가능한 UI 컴포넌트들을 제공하는 라이브러리입니다. 일관된 디자인 시스템과 향상된 사용자 경험을 위해 설계되었습니다.

## 📁 구조

```
component/
├── index.js              # 메인 진입점
├── buttons/              # 버튼 컴포넌트들
├── badges/               # 뱃지 컴포넌트들
├── cards/                # 카드 컴포넌트들
├── tables/               # 테이블 컴포넌트들
├── headers/              # 헤더/네비게이션 컴포넌트들
├── style/                # 공통 스타일
│   ├── base.css         # 기본 스타일
│   ├── layout.css       # 레이아웃 스타일
│   └── components.css   # 컴포넌트 스타일
└── README.md            # 이 파일
```

## 🚀 시작하기

### 1. 기본 설정

HTML 파일에 필요한 스타일과 스크립트를 포함하세요:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
    
    <!-- 컴포넌트 스타일 -->
    <link rel="stylesheet" href="/component/style/base.css">
    <link rel="stylesheet" href="/component/style/layout.css">
    <link rel="stylesheet" href="/component/style/components.css">
</head>
<body>
    <!-- 컴포넌트 라이브러리 -->
    <script type="module" src="/component/index.js"></script>
    <script type="module">
        import * as Components from '/component/index.js';
        
        // 컴포넌트 사용 예시
        const button = Components.createButton({
            text: '클릭하세요',
            variant: 'primary',
            onClick: () => alert('버튼 클릭!')
        });
        
        document.body.appendChild(button);
    </script>
</body>
</html>
```

### 2. 컴포넌트 라이브러리 초기화

```javascript
import * as Components from '/component/index.js';

// 자동 초기화 (권장)
// 라이브러리가 자동으로 초기화됩니다.

// 수동 초기화 (필요한 경우)
Components.initializeComponents();
```

## 🎨 컴포넌트 사용법

### 버튼 (Buttons)

```javascript
// 기본 버튼
const primaryButton = Components.createButton({
    text: '저장',
    variant: 'primary',
    size: 'medium',
    icon: 'save',
    onClick: () => console.log('저장!')
});

// 특수 버튼들
const logoutButton = Components.createLogoutButton();
const adminButton = Components.createAdminButton();
const editButton = Components.createEditButton(() => console.log('편집'));

// 버튼 그룹
const buttonGroup = Components.createButtonGroup([
    primaryButton,
    editButton
]);
```

### 뱃지 (Badges)

```javascript
// 기본 뱃지
const badge = Components.createBadge({
    text: '새로움',
    variant: 'success',
    icon: 'new_releases'
});

// 인증 상태 뱃지
const verificationBadge = Components.createVerificationBadge(true);

// 역할 뱃지
const roleBadge = Components.createRoleBadge('admin');

// 알림 뱃지
const notificationBadge = Components.createNotificationBadge(5);
```

### 카드 (Cards)

```javascript
// 기본 카드
const card = Components.createCard({
    title: '카드 제목',
    content: '<p>카드 내용입니다.</p>',
    actions: [
        Components.createButton({ text: '확인', variant: 'primary' }),
        Components.createButton({ text: '취소', variant: 'secondary' })
    ]
});

// 사용자 프로필 카드
const profileCard = Components.createUserProfileCard({
    username: '김철수',
    email: 'kim@example.com',
    isVerified: true,
    role: 'admin'
});

// 통계 카드
const statsCard = Components.createStatsCard({
    title: '총 사용자',
    value: '1,234',
    icon: 'people',
    color: 'primary',
    trend: 'up',
    trendValue: '+12%'
});
```

### 테이블 (Tables)

```javascript
// 기본 테이블
const table = Components.createTable({
    columns: [
        { key: 'name', title: '이름', sortable: true },
        { key: 'email', title: '이메일', sortable: true },
        { key: 'role', title: '역할' }
    ],
    data: [
        { name: '김철수', email: 'kim@example.com', role: 'admin' },
        { name: '이영희', email: 'lee@example.com', role: 'user' }
    ],
    sortable: true,
    onRowClick: (row) => console.log('행 클릭:', row)
});

// 사용자 테이블 (미리 정의된 컬럼)
const userTable = Components.createUserTable(users, {
    onEdit: (user) => console.log('편집:', user),
    onDelete: (user) => console.log('삭제:', user)
});

// 페이지네이션
const pagination = Components.createPagination({
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    onPageChange: (page) => console.log('페이지:', page)
});

// 테이블 컨테이너 (테이블 + 페이지네이션)
const tableContainer = Components.createTableContainer(table, pagination);
```

### 헤더/네비게이션 (Headers)

```javascript
// 페이지 헤더
const pageHeader = Components.createPageHeader({
    title: '대시보드',
    subtitle: '시스템 현황을 확인할 수 있습니다.',
    breadcrumbs: [
        { text: '홈', href: '/' },
        { text: '대시보드' }
    ],
    actions: [
        Components.createButton({ text: '새로고침', icon: 'refresh' })
    ]
});

// 네비게이션 바
const navbar = Components.createNavbar({
    brand: 'MRS Playground',
    items: [
        { text: '홈', href: '/', active: true },
        { text: '대시보드', href: '/dashboard' }
    ],
    rightItems: [
        Components.createNotificationHeader({ count: 3 }),
        Components.createUserMenu(userInfo, menuItems)
    ]
});

// 검색 바
const searchBar = Components.createSearchBar({
    placeholder: '검색...',
    onSearch: (query) => console.log('검색:', query)
});
```

## 🎨 테마 시스템

### CSS 변수

컴포넌트들은 CSS 변수를 사용하여 테마를 지원합니다:

```css
:root {
    --primary-color: rgb(10, 10, 10);
    --secondary-color: rgb(100, 100, 100);
    --success-color: #28a745;
    --warning-color: #eea73c;
    --error-color: #f47c7c;
    --border-color: rgb(200, 200, 200);
    --background-color: rgb(240, 240, 240);
    --card-background: white;
    --border-radius: 0.5rem;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --transition: 0.2s ease;
}
```

### 테마 변경

```javascript
// 커스텀 테마 설정
Components.setTheme({
    'primary-color': '#007bff',
    'success-color': '#28a745'
});

// 다크 모드 토글
Components.toggleDarkMode(true);  // 다크 모드 활성화
Components.toggleDarkMode(false); // 라이트 모드 활성화
```

## 📱 반응형 디자인

모든 컴포넌트는 반응형으로 설계되어 다양한 화면 크기에서 최적화됩니다:

- **데스크톱**: 1200px 이상
- **태블릿**: 768px - 1199px
- **모바일**: 767px 이하

## ♿ 접근성

컴포넌트들은 웹 접근성 가이드라인(WCAG)을 준수합니다:

- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 적절한 색상 대비
- ARIA 속성 지원

## 🔧 커스터마이징

### 새로운 컴포넌트 추가

1. 해당 카테고리 폴더에 컴포넌트 파일 생성
2. `index.js`에서 export
3. 필요한 CSS 스타일 추가

```javascript
// components/buttons/custom-button.js
export function createCustomButton(options = {}) {
    // 커스텀 버튼 로직
}

// components/index.js
export * from './buttons/custom-button.js';
```

### 스타일 오버라이드

```css
/* 커스텀 스타일 */
.my-custom-button {
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    border: none;
    color: white;
}
```

## 🧪 테스트

컴포넌트 테스트 페이지에서 모든 컴포넌트를 확인할 수 있습니다:

```
/test/component
```

## 📝 예시 프로젝트

리팩토링된 마이페이지 예시:

```javascript
// pages/mypage/mypage-refactored.mjs
import * as Components from '../../component/index.js';

// 사용자 프로필 카드 생성
const profileCard = Components.createUserProfileCard(userInfo, actions);

// 페이지 헤더 생성
const header = Components.createPageHeader({
    title: '마이페이지',
    breadcrumbs: [{ text: '홈', href: '/' }, { text: '마이페이지' }]
});
```

## 🤝 기여하기

1. 새로운 컴포넌트나 기능 제안
2. 버그 리포트
3. 문서 개선
4. 코드 리뷰

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

더 자세한 정보나 도움이 필요하시면 개발팀에 문의해주세요. 