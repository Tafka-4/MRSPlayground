/**
 * Card Components
 * 재사용 가능한 카드 컴포넌트들을 제공합니다.
 */

/**
 * 기본 카드 생성
 * @param {Object} options - 카드 옵션
 * @param {string} options.title - 카드 제목
 * @param {string|HTMLElement} options.content - 카드 내용
 * @param {Array} options.actions - 액션 버튼 배열
 * @param {string} options.className - 추가 CSS 클래스
 * @param {string} options.variant - 카드 스타일 ('default', 'outlined', 'elevated')
 * @param {Function} options.onClick - 카드 클릭 이벤트
 * @returns {HTMLDivElement} 카드 엘리먼트
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
        
        actions.forEach(action => {
            footer.appendChild(action);
        });
        
        card.appendChild(footer);
    }

    return card;
}

/**
 * 사용자 프로필 카드 생성
 * @param {Object} userInfo - 사용자 정보
 * @param {Array} actions - 액션 버튼 배열
 * @returns {HTMLDivElement} 사용자 프로필 카드
 */
export function createUserProfileCard(userInfo = {}, actions = []) {
    const {
        username = '사용자',
        email = '',
        profileImage = null,
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

    // 인증 뱃지 추가 (badges 컴포넌트 사용)
    if (typeof createVerificationBadge !== 'undefined') {
        const verificationBadge = createVerificationBadge(isVerified);
        usernameContainer.appendChild(verificationBadge);
    }

    // 역할 뱃지 추가
    if (typeof createRoleBadge !== 'undefined') {
        const roleBadge = createRoleBadge(role);
        usernameContainer.appendChild(roleBadge);
    }

    infoSection.appendChild(usernameContainer);

    // 이메일 정보
    if (email) {
        const emailElement = document.createElement('p');
        emailElement.className = 'user-email';
        emailElement.textContent = email;
        infoSection.appendChild(emailElement);
    }

    // 가입일 정보
    if (joinDate) {
        const joinDateElement = document.createElement('p');
        joinDateElement.className = 'join-date';
        joinDateElement.textContent = `가입일: ${new Date(joinDate).toLocaleDateString('ko-KR')}`;
        infoSection.appendChild(joinDateElement);
    }

    profileSection.appendChild(infoSection);

    return createCard({
        content: profileSection,
        actions: actions,
        className: 'user-profile-card'
    });
}

/**
 * 통계 카드 생성
 * @param {Object} options - 통계 카드 옵션
 * @param {string} options.title - 제목
 * @param {string|number} options.value - 값
 * @param {string} options.icon - 아이콘
 * @param {string} options.color - 색상 ('primary', 'success', 'warning', 'danger')
 * @param {string} options.trend - 트렌드 ('up', 'down', 'stable')
 * @param {string} options.trendValue - 트렌드 값
 * @returns {HTMLDivElement} 통계 카드
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
        trendIcon.textContent = trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat';
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
 * 알림 카드 생성
 * @param {Object} options - 알림 카드 옵션
 * @param {string} options.title - 제목
 * @param {string} options.message - 메시지
 * @param {string} options.type - 알림 타입 ('info', 'success', 'warning', 'error')
 * @param {boolean} options.dismissible - 닫기 가능 여부
 * @param {Function} options.onDismiss - 닫기 콜백
 * @returns {HTMLDivElement} 알림 카드
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
        dismissButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
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
 * 빈 상태 카드 생성
 * @param {Object} options - 빈 상태 카드 옵션
 * @param {string} options.icon - 아이콘
 * @param {string} options.title - 제목
 * @param {string} options.message - 메시지
 * @param {HTMLElement} options.action - 액션 버튼
 * @returns {HTMLDivElement} 빈 상태 카드
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
 * 카드 그리드 생성
 * @param {Array} cards - 카드 배열
 * @param {Object} options - 그리드 옵션
 * @param {number} options.columns - 열 개수
 * @param {string} options.gap - 간격
 * @param {string} options.className - 추가 CSS 클래스
 * @returns {HTMLDivElement} 카드 그리드
 */
export function createCardGrid(cards = [], options = {}) {
    const {
        columns = 3,
        gap = '1rem',
        className = ''
    } = options;

    const grid = document.createElement('div');
    grid.className = `card-grid ${className}`;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(300px, 1fr))`;
    grid.style.gap = gap;

    cards.forEach(card => {
        grid.appendChild(card);
    });

    return grid;
} 