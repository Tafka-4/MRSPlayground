# 프론트엔드 리팩토링 가이드

이 문서는 리팩토링된 프론트엔드 컴포넌트 시스템의 구조와 사용법을 설명합니다.

## 📁 새로운 파일 구조

```
src/public/
├── style/                      # 공통 스타일 파일들
│   ├── base.css               # 기본 스타일 (폰트, 변수, 유틸리티)
│   ├── components.css         # 공통 컴포넌트 스타일
│   ├── layout.css            # 레이아웃 컴포넌트 스타일
│   └── dashboard.css         # 대시보드 특수 컴포넌트 스타일
├── module/                    # JavaScript 모듈들
│   ├── form-components.js    # 폼 관련 컴포넌트
│   ├── page-layout.js        # 페이지 레이아웃 컴포넌트
│   ├── dashboard-components.js # 대시보드 특수 컴포넌트
│   └── [기존 모듈들...]
└── [페이지별 파일들...]
```

## 🎨 CSS 아키텍처

### 1. Base Styles (`base.css`)

-   전체 애플리케이션의 기본 스타일
-   CSS 변수를 이용한 테마 시스템
-   유틸리티 클래스

```css
:root {
    --primary-color: rgb(10, 10, 10);
    --secondary-color: rgb(100, 100, 100);
    --background-color: rgb(240, 240, 240);
    /* ... */
}
```

### 2. Component Styles (`components.css`)

-   재사용 가능한 컴포넌트 스타일
-   버튼, 입력 필드, 카드 등

### 3. Layout Styles (`layout.css`)

-   페이지 레이아웃 관련 스타일
-   그리드, 플렉스, 모달 등

### 4. Dashboard Styles (`dashboard.css`)

-   대시보드 특수 컴포넌트 스타일
-   통계 카드, 활동 목록, 로그 표시 등

## 🧩 컴포넌트 시스템

### Form Components (`form-components.js`)

#### 입력 필드 생성

```javascript
import { createInputWrapper } from './module/form-components.js';

const emailInput = createInputWrapper({
    type: 'email',
    name: 'email',
    placeholder: '이메일을 입력하세요',
    icon: 'email',
    required: true
});
```

#### 버튼 생성

```javascript
import { createButton } from './module/form-components.js';

const submitButton = createButton({
    text: '제출',
    type: 'submit',
    className: 'btn btn-primary',
    icon: 'send',
    onClick: handleSubmit
});
```

#### 폼 관리

```javascript
import { FormManager, FormValidators } from './module/form-components.js';

const formManager = new FormManager();
formManager.registerField('email', emailInput, FormValidators.email);

// 폼 검증
if (formManager.validate()) {
    const data = formManager.getData();
    // 처리...
}
```

### Page Layout (`page-layout.js`)

#### 페이지 레이아웃 설정

```javascript
import { PageLayoutManager } from './module/page-layout.js';

const layoutManager = new PageLayoutManager();
const container = layoutManager.setupLayout('centered'); // 또는 'scrollable'
```

#### 모달 생성

```javascript
import { createModal } from './module/page-layout.js';

const modal = createModal({
    title: '확인',
    content: '정말로 삭제하시겠습니까?',
    actions: [cancelButton, confirmButton]
});

document.body.appendChild(modal);
```

### Dashboard Components (`dashboard-components.js`)

#### 통계 카드 생성

```javascript
import { createStatsCard } from './module/dashboard-components.js';

const userStatsCard = createStatsCard({
    title: '총 사용자',
    value: 1250,
    icon: 'people'
});
```

#### 대시보드 관리

```javascript
import { DashboardManager } from './module/dashboard-components.js';

const dashboard = new DashboardManager(container);
dashboard.addStatsCard('users', {
    title: '총 사용자',
    value: 1250,
    icon: 'people'
});

// 값 업데이트
dashboard.updateStatsCard('users', 1300);
```

## 📱 반응형 디자인

모든 컴포넌트는 반응형으로 설계되었습니다:

```css
@media (max-width: 768px) {
    .grid-2,
    .grid-3,
    .grid-4 {
        grid-template-columns: 1fr;
    }

    .dashboard-main {
        grid-template-columns: 1fr;
    }
}
```

## 🎯 사용 예시

### 1. 기본 페이지 생성

```html
<!DOCTYPE html>
<html lang="ko">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>페이지 제목</title>

        <!-- Google Material Symbols -->
        <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />

        <!-- 스타일 시트 -->
        <link rel="stylesheet" href="./style/base.css" />
        <link rel="stylesheet" href="./style/components.css" />
        <link rel="stylesheet" href="./style/layout.css" />
    </head>
    <body>
        <script type="module" src="./your-page.mjs"></script>
    </body>
</html>
```

### 2. JavaScript 페이지 구성

```javascript
import { PageLayoutManager } from './module/page-layout.js';
import {
    createTitle,
    createInputWrapper,
    createButton
} from './module/form-components.js';

// 레이아웃 초기화
const layoutManager = new PageLayoutManager();
const container = layoutManager.setupLayout('centered');

// 제목 추가
const title = createTitle('페이지 제목');
container.appendChild(title);

// 폼 요소들 추가
const form = document.createElement('form');
const nameInput = createInputWrapper({
    type: 'text',
    name: 'name',
    placeholder: '이름을 입력하세요',
    icon: 'person'
});

const submitButton = createButton({
    text: '제출',
    type: 'submit',
    className: 'btn btn-primary'
});

form.appendChild(nameInput);
form.appendChild(submitButton);
container.appendChild(form);
```

## ⚡ 성능 최적화

1. **모듈 기반 로딩**: 필요한 컴포넌트만 import
2. **CSS 변수 활용**: 런타임 테마 변경 가능
3. **이벤트 위임**: 효율적인 이벤트 처리
4. **컴포넌트 재사용**: 중복 코드 최소화

## 🔄 기존 페이지 마이그레이션

### Before (기존 방식)

```javascript
// 중복된 스타일과 로직
const input = document.createElement('input');
input.style.fontSize = '1rem';
input.style.padding = '0.5rem';
// ... 많은 스타일 설정
```

### After (새로운 방식)

```javascript
// 간단하고 재사용 가능
const input = createInputWrapper({
    type: 'text',
    name: 'username',
    placeholder: '사용자명',
    icon: 'person'
});
```

## 📋 마이그레이션 체크리스트

-   [ ] 기본 CSS 파일들 추가
-   [ ] 컴포넌트 모듈들 추가
-   [ ] HTML에서 새로운 CSS 파일들 링크
-   [ ] JavaScript에서 컴포넌트 import
-   [ ] 기존 폼 로직을 FormManager로 변경
-   [ ] 기존 스타일을 컴포넌트 클래스로 변경
-   [ ] 중복 코드 제거
-   [ ] 테스트 및 검증

## 🎨 테마 커스터마이징

CSS 변수를 수정하여 쉽게 테마를 변경할 수 있습니다:

```css
:root {
    --primary-color: #your-color;
    --error-color: #your-error-color;
    /* ... */
}
```

## 🤝 기여 가이드

1. 새로운 컴포넌트는 적절한 모듈에 추가
2. 스타일은 해당하는 CSS 파일에 정리
3. 문서화 및 예시 코드 작성
4. 반응형 디자인 고려
5. 접근성 (a11y) 기준 준수

이 리팩토링된 시스템을 통해 코드의 재사용성, 유지보수성, 그리고 개발 효율성이 크
게 향상됩니다.
