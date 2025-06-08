/**
 * Modal Components
 * 다양한 모달 컴포넌트들을 제공합니다.
 */

/**
 * 기본 모달 생성
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
        closeButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
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
        const cancelButton = window.Components?.createButton ? 
            window.Components.createButton({
                text: cancelText,
                variant: 'secondary',
                onClick: () => {
                    closeModal(overlay);
                    if (onCancel) onCancel();
                }
            }) :
            createFallbackButton(cancelText, 'cancel-button', () => {
                closeModal(overlay);
                if (onCancel) onCancel();
            });
        
        cancelButton.style.flex = '1';  // 1:1 비율
        footer.appendChild(cancelButton);
    }

    if (onConfirm || confirmText) {
        const confirmButton = window.Components?.createButton ?
            window.Components.createButton({
                text: confirmText,
                variant: 'primary',
                onClick: () => {
                    closeModal(overlay);
                    if (onConfirm) onConfirm();
                }
            }) :
            createFallbackButton(confirmText, 'confirm-button', () => {
                closeModal(overlay);
                if (onConfirm) onConfirm();
            });
        
        confirmButton.style.flex = '1';  // 1:1 비율
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
        overlay.classList.add('active');
        modal.classList.add('active');
    }, 10);

    // cleanup 함수 추가
    overlay._cleanup = () => {
        document.removeEventListener('keydown', handleEscape);
    };

    return overlay;
}

/**
 * 확인 모달 생성 (확인 버튼만)
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
            <span class="material-symbols-outlined">${getModalIcon(variant)}</span>
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
 * 확인/취소 모달 생성
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

    const modal = createModal({
        title,
        content: `<div class="modal-message modal-message-${variant}">
            <span class="material-symbols-outlined">${getModalIcon(variant)}</span>
            <p>${message}</p>
        </div>`,
        confirmText,
        cancelText,
        onConfirm,
        onCancel
    });

    return modal;
}

/**
 * 폼 모달 생성
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

    fields.forEach(field => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-group';

        if (field.label) {
            const label = document.createElement('label');
            label.textContent = field.label;
            label.className = 'form-label';
            fieldContainer.appendChild(label);
        }

        const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
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
    const {
        title = '처리 중...',
        message = '잠시만 기다려주세요.'
    } = options;

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
    const {
        title = '이미지',
        src = '',
        alt = 'Image'
    } = options;

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
 * 모달 닫기
 */
export function closeModal(modal) {
    if (!modal) return;

    const modalElement = modal.querySelector('.modal');
    if (modalElement) {
        modalElement.classList.remove('active');
    }
    modal.classList.remove('active');

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
 * 모달 표시
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
 * 알림 모달 (간편 함수)
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
 * 확인 모달 (간편 함수)
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
    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        danger: 'error'
    };
    return icons[variant] || 'info';
}

function createFallbackButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`;
    button.textContent = text;
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    return button;
} 