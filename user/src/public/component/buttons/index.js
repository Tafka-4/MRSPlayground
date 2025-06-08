/**
 * Button Components
 * 통합되고 개선된 버튼 컴포넌트들을 제공합니다.
 */

/**
 * 통합 버튼 생성 함수
 * @param {string|Object} textOrOptions - 버튼 텍스트 또는 옵션 객체
 * @param {string} [className] - CSS 클래스 (문자열인 경우)
 * @param {Function} [onClick] - 클릭 이벤트 핸들러 (문자열인 경우)
 * @returns {HTMLButtonElement} 버튼 엘리먼트
 */
export function createButton(textOrOptions = '', className = 'btn-primary', onClick = null) {
    // 옵션 객체가 전달된 경우
    if (typeof textOrOptions === 'object' && textOrOptions !== null) {
        return createAdvancedButton(textOrOptions);
    }
    
    // 간단한 문자열 방식
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`;
    button.textContent = textOrOptions;
    
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * 고급 버튼 생성 함수 (내부 함수)
 * @param {Object} options - 버튼 옵션
 * @returns {HTMLButtonElement} 버튼 엘리먼트
 */
function createAdvancedButton(options = {}) {
    const {
        text = '',
        variant = 'primary',
        size = 'medium',
        outline = false,
        icon = null,
        iconPosition = 'left', // 'left', 'right', 'only'
        onClick = null,
        disabled = false,
        type = 'button',
        className = '',
        fullWidth = false,
        loading = false
    } = options;

    const button = document.createElement('button');
    button.type = type;
    button.disabled = disabled || loading;

    // 기본 클래스 설정
    const classes = ['btn'];
    
    // 변형 클래스 추가
    if (outline) {
        classes.push(`btn-outline-${variant}`);
    } else {
        classes.push(`btn-${variant}`);
    }
    
    // 크기 클래스 추가
    if (size !== 'medium') {
        classes.push(`btn-${size}`);
    }
    
    // 전체 너비
    if (fullWidth) {
        classes.push('btn-full-width');
    }
    
    // 로딩 상태
    if (loading) {
        classes.push('btn-loading');
    }
    
    // 추가 클래스
    if (className) {
        classes.push(className);
    }
    
    button.className = classes.join(' ');

    // 콘텐츠 구성
    if (loading) {
        // 로딩 상태
        const spinner = document.createElement('span');
        spinner.className = 'btn-spinner';
        button.appendChild(spinner);
        
        if (text) {
            const textNode = document.createTextNode(' ' + text);
            button.appendChild(textNode);
        }
    } else if (iconPosition === 'only' && icon) {
        // 아이콘만
        const iconElement = document.createElement('span');
        iconElement.className = 'material-symbols-outlined';
        iconElement.textContent = icon;
        button.appendChild(iconElement);
    } else {
        // 일반적인 구성
        if (icon && iconPosition === 'left') {
            const iconElement = document.createElement('span');
            iconElement.className = 'material-symbols-outlined';
            iconElement.textContent = icon;
            button.appendChild(iconElement);
        }

        if (text) {
            const textNode = document.createTextNode(text);
            button.appendChild(textNode);
        }

        if (icon && iconPosition === 'right') {
            const iconElement = document.createElement('span');
            iconElement.className = 'material-symbols-outlined';
            iconElement.textContent = icon;
            button.appendChild(iconElement);
        }
    }

    // 클릭 이벤트 추가
    if (onClick && !loading) {
        button.addEventListener('click', onClick);
    }

    return button;
}

// 하위 호환성을 위한 별칭
export const createButtonAdvanced = createButton;

/**
 * 특정 용도별 버튼 생성 함수들
 */

/**
 * 로그아웃 버튼 생성
 */
export function createLogoutButton(onClick = null) {
    return createButton({
        text: '로그아웃',
        variant: 'danger',
        icon: 'logout',
        onClick: onClick || (() => {
            if (confirm('로그아웃 하시겠습니까?')) {
                window.location.href = '/auth/logout';
            }
        })
    });
}

/**
 * 관리자 버튼 생성
 */
export function createAdminButton(onClick = null) {
    return createButton({
        text: '관리자',
        variant: 'warning',
        icon: 'admin_panel_settings',
        onClick: onClick || (() => {
            window.location.href = '/admin/dashboard';
        })
    });
}

/**
 * 편집 버튼 생성
 */
export function createEditButton(onClick = null) {
    return createButton({
        text: '편집',
        variant: 'primary',
        icon: 'edit',
        onClick
    });
}

/**
 * 삭제 버튼 생성
 */
export function createDeleteButton(onClick = null) {
    return createButton({
        text: '삭제',
        variant: 'danger',
        icon: 'delete',
        onClick
    });
}

/**
 * 저장 버튼 생성
 */
export function createSaveButton(onClick = null) {
    return createButton({
        text: '저장',
        variant: 'success',
        icon: 'save',
        type: 'submit',
        onClick
    });
}

/**
 * 취소 버튼 생성
 */
export function createCancelButton(onClick = null) {
    return createButton({
        text: '취소',
        variant: 'secondary',
        icon: 'close',
        onClick
    });
}

/**
 * 확인 버튼 생성
 */
export function createConfirmButton(onClick = null) {
    return createButton({
        text: '확인',
        variant: 'primary',
        icon: 'check',
        onClick
    });
}

/**
 * 이미지 업로드 버튼 생성
 */
export function createImageUploadButton(onClick = null) {
    return createButton({
        text: '업로드',
        variant: 'primary',
        size: 'small',
        icon: 'upload',
        onClick
    });
}

/**
 * 이미지 삭제 버튼 생성
 */
export function createImageDeleteButton(onClick = null) {
    return createButton({
        text: '삭제',
        variant: 'danger',
        size: 'small',
        icon: 'delete',
        onClick
    });
}

/**
 * 다크모드 토글 버튼 생성
 */
export function createDarkModeToggleButton(onToggle = null) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.setAttribute('aria-label', '다크모드 토글');
    
    // 현재 테마 확인
    const getCurrentTheme = () => {
        return document.documentElement.getAttribute('data-theme') || 'light';
    };
    
    // 버튼 내용 업데이트
    const updateButton = () => {
        const isDark = getCurrentTheme() === 'dark';
        button.innerHTML = '';
        
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        button.appendChild(icon);
        
        const text = document.createTextNode(isDark ? ' 라이트모드' : ' 다크모드');
        button.appendChild(text);
    };
    
    // 초기 상태 설정
    updateButton();
    
    // 클릭 이벤트
    button.addEventListener('click', () => {
        if (typeof window.Components !== 'undefined' && window.Components.toggleDarkMode) {
            window.Components.toggleDarkMode();
        } else if (onToggle) {
            onToggle();
        }
        
        // 버튼 내용 업데이트
        setTimeout(updateButton, 50);
    });
    
    // 테마 변경 이벤트 리스너
    window.addEventListener('themeChanged', updateButton);
    
    return button;
}

/**
 * 비밀번호 가시성 토글 버튼 생성
 */
export function createPasswordToggleButton(passwordInput) {
    if (!passwordInput) {
        console.error('Password input element is required');
        return null;
    }
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'visibility-container';
    button.setAttribute('aria-label', '비밀번호 표시/숨김');
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'visibility_off';
    
    button.appendChild(icon);
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.textContent = 'visibility';
        } else {
            passwordInput.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });
    
    return button;
}

/**
 * 로딩 버튼 생성
 */
export function createLoadingButton(text = '로딩 중...', variant = 'primary') {
    return createButton({
        text,
        variant,
        loading: true,
        disabled: true
    });
}

/**
 * 버튼 그룹 생성
 */
export function createButtonGroup(buttons = [], className = '') {
    const group = document.createElement('div');
    group.className = `btn-group ${className}`;
    
    buttons.forEach(button => {
        group.appendChild(button);
    });
    
    return group;
} 