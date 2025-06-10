/**
 * @file Badge Components
 * @description 사용자 상태, 역할 등을 시각적으로 표시하는 뱃지(Badge) 컴포넌트를 생성하는 함수들을 제공합니다.
 * @module components/badges
 */

/**
 * 다양한 옵션을 사용하여 뱃지 엘리먼트를 생성합니다.
 * 모든 뱃지 생성의 기반이 되는 함수입니다.
 *
 * @param {object | string} options - 뱃지 생성을 위한 옵션 객체 또는 뱃지 텍스트.
 * @param {string} [className] - (텍스트 방식일 때) 뱃지에 추가할 CSS 클래스.
 * @returns {HTMLSpanElement} 생성된 뱃지 엘리먼트.
 */
export function createBadge(text = '', className = 'badge-primary') {
    if (typeof text === 'object' && text !== null) {
        return createBadgeAdvanced(text);
    }

    const badge = document.createElement('span');
    badge.className = `badge ${className}`;
    badge.textContent = text;

    return badge;
}

/**
 * 고급 뱃지 생성을 위한 내부 헬퍼 함수입니다. `createBadge`를 통해 호출됩니다.
 * @private
 * @param {object} options - 뱃지 생성을 위한 옵션 객체.
 * @param {string} [options.text=''] - 뱃지에 표시될 텍스트.
 * @param {string} [options.variant='primary'] - 뱃지의 색상 스타일 (e.g., 'primary', 'secondary', 'success').
 * @param {string} [options.size='medium'] - 뱃지의 크기 ('small', 'medium', 'large').
 * @param {string|null} [options.icon=null] - 뱃지에 표시될 Material Symbols Outlined 아이콘의 이름.
 * @param {string} [options.className=''] - 뱃지에 추가할 커스텀 CSS 클래스.
 * @param {string|null} [options.tooltip=null] - 뱃지에 마우스를 올렸을 때 표시될 툴팁 텍스트.
 * @returns {HTMLSpanElement} 생성된 뱃지 엘리먼트.
 */
export function createBadgeAdvanced(options = {}) {
    const {
        text = '',
        variant = 'primary',
        size = 'medium',
        icon = null,
        className = '',
        tooltip = null
    } = options;

    const badge = document.createElement('span');

    // 기본 클래스 설정
    const classes = ['badge', `badge-${variant}`];

    if (size !== 'medium') {
        classes.push(`badge-${size}`);
    }

    if (className) {
        classes.push(className);
    }

    badge.className = classes.join(' ');

    // 아이콘 추가
    if (icon) {
        const iconElement = document.createElement('span');
        iconElement.className = 'material-symbols-outlined';
        iconElement.textContent = icon;
        badge.appendChild(iconElement);
    }

    // 텍스트 추가
    if (text) {
        const textNode = document.createTextNode(text);
        badge.appendChild(textNode);
    }

    // 툴팁 추가
    if (tooltip) {
        badge.title = tooltip;
        badge.classList.add('has-tooltip');
    }

    return badge;
}

/**
 * 사용자의 이메일 인증 상태를 나타내는 뱃지를 생성합니다.
 *
 * @param {boolean} [isVerified=false] - 사용자의 인증 여부.
 * @param {Function|null} [onClick=null] - '미인증' 뱃지 클릭 시 실행될 콜백 함수 (인증 페이지 이동 등).
 * @returns {HTMLSpanElement} 생성된 인증 상태 뱃지.
 */
export function createVerificationBadge(isVerified = false, onClick = null) {
    if (isVerified) {
        return createBadgeAdvanced({
            text: '인증됨',
            variant: 'custom-verified',
            icon: 'verified',
            tooltip: '이메일 인증이 완료되었습니다.',
            className: 'verification-badge'
        });
    } else {
        const badge = createBadgeAdvanced({
            text: '미인증',
            variant: 'warning',
            icon: 'warning',
            tooltip: '이메일 인증이 필요합니다. 클릭하여 인증하세요.',
            className: 'verification-badge clickable'
        });

        if (onClick) {
            badge.addEventListener('click', onClick);
        }

        return badge;
    }
}

/**
 * 사용자의 역할을 나타내는 뱃지를 생성합니다.
 *
 * @param {string} [role='user'] - 사용자 역할 ('admin', 'moderator', 'premium', 'user').
 * @returns {HTMLSpanElement} 생성된 역할 뱃지.
 */
export function createRoleBadge(role = 'user') {
    const roleConfig = {
        admin: {
            text: '관리자',
            variant: 'danger',
            icon: 'admin_panel_settings',
            tooltip: '시스템 관리자'
        },
        moderator: {
            text: '운영자',
            variant: 'warning',
            icon: 'shield',
            tooltip: '커뮤니티 운영자'
        },
        premium: {
            text: '프리미엄',
            variant: 'info',
            icon: 'star',
            tooltip: '프리미엄 회원'
        },
        user: {
            text: '일반',
            variant: 'secondary',
            icon: 'person',
            tooltip: '일반 회원'
        }
    };

    const config = roleConfig[role] || roleConfig.user;

    return createBadgeAdvanced({
        ...config,
        className: `role-badge role-${role}`
    });
}

/**
 * 사용자의 온라인/오프라인 상태를 나타내는 뱃지를 생성합니다.
 *
 * @param {boolean} [isOnline=false] - 온라인 상태 여부.
 * @returns {HTMLSpanElement} 생성된 온라인 상태 뱃지.
 */
export function createOnlineBadge(isOnline = false) {
    return createBadgeAdvanced({
        text: isOnline ? '온라인' : '오프라인',
        variant: isOnline ? 'success' : 'secondary',
        icon: isOnline ? 'circle' : 'radio_button_unchecked',
        size: 'small',
        className: `online-badge ${isOnline ? 'online' : 'offline'}`
    });
}

/**
 * 새로운 알림의 개수를 표시하는 뱃지를 생성합니다.
 * 99개를 초과하면 '99+'로 표시됩니다.
 *
 * @param {number} [count=0] - 새로운 알림의 개수. 0이면 null을 반환합니다.
 * @returns {HTMLSpanElement|null} 생성된 알림 뱃지 또는 null.
 */
export function createNotificationBadge(count = 0) {
    if (count === 0) return null;

    const displayCount = count > 99 ? '99+' : count.toString();

    return createBadgeAdvanced({
        text: displayCount,
        variant: 'danger',
        size: 'small',
        className: 'notification-badge'
    });
}

/**
 * 계정이나 콘텐츠의 상태(활성, 비활성 등)를 나타내는 뱃지를 생성합니다.
 *
 * @param {string} [status='active'] - 상태 ('active', 'inactive', 'pending', 'suspended').
 * @returns {HTMLSpanElement} 생성된 상태 뱃지.
 */
export function createStatusBadge(status = 'active') {
    const statusConfig = {
        active: {
            text: '활성',
            variant: 'success',
            icon: 'check_circle'
        },
        inactive: {
            text: '비활성',
            variant: 'secondary',
            icon: 'cancel'
        },
        pending: {
            text: '대기중',
            variant: 'warning',
            icon: 'schedule'
        },
        suspended: {
            text: '정지',
            variant: 'danger',
            icon: 'block'
        }
    };

    const config = statusConfig[status] || statusConfig.active;

    return createBadgeAdvanced({
        ...config,
        className: `status-badge status-${status}`
    });
}

/**
 * 특별한 이벤트나 기념일을 위한 커스텀 뱃지를 생성합니다.
 *
 * @param {object} options - `createBadgeAdvanced`와 동일한 옵션을 사용하여 커스텀 뱃지를 설정합니다.
 * @returns {HTMLSpanElement} 생성된 커스텀 뱃지.
 */
export function createCustomBadge(options = {}) {
    return createBadgeAdvanced({
        variant: 'info',
        size: 'small',
        className: 'custom-badge',
        ...options
    });
}

/**
 * 여러 뱃지를 담는 컨테이너 엘리먼트를 생성합니다.
 *
 * @param {HTMLSpanElement[]} [badges=[]] - 컨테이너에 추가할 뱃지 엘리먼트의 배열.
 * @param {string} [className=''] - 컨테이너에 추가할 커스텀 CSS 클래스.
 * @returns {HTMLDivElement} 생성된 뱃지 컨테이너.
 */
export function createBadgeContainer(badges = [], className = '') {
    const container = document.createElement('div');
    container.className = `badge-container ${className}`;

    badges.forEach((badge) => {
        if (badge) {
            container.appendChild(badge);
        }
    });

    return container;
}
