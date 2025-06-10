/**
 * @file Modal Components
 * @description 다양한 종류의 모달(팝업) 창을 생성하고 관리하는 함수들을 제공합니다.
 * @module components/modals
 */

import { createButton } from '../buttons/index.js';

/**
 * 모든 모달의 기반이 되는 기본 모달 엘리먼트를 생성합니다.
 * 내부적으로 다른 모달 생성 함수들(`createConfirmModal`, `createFormModal` 등)에 의해 사용됩니다.
 *
 * @param {object} options - 모달 생성을 위한 옵션 객체.
 * @param {string} [options.title='알림'] - 모달의 제목.
 * @param {string|HTMLElement} [options.content=''] - 모달의 주 내용. 문자열 또는 HTML 엘리먼트.
 * @param {string|null} [options.cancelText='취소'] - 취소 버튼의 텍스트. null일 경우 버튼이 생성되지 않음.
 * @param {string|null} [options.confirmText='확인'] - 확인 버튼의 텍스트. null일 경우 버튼이 생성되지 않음.
 * @param {string} [options.size='md'] - 모달의 크기 ('sm', 'md', 'lg', 'xl').
 * @param {Function|null} [options.onCancel=null] - 취소 버튼 클릭 또는 모달이 닫힐 때 실행될 콜백 함수.
 * @param {Function|null} [options.onConfirm=null] - 확인 버튼 클릭 시 실행될 콜백 함수.
 * @param {boolean} [options.showCloseButton=true] - 헤더의 닫기(X) 버튼 표시 여부.
 * @param {string} [options.className=''] - 모달 컨테이너에 추가할 커스텀 CSS 클래스.
 * @returns {HTMLElement} 생성된 모달의 최상위 엘리먼트 (overlay).
 */
export function createModal(options = {}) {
    const {
        title = '알림',
        content = '',
        cancelText = '취소',
        confirmText = '확인',
        size = 'md', // 'sm', 'md', 'lg', 'xl'
        onCancel = null,
        onConfirm = null,
        showCloseButton = true,
        className = ''
    } = options;

    // 모달 배경
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // 모달 컨테이너
    const modal = document.createElement('div');
    modal.className = `modal modal-${size} ${className}`;

    // 헤더
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleElement = document.createElement('h3');
    titleElement.className = 'modal-title';
    titleElement.textContent = title;
    header.appendChild(titleElement);

    if (showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML =
            '<span class="material-symbols-outlined">close</span>';
        closeButton.addEventListener('click', () => {
            closeModal(overlay);
            if (onCancel) onCancel();
        });
        header.appendChild(closeButton);
    }

    // 본문
    const body = document.createElement('div');
    body.className = 'modal-body';

    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }

    // 푸터 (통합된 createButton 함수 사용)
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    // 버튼들을 1:1 비율로 배치 (CSS와 함께 확실히 보장)
    footer.style.display = 'flex';
    footer.style.gap = '0.75rem';
    footer.style.justifyContent = 'stretch';

    if (onCancel || cancelText) {
        const cancelButton = createButton({
            text: cancelText,
            variant: 'secondary',
            onClick: () => {
                closeModal(overlay);
                if (onCancel) onCancel();
            }
        });

        cancelButton.style.flex = '1'; // 1:1 비율
        footer.appendChild(cancelButton);
    }

    if (onConfirm || confirmText) {
        const confirmButton = createButton({
            text: confirmText,
            variant: options._internal?.confirmButtonVariant || 'primary',
            onClick: () => {
                closeModal(overlay);
                if (onConfirm) onConfirm();
            }
        });

        confirmButton.style.flex = '1'; // 1:1 비율
        footer.appendChild(confirmButton);
    }

    // 모달 구조 조립
    modal.appendChild(header);
    modal.appendChild(body);
    if (footer.children.length > 0) {
        modal.appendChild(footer);
    }

    overlay.appendChild(modal);

    // 배경 클릭으로 닫기
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay);
            if (onCancel) onCancel();
        }
    });

    // ESC 키로 닫기
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal(overlay);
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', handleEscape);

    // 모달 열기
    setTimeout(() => {
        overlay.classList.add('show');
        modal.classList.add('show');
    }, 10);

    // cleanup 함수 추가
    overlay._cleanup = () => {
        document.removeEventListener('keydown', handleEscape);
    };

    return overlay;
}

/**
 * 아이콘과 메시지, 확인 버튼만 포함된 간단한 확인용 모달을 생성합니다.
 *
 * @param {object} options - 모달 옵션.
 * @param {string} [options.title='알림'] - 모달 제목.
 * @param {string} [options.message=''] - 표시될 메시지.
 * @param {string} [options.confirmText='확인'] - 확인 버튼 텍스트.
 * @param {Function|null} [options.onConfirm=null] - 확인 버튼 클릭 콜백.
 * @param {string} [options.variant='info'] - 모달의 상태를 나타내는 스타일 ('info', 'success', 'warning', 'danger'). 아이콘과 색상에 영향을 줍니다.
 * @returns {HTMLElement} 생성된 모달 엘리먼트.
 */
export function createConfirmModal(options = {}) {
    const {
        title = '알림',
        message = '',
        confirmText = '확인',
        onConfirm = null,
        variant = 'info' // 'info', 'success', 'warning', 'danger'
    } = options;

    const modal = createModal({
        title,
        content: `<div class="modal-message modal-message-${variant}">
            <span class="material-symbols-outlined">${getModalIcon(
                variant
            )}</span>
            <p>${message}</p>
        </div>`,
        confirmText,
        cancelText: null,
        onConfirm,
        onCancel: null
    });

    return modal;
}

/**
 * 아이콘, 메시지, 그리고 확인/취소 버튼을 포함한 모달을 생성합니다.
 * 사용자에게 중요한 작업을 확인받을 때 사용됩니다.
 *
 * @param {object} options - 모달 옵션.
 * @param {string} [options.title='확인'] - 모달 제목.
 * @param {string} [options.message=''] - 표시될 메시지.
 * @param {string} [options.confirmText='확인'] - 확인 버튼 텍스트.
 * @param {string} [options.cancelText='취소'] - 취소 버튼 텍스트.
 * @param {Function|null} [options.onConfirm=null] - 확인 버튼 클릭 콜백.
 * @param {Function|null} [options.onCancel=null] - 취소 버튼 클릭 콜백.
 * @param {string} [options.variant='warning'] - 모달의 상태 스타일 ('info', 'success', 'warning', 'danger'). 아이콘과 확인 버튼 색상에 영향을 줍니다.
 * @returns {HTMLElement} 생성된 모달 엘리먼트.
 */
export function createConfirmCancelModal(options = {}) {
    const {
        title = '확인',
        message = '',
        confirmText = '확인',
        cancelText = '취소',
        onConfirm = null,
        onCancel = null,
        variant = 'warning'
    } = options;

    const confirmButtonVariant =
        variant === 'danger' || variant === 'warning' ? variant : 'primary';

    const modal = createModal({
        title,
        content: `<div class="modal-message modal-message-${variant}">
            <span class="material-symbols-outlined">${getModalIcon(
                variant
            )}</span>
            <p>${message}</p>
        </div>`,
        confirmText,
        cancelText,
        onConfirm,
        onCancel,
        _internal: {
            confirmButtonVariant
        }
    });

    return modal;
}

/**
 * 여러 입력 필드를 포함하는 폼(Form) 형태의 모달을 생성합니다.
 *
 * @param {object} options - 모달 옵션.
 * @param {string} [options.title='입력'] - 모달 제목.
 * @param {Array<object>} [options.fields=[]] - 폼에 포함될 입력 필드 정보 배열.
 * @param {string} [options.submitText='저장'] - 제출 버튼 텍스트.
 * @param {string} [options.cancelText='취소'] - 취소 버튼 텍스트.
 * @param {Function|null} [options.onSubmit=null] - 폼 제출 시 실행될 콜백. 폼 데이터를 인자로 받습니다.
 * @param {Function|null} [options.onCancel=null] - 취소 버튼 클릭 콜백.
 * @returns {HTMLElement} 생성된 모달 엘리먼트.
 */
export function createFormModal(options = {}) {
    const {
        title = '입력',
        fields = [],
        submitText = '저장',
        cancelText = '취소',
        onSubmit = null,
        onCancel = null
    } = options;

    // 폼 생성
    const form = document.createElement('form');
    form.className = 'modal-form';

    fields.forEach((field) => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-group';

        if (field.label) {
            const label = document.createElement('label');
            label.textContent = field.label;
            label.className = 'form-label';
            fieldContainer.appendChild(label);
        }

        const input = document.createElement(
            field.type === 'textarea' ? 'textarea' : 'input'
        );
        input.className = 'form-input';

        if (field.type !== 'textarea') {
            input.type = field.type || 'text';
        }

        if (field.name) input.name = field.name;
        if (field.value) input.value = field.value;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.required) input.required = true;

        fieldContainer.appendChild(input);
        form.appendChild(fieldContainer);
    });

    const modal = createModal({
        title,
        content: form,
        confirmText: submitText,
        cancelText,
        onConfirm: () => {
            if (onSubmit) {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                onSubmit(data);
            }
        },
        onCancel
    });

    return modal;
}

/**
 * 로딩 모달 생성
 */
export function createLoadingModal(options = {}) {
    const { title = '처리 중...', message = '잠시만 기다려주세요.' } = options;

    const loadingContent = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-message">${message}</p>
        </div>
    `;

    const modal = createModal({
        title,
        content: loadingContent,
        showCloseButton: false,
        confirmText: null,
        cancelText: null
    });

    return modal;
}

/**
 * 이미지 모달 생성
 */
export function createImageModal(options = {}) {
    const { title = '이미지', src = '', alt = 'Image' } = options;

    const imageContent = `
        <div class="image-container">
            <img src="${src}" alt="${alt}" class="modal-image">
        </div>
    `;

    const modal = createModal({
        title,
        content: imageContent,
        size: 'lg',
        confirmText: null,
        cancelText: '닫기',
        onCancel: null
    });

    return modal;
}

/**
 * 모달을 부드럽게 닫고 DOM에서 제거합니다.
 * @param {HTMLElement} modal - 닫을 모달의 최상위 엘리먼트 (overlay).
 */
export function closeModal(modal) {
    if (!modal) return;

    const modalContent = modal.querySelector('.modal');
    if (modalContent) {
        modalContent.classList.remove('show');
    }
    modal.classList.remove('show');

    setTimeout(() => {
        if (modal._cleanup) {
            modal._cleanup();
        }
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

/**
 * 생성된 모달을 `document.body`에 추가하고 화면에 표시합니다.
 * @param {HTMLElement} modal - 표시할 모달의 최상위 엘리먼트.
 */
export function showModal(modal) {
    if (!modal) return;

    document.body.appendChild(modal);

    // 포커스 트랩
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
    }
}

/**
 * 내장된 간단한 경고창(alert)을 띄웁니다.
 * @param {string} message - 표시할 메시지.
 * @param {string} [title='알림'] - 창의 제목.
 */
export function alert(message, title = '알림') {
    const modal = createConfirmModal({
        title,
        message,
        variant: 'info'
    });
    showModal(modal);
    return modal;
}

/**
 * 내장된 간단한 확인창(confirm)을 띄웁니다.
 * @param {string} message - 표시할 메시지.
 * @param {string} [title='확인'] - 창의 제목.
 * @returns {Promise<boolean>} 사용자가 '확인'을 누르면 resolve(true), '취소'를 누르면 resolve(false)되는 프로미스.
 */
export function confirm(message, title = '확인') {
    return new Promise((resolve) => {
        const modal = createConfirmCancelModal({
            title,
            message,
            variant: 'warning',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
        showModal(modal);
    });
}

/**
 * 성공 알림 모달
 */
export function showSuccess(message, title = '성공') {
    const modal = createConfirmModal({
        title,
        message,
        variant: 'success'
    });
    showModal(modal);
    return modal;
}

/**
 * 오류 알림 모달
 */
export function showError(message, title = '오류') {
    const modal = createConfirmModal({
        title,
        message,
        variant: 'danger'
    });
    showModal(modal);
    return modal;
}

/**
 * 경고 알림 모달
 */
export function showWarning(message, title = '경고') {
    const modal = createConfirmModal({
        title,
        message,
        variant: 'warning'
    });
    showModal(modal);
    return modal;
}

// 헬퍼 함수들
function getModalIcon(variant) {
    switch (variant) {
        case 'success':
            return 'check_circle';
        case 'danger':
            return 'error';
        case 'warning':
            return 'warning';
        case 'info':
        default:
            return 'info';
    }
}
