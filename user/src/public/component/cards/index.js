/**
 * @file Card Components
 * @description 콘텐츠를 담는 재사용 가능한 카드(Card) UI 컴포넌트를 생성하는 함수들을 제공합니다.
 * @module components/cards
 */

import { createRoleBadge, createVerificationBadge } from '../badges/index.js';
import { createButton } from '../buttons/index.js';

/**
 * 모든 카드의 기반이 되는 기본 카드 엘리먼트를 생성합니다.
 *
 * @param {object} options - 카드 생성을 위한 옵션 객체.
 * @param {string|null} [options.title=null] - 카드의 헤더에 표시될 제목.
 * @param {string|HTMLElement|null} [options.content=null] - 카드의 본문에 표시될 내용.
 * @param {HTMLElement[]} [options.actions=[]] - 카드의 푸터에 표시될 버튼 등의 액션 엘리먼트 배열.
 * @param {string} [options.className=''] - 카드에 추가할 커스텀 CSS 클래스.
 * @param {string} [options.variant='default'] - 카드의 스타일 ('default', 'outlined', 'elevated').
 * @param {Function|null} [options.onClick=null] - 카드를 클릭했을 때 실행될 콜백 함수.
 * @returns {HTMLDivElement} 생성된 카드 엘리먼트.
 */
export function createCard(options = {}) {
    const {
        title = null,
        content = null,
        actions = [],
        className = '',
        variant = 'default',
        onClick = null
    } = options;

    const card = document.createElement('div');
    const classes = ['card', `card-${variant}`];

    if (className) {
        classes.push(className);
    }

    if (onClick) {
        classes.push('card-clickable');
        card.style.cursor = 'pointer';
        card.addEventListener('click', onClick);
    }

    card.className = classes.join(' ');

    // 헤더 생성
    if (title) {
        const header = document.createElement('div');
        header.className = 'card-header';

        const titleElement = document.createElement('h3');
        titleElement.className = 'card-title';
        titleElement.textContent = title;
        header.appendChild(titleElement);

        card.appendChild(header);
    }

    // 본문 생성
    if (content) {
        const body = document.createElement('div');
        body.className = 'card-body';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        card.appendChild(body);
    }

    // 액션 영역 생성
    if (actions.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        actions.forEach((action) => {
            footer.appendChild(action);
        });

        card.appendChild(footer);
    }

    return card;
}

/**
 * 사용자 정보를 표시하는 프로필 카드를 생성합니다.
 *
 * @param {object} userInfo - 사용자 정보 객체.
 * @param {string} [userInfo.username='사용자'] - 사용자 이름.
 * @param {string} [userInfo.email=''] - 이메일 주소.
 * @param {string|null} [userInfo.profileImage=null] - 프로필 이미지 URL.
 * @param {string} [userInfo.description=''] - 사용자 소개.
 * @param {string|null} [userInfo.userid=null] - 사용자 UID.
 * @param {boolean} [userInfo.isVerified=false] - 이메일 인증 여부.
 * @param {string} [userInfo.role='user'] - 사용자 역할.
 * @param {string|Date|null} [userInfo.joinDate=null] - 가입일.
 * @param {HTMLElement[]} [actions=[]] - 카드 하단에 추가될 액션 버튼 배열.
 * @param {object|null} [imageActions=null] - 프로필 이미지 액션.
 * @param {Function|null} [imageActions.onUploadClick=null] - 이미지 업로드 버튼 클릭 시 콜백.
 * @param {Function|null} [imageActions.onDeleteClick=null] - 이미지 삭제 버튼 클릭 시 콜백.
 * @returns {HTMLDivElement} 생성된 사용자 프로필 카드 엘리먼트.
 */
export function createUserProfileCard(
    userInfo = {},
    actions = [],
    imageActions = null
) {
    const {
        username = '사용자',
        email = '',
        profileImage = null,
        description = '',
        userid = null,
        isVerified = false,
        role = 'user',
        joinDate = null
    } = userInfo;

    // 프로필 이미지 영역
    const profileSection = document.createElement('div');
    profileSection.className = 'profile-section';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'profile-image-container';

    const profileImg = document.createElement('div');
    profileImg.className = 'profile-image';

    if (profileImage) {
        const img = document.createElement('img');
        img.src = profileImage;
        img.alt = `${username}의 프로필 이미지`;
        profileImg.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = 'person';
        profileImg.appendChild(icon);
    }

    imageContainer.appendChild(profileImg);

    if (
        imageActions &&
        (imageActions.onUploadClick || imageActions.onDeleteClick)
    ) {
        const imageActionsContainer = document.createElement('div');
        imageActionsContainer.className = 'profile-image-actions';

        if (imageActions.onUploadClick) {
            const uploadBtn = createButton({
                text: '업로드',
                icon: 'upload',
                size: 'sm',
                variant: 'primary',
                onClick: imageActions.onUploadClick
            });
            imageActionsContainer.appendChild(uploadBtn);
        }

        if (imageActions.onDeleteClick) {
            const deleteBtn = createButton({
                text: '삭제',
                icon: 'delete',
                size: 'sm',
                variant: 'danger',
                className: 'always-light',
                onClick: imageActions.onDeleteClick
            });
            imageActionsContainer.appendChild(deleteBtn);
        }
        imageContainer.appendChild(imageActionsContainer);
    }

    profileSection.appendChild(imageContainer);

    // 사용자 정보 영역
    const infoSection = document.createElement('div');
    infoSection.className = 'profile-info';

    // 사용자명과 뱃지
    const usernameContainer = document.createElement('div');
    usernameContainer.className = 'username-container';

    const usernameElement = document.createElement('h3');
    usernameElement.className = 'username';
    usernameElement.textContent = username;
    usernameContainer.appendChild(usernameElement);

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'badges-container';

    // 인증 뱃지 추가
    const verificationBadge = createVerificationBadge(isVerified);
    badgesContainer.appendChild(verificationBadge);

    // 역할 뱃지 추가
    const roleBadge = createRoleBadge(role);
    badgesContainer.appendChild(roleBadge);

    usernameContainer.appendChild(badgesContainer);
    infoSection.appendChild(usernameContainer);

    // 이메일 정보
    if (email) {
        const emailElement = document.createElement('p');
        emailElement.className = 'user-email';
        emailElement.textContent = email;
        infoSection.appendChild(emailElement);
    }

    // 소개 정보
    if (description) {
        const descriptionElement = document.createElement('p');
        descriptionElement.className = 'user-description';
        descriptionElement.textContent = description;
        infoSection.appendChild(descriptionElement);
    }

    // 가입일 정보
    if (joinDate) {
        const joinDateElement = document.createElement('p');
        joinDateElement.className = 'join-date';
        joinDateElement.textContent = `가입일: ${new Date(
            joinDate
        ).toLocaleDateString('ko-KR')}`;
        infoSection.appendChild(joinDateElement);
    }

    // UID 정보
    if (userid) {
        const uidElement = document.createElement('p');
        uidElement.className = 'user-uid';
        uidElement.innerHTML = `<span>UID:</span> ${userid}`;
        infoSection.appendChild(uidElement);
    }

    profileSection.appendChild(infoSection);

    return createCard({
        content: profileSection,
        actions: actions,
        className: 'user-profile-card'
    });
}

/**
 * 특정 데이터를 시각적으로 보여주는 통계 카드를 생성합니다.
 *
 * @param {object} options - 통계 카드 생성을 위한 옵션 객체.
 * @param {string} [options.title=''] - 통계 항목의 제목 (e.g., '총 방문자 수').
 * @param {string|number} [options.value=0] - 표시할 통계 값.
 * @param {string} [options.icon='analytics'] - 통계 아이콘.
 * @param {string} [options.color='primary'] - 아이콘과 카드 스타일의 기본 색상.
 * @param {string|null} [options.trend=null] - 값의 변화 추이 ('up', 'down', 'stable').
 * @param {string|null} [options.trendValue=null] - 변화 추이 값 (e.g., '+5.2%').
 * @returns {HTMLDivElement} 생성된 통계 카드 엘리먼트.
 */
export function createStatsCard(options = {}) {
    const {
        title = '',
        value = 0,
        icon = 'analytics',
        color = 'primary',
        trend = null,
        trendValue = null
    } = options;

    const content = document.createElement('div');
    content.className = 'stats-content';

    // 아이콘 영역
    const iconContainer = document.createElement('div');
    iconContainer.className = `stats-icon stats-icon-${color}`;

    const iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined';
    iconElement.textContent = icon;
    iconContainer.appendChild(iconElement);

    content.appendChild(iconContainer);

    // 정보 영역
    const infoContainer = document.createElement('div');
    infoContainer.className = 'stats-info';

    const titleElement = document.createElement('h4');
    titleElement.className = 'stats-title';
    titleElement.textContent = title;
    infoContainer.appendChild(titleElement);

    const valueElement = document.createElement('div');
    valueElement.className = 'stats-value';
    valueElement.textContent = value;
    infoContainer.appendChild(valueElement);

    // 트렌드 정보
    if (trend && trendValue) {
        const trendContainer = document.createElement('div');
        trendContainer.className = `stats-trend stats-trend-${trend}`;

        const trendIcon = document.createElement('span');
        trendIcon.className = 'material-symbols-outlined';
        trendIcon.textContent =
            trend === 'up'
                ? 'trending_up'
                : trend === 'down'
                ? 'trending_down'
                : 'trending_flat';
        trendContainer.appendChild(trendIcon);

        const trendText = document.createElement('span');
        trendText.textContent = trendValue;
        trendContainer.appendChild(trendText);

        infoContainer.appendChild(trendContainer);
    }

    content.appendChild(infoContainer);

    return createCard({
        content: content,
        className: `stats-card stats-card-${color}`
    });
}

/**
 * 알림 메시지를 표시하는 카드를 생성합니다.
 *
 * @param {object} options - 알림 카드 옵션.
 * @param {string} [options.message=''] - 알림 메시지.
 * @param {string} [options.variant='info'] - 알림 종류 ('info', 'success', 'warning', 'danger').
 * @param {string|null} [options.icon=null] - 커스텀 아이콘. 지정하지 않으면 variant에 따라 자동 설정됩니다.
 * @param {boolean} [options.dismissible=true] - 닫기 버튼 표시 여부.
 * @param {Function|null} [options.onDismiss=null] - 닫기 버튼 클릭 시 실행될 콜백.
 * @returns {HTMLDivElement} 생성된 알림 카드 엘리먼트.
 */
export function createNotificationCard(options = {}) {
    const {
        title = '',
        message = '',
        type = 'info',
        dismissible = true,
        onDismiss = null
    } = options;

    const content = document.createElement('div');
    content.className = 'notification-content';

    // 아이콘
    const iconMap = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };

    const iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined notification-icon';
    iconElement.textContent = iconMap[type] || iconMap.info;
    content.appendChild(iconElement);

    // 텍스트 영역
    const textContainer = document.createElement('div');
    textContainer.className = 'notification-text';

    if (title) {
        const titleElement = document.createElement('h4');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;
        textContainer.appendChild(titleElement);
    }

    if (message) {
        const messageElement = document.createElement('p');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        textContainer.appendChild(messageElement);
    }

    content.appendChild(textContainer);

    const actions = [];

    // 닫기 버튼
    if (dismissible) {
        const dismissButton = document.createElement('button');
        dismissButton.className = 'btn btn-sm notification-dismiss';
        dismissButton.innerHTML =
            '<span class="material-symbols-outlined">close</span>';
        dismissButton.addEventListener('click', () => {
            if (onDismiss) {
                onDismiss();
            }
        });
        actions.push(dismissButton);
    }

    return createCard({
        content: content,
        actions: actions,
        className: `notification-card notification-${type}`
    });
}

/**
 * 콘텐츠가 없을 때 사용자에게 표시할 메시지 카드를 생성합니다. (e.g., '검색 결과가 없습니다.')
 *
 * @param {object} options - 옵션 객체.
 * @param {string} [options.title='콘텐츠 없음'] - 주 메시지.
 * @param {string} [options.description=''] - 부가 설명.
 * @param {string} [options.icon='search_off'] - 표시할 아이콘.
 * @param {HTMLElement|null} [options.action=null] - '새로 만들기' 등 사용자 행동을 유도할 버튼.
 * @returns {HTMLDivElement} 생성된 빈 상태 카드 엘리먼트.
 */
export function createEmptyStateCard(options = {}) {
    const {
        icon = 'inbox',
        title = '데이터가 없습니다',
        message = '표시할 내용이 없습니다.',
        action = null
    } = options;

    const content = document.createElement('div');
    content.className = 'empty-state-content';

    const iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined empty-state-icon';
    iconElement.textContent = icon;
    content.appendChild(iconElement);

    const titleElement = document.createElement('h3');
    titleElement.className = 'empty-state-title';
    titleElement.textContent = title;
    content.appendChild(titleElement);

    const messageElement = document.createElement('p');
    messageElement.className = 'empty-state-message';
    messageElement.textContent = message;
    content.appendChild(messageElement);

    const actions = action ? [action] : [];

    return createCard({
        content: content,
        actions: actions,
        className: 'empty-state-card'
    });
}

/**
 * 여러 개의 카드를 격자(Grid) 형태로 정렬하는 컨테이너를 생성합니다.
 *
 * @param {HTMLDivElement[]} [cards=[]] - 그리드에 포함될 카드 엘리먼트 배열.
 * @param {object} options - 그리드 옵션.
 * @param {number} [options.columns=3] - 데스크탑 화면에서의 열(column) 개수.
 * @param {string} [options.gap='1rem'] - 카드 사이의 간격.
 * @param {string} [options.className=''] - 컨테이너에 추가할 커스텀 CSS 클래스.
 * @returns {HTMLDivElement} 생성된 카드 그리드 컨테이너.
 */
export function createCardGrid(cards = [], options = {}) {
    const { columns = 3, gap = '1rem', className = '' } = options;

    const grid = document.createElement('div');
    grid.className = `card-grid ${className}`;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(300px, 1fr))`;
    grid.style.gap = gap;

    cards.forEach((card) => {
        grid.appendChild(card);
    });

    return grid;
}
