/**
 * Badge Components
 * 사용자 상태, 역할 등을 표시하는 뱃지 컴포넌트들을 제공합니다.
 */

/**
 * 간단한 뱃지 생성 (텍스트와 클래스만)
 * @param {string} text - 뱃지 텍스트
 * @param {string} className - CSS 클래스
 * @returns {HTMLSpanElement} 뱃지 엘리먼트
 */
export function createBadge(text = '', className = 'badge-primary') {
    // 첫 번째 매개변수가 객체인 경우 (기존 방식)
    if (typeof text === 'object' && text !== null) {
        return createBadgeAdvanced(text);
    }
    
    // 간단한 방식
    const badge = document.createElement('span');
    badge.className = `badge ${className}`;
    badge.textContent = text;
    
    return badge;
}

/**
 * 고급 뱃지 생성 (객체 옵션)
 * @param {Object} options - 뱃지 옵션
 * @param {string} options.text - 뱃지 텍스트
 * @param {string} options.variant - 뱃지 스타일 ('primary', 'secondary', 'success', 'warning', 'danger', 'info')
 * @param {string} options.size - 뱃지 크기 ('small', 'medium', 'large')
 * @param {string} options.icon - Material Icons 아이콘 이름
 * @param {string} options.className - 추가 CSS 클래스
 * @param {string} options.tooltip - 툴팁 텍스트
 * @returns {HTMLSpanElement} 뱃지 엘리먼트
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
 * 인증 상태 뱃지 생성
 * @param {boolean} isVerified - 인증 여부
 * @param {Function} onClick - 클릭 이벤트 핸들러 (미인증 시)
 * @returns {HTMLSpanElement} 인증 상태 뱃지
 */
export function createVerificationBadge(isVerified = false, onClick = null) {
    if (isVerified) {
        return createBadgeAdvanced({
            text: '인증됨',
            variant: 'success',
            icon: 'verified',
            tooltip: '이메일 인증이 완료되었습니다.',
            className: 'verified-badge'
        });
    } else {
        const badge = createBadgeAdvanced({
            text: '미인증',
            variant: 'warning',
            icon: 'warning',
            tooltip: '이메일 인증이 필요합니다. 클릭하여 인증하세요.',
            className: 'unverified-badge clickable'
        });

        if (onClick) {
            badge.addEventListener('click', onClick);
            badge.style.cursor = 'pointer';
        }

        return badge;
    }
}

/**
 * 역할 뱃지 생성
 * @param {string} role - 사용자 역할 ('admin', 'moderator', 'user', 'premium')
 * @returns {HTMLSpanElement} 역할 뱃지
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
 * 온라인 상태 뱃지 생성
 * @param {boolean} isOnline - 온라인 여부
 * @returns {HTMLSpanElement} 온라인 상태 뱃지
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
 * 새 알림 뱃지 생성
 * @param {number} count - 알림 개수
 * @returns {HTMLSpanElement} 알림 뱃지
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
 * 상태 뱃지 생성
 * @param {string} status - 상태 ('active', 'inactive', 'pending', 'suspended')
 * @returns {HTMLSpanElement} 상태 뱃지
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
 * 커스텀 뱃지 생성 (특별한 이벤트나 기념일용)
 * @param {Object} options - 커스텀 뱃지 옵션
 * @returns {HTMLSpanElement} 커스텀 뱃지
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
 * 뱃지 컨테이너 생성
 * @param {Array} badges - 뱃지 배열
 * @param {string} className - 추가 CSS 클래스
 * @returns {HTMLDivElement} 뱃지 컨테이너
 */
export function createBadgeContainer(badges = [], className = '') {
    const container = document.createElement('div');
    container.className = `badge-container ${className}`;
    
    badges.forEach(badge => {
        if (badge) {
            container.appendChild(badge);
        }
    });
    
    return container;
} 