# 컴포넌트 라이브러리 가이드

이 문서는 프로젝트에서 사용되는 재사용 가능한 UI 컴포넌트 라이브러리의 사용법을
안내합니다.

## 초기화

컴포넌트를 사용하기 전에, 페이지의 메인 스크립트에서 초기화 함수를 호출해야 합니
다. 이 과정은 테마 색상, 폰트 등 필수적인 스타일을 설정합니다.

```javascript
import { initializeComponents, loadSavedTheme } from '/component/index.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
});
```

## 컴포넌트 사용법

모든 컴포넌트는 `component/index.js`를 통해 한번에 가져오거나, 각 컴포넌트의 개
별 파일을 통해 가져올 수 있습니다.

```javascript
// 전체 컴포넌트 가져오기
import * as Components from '/component/index.js';

// 개별 컴포넌트 가져오기
import { createButton, createModal } from '/component/index.js';
```

---

### 1. 버튼 (Buttons)

버튼은 `createButton(options)` 함수를 통해 생성합니다.

**주요 옵션:**

-   `text`: 버튼 텍스트
-   `variant`: 색상 스타일 (`primary`, `secondary`, `danger`, `warning`,
    `success`)
-   `icon`: Material Symbols 아이콘 이름
-   `onClick`: 클릭 시 실행될 함수

**사용 예시:**

```javascript
import { createButton, createDeleteButton } from '/component/buttons/index.js';

// 기본 버튼
const primaryButton = createButton({
    text: '확인',
    variant: 'primary',
    icon: 'check',
    onClick: () => console.log('Primary button clicked!')
});

// 미리 정의된 삭제 버튼
const deleteButton = createDeleteButton(() => {
    if (confirm('정말 삭제하시겠습니까?')) {
        // 삭제 로직
    }
});

document.body.append(primaryButton, deleteButton);
```

---

### 2. 모달 (Modals)

모달은 목적에 따라 다양한 생성 함수를 제공합니다.

-   `createModal(options)`: 가장 기본적인 모달
-   `createConfirmCancelModal(options)`: 확인/취소 버튼이 포함된 모달
-   `alert(message, title)`: 간단한 알림창
-   `confirm(message, title)`: 간단한 확인창 (Promise 반환)

**사용 예시:**

```javascript
import { createConfirmCancelModal, alert } from '/component/modals/index.js';

// 확인/취소 모달
const confirmModal = createConfirmCancelModal({
    title: '계정 삭제',
    message: '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    variant: 'danger',
    confirmText: '삭제',
    onConfirm: () => {
        console.log('계정 삭제 로직 실행');
        alert('계정이 삭제되었습니다.');
    }
});

// 모달을 body에 추가하여 표시
document.body.appendChild(confirmModal);
```

---

### 3. 뱃지 (Badges)

뱃지는 사용자 역할, 상태 등을 표시할 때 사용됩니다.

-   `createRoleBadge(role)`: 사용자 역할 (admin, user 등) 뱃지
-   `createVerificationBadge(isVerified)`: 인증 상태 뱃지

**사용 예시:**

```javascript
import {
    createRoleBadge,
    createVerificationBadge
} from '/component/badges/index.js';

const adminBadge = createRoleBadge('admin');
const verifiedBadge = createVerificationBadge(true);

document.body.append(adminBadge, verifiedBadge);
```

---

### 4. 카드 (Cards)

카드는 정보를 그룹화하여 보여줄 때 사용됩니다.

-   `createCard(options)`: 기본 카드
-   `createUserProfileCard(userInfo, actions)`: 사용자 프로필 카드
-   `createStatsCard(options)`: 통계 정보 카드

**사용 예시:**

```javascript
import { createUserProfileCard, createButton } from '/component/index.js';

const user = {
    username: 'Alice',
    email: 'alice@example.com',
    isVerified: true,
    role: 'admin'
};

const actions = [
    createButton({
        text: '프로필 수정',
        onClick: () => {
            /* ... */
        }
    })
];

const profileCard = createUserProfileCard(user, actions);

document.body.appendChild(profileCard);
```