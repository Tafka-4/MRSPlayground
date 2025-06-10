/**
 * @file Button Components
 * @description 재사용 가능한 버튼 컴포넌트를 생성하는 함수들을 제공합니다.
 *
 * @module components/buttons
 *
 * @requires module:./utils - 유틸리티 함수
 * @requires module:./constants - 상수
 */

/**
 * 다양한 옵션을 사용하여 버튼 엘리먼트를 생성합니다.
 * 아이콘, 사이즈, 색상(variant), 로딩 상태 등 다양한 형태의 버튼을 만들 수 있습니다.
 * 이 함수는 하위 호환성을 위해 텍스트 방식 호출도 지원합니다.
 *
 * @param {object | string} textOrOptions - 버튼 생성을 위한 옵션 객체 또는 버튼 텍스트.
 * @param {string} [className] - (텍스트 방식일 때) 버튼에 추가할 CSS 클래스.
 * @param {Function} [onClick] - (텍스트 방식일 때) 클릭 이벤트 핸들러.
 * @returns {HTMLButtonElement} 생성된 버튼 엘리먼트.
 */
export function createButton(
    textOrOptions = '',
    className = 'btn-primary',
    onClick = null
) {
    if (typeof textOrOptions === 'object' && textOrOptions !== null) {
        return createAdvancedButton(textOrOptions);
    }

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
 * 고급 버튼 생성을 위한 내부 헬퍼 함수입니다. `createButton`이 옵션 객체를 받을 때 호출됩니다.
 * @private
 * @param {object} options - 버튼 생성을 위한 옵션 객체.
 * @param {string} [options.text=''] - 버튼에 표시될 텍스트.
 * @param {string} [options.variant='primary'] - 버튼의 색상 스타일 (e.g., 'primary', 'secondary', 'danger').
 * @param {string} [options.size='medium'] - 버튼의 크기 ('sm', 'medium', 'lg').
 * @param {boolean} [options.outline=false] - 외곽선 스타일 적용 여부.
 * @param {string|null} [options.icon=null] - 버튼에 표시될 Material Symbols Outlined 아이콘의 이름.
 * @param {string} [options.iconPosition='left'] - 아이콘의 위치 ('left', 'right', 'only').
 * @param {Function|null} [options.onClick=null] - 버튼 클릭 시 실행될 콜백 함수.
 * @param {boolean} [options.disabled=false] - 버튼 비활성화 여부.
 * @param {string} [options.type='button'] - 버튼의 type 속성 ('button', 'submit', 'reset').
 * @param {string} [options.className=''] - 버튼에 추가할 커스텀 CSS 클래스.
 * @param {boolean} [options.fullWidth=false] - 버튼이 부모 요소의 전체 너비를 차지할지 여부.
 * @param {boolean} [options.loading=false] - 로딩 상태 표시 여부 (스피너 아이콘 표시).
 * @returns {HTMLButtonElement} 생성된 버튼 엘리먼트.
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
 * 특정 용도에 맞게 미리 스타일된 버튼들을 생성하는 래퍼 함수들입니다.
 * 각 함수는 내부적으로 `createButton`을 호출하여 일관된 버튼을 생성합니다.
 */

/**
 * 로그아웃 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 커스텀 클릭 핸들러. 기본값은 로그아웃 확인 후 페이지 이동입니다.
 * @returns {HTMLButtonElement} 로그아웃 버튼 엘리먼트.
 */
export function createLogoutButton(onClick = null) {
    return createButton({
        text: '로그아웃',
        variant: 'danger',
        icon: 'logout',
        onClick:
            onClick ||
            (() => {
                if (confirm('로그아웃 하시겠습니까?')) {
                    window.location.href = '/auth/logout';
                }
            })
    });
}

/**
 * 관리자 페이지 이동 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 커스텀 클릭 핸들러. 기본값은 관리자 페이지로 이동입니다.
 * @returns {HTMLButtonElement} 관리자 버튼 엘리먼트.
 */
export function createAdminButton(onClick = null) {
    return createButton({
        text: '관리자',
        variant: 'warning',
        icon: 'admin_panel_settings',
        onClick:
            onClick ||
            (() => {
                window.location.href = '/admin/dashboard';
            })
    });
}

/**
 * 편집 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 편집 버튼 엘리먼트.
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
 * 삭제 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 삭제 버튼 엘리먼트.
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
 * 저장 버튼을 생성합니다. 기본적으로 `type="submit"` 입니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 저장 버튼 엘리먼트.
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
 * 취소 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 취소 버튼 엘리먼트.
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
 * 확인 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 확인 버튼 엘리먼트.
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
 * 이미지 업로드 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 이미지 업로드 버튼 엘리먼트.
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
 * 이미지 삭제 버튼을 생성합니다.
 * @param {Function|null} [onClick=null] - 클릭 시 실행될 콜백 함수.
 * @returns {HTMLButtonElement} 이미지 삭제 버튼 엘리먼트.
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
 * 다크 모드/라이트 모드 전환 토글 버튼을 생성합니다.
 * @param {Function|null} [onToggle=null] - 테마가 변경될 때 호출될 콜백 함수.
 * @returns {HTMLButtonElement} 다크 모드 토글 버튼 엘리먼트.
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

        const text = document.createTextNode(
            isDark ? ' 라이트모드' : ' 다크모드'
        );
        button.appendChild(text);
    };

    // 초기 상태 설정
    updateButton();

    // 클릭 이벤트
    button.addEventListener('click', () => {
        if (
            typeof window.Components !== 'undefined' &&
            window.Components.toggleDarkMode
        ) {
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
 * 비밀번호 필드의 표시/숨김을 토글하는 버튼을 생성합니다.
 * @param {HTMLInputElement} passwordInput - 제어할 비밀번호 입력 `<input>` 엘리먼트.
 * @returns {HTMLButtonElement} 비밀번호 토글 버튼 엘리먼트.
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
 * 로딩 상태의 버튼을 생성합니다.
 * @param {string} [text='로딩 중...'] - 로딩 중에 표시될 텍스트.
 * @param {string} [variant='primary'] - 버튼의 색상 스타일.
 * @returns {HTMLButtonElement} 로딩 버튼 엘리먼트.
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
 * 여러 버튼을 그룹으로 묶어 반환합니다.
 * @param {HTMLButtonElement[]} [buttons=[]] - 그룹에 포함될 버튼 엘리먼트의 배열.
 * @param {string} [className=''] - 버튼 그룹 컨테이너에 추가할 CSS 클래스.
 * @returns {HTMLDivElement} 버튼 그룹 컨테이너 엘리먼트.
 */
export function createButtonGroup(buttons = [], className = '') {
    const group = document.createElement('div');
    group.className = `btn-group ${className}`;

    buttons.forEach((button) => {
        group.appendChild(button);
    });

    return group;
}
