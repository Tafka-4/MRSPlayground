import {
    initializeComponents,
    loadSavedTheme,
    createButton,
    createInput,
    showSuccess,
    showError
} from '/component/index.js';

class EditPasswordPage {
    constructor() {
        this.cacheDOM();
        this.renderForm();
        this.attachEventListeners();
    }

    cacheDOM() {
        this.formContainer = document.querySelector('#password-form-container');
        this.actionsContainer = document.querySelector(
            '#password-form-actions'
        );
        this.sideNav = document.querySelector('.side-nav');
        this.navBackdrop = document.querySelector('.nav-backdrop');
        this.mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    }

    renderForm() {
        const currentPasswordInput = createInput({
            id: 'current-password',
            label: '현재 비밀번호',
            type: 'password',
            placeholder: '현재 비밀번호를 입력하세요',
            icon: 'lock'
        });

        const newPasswordInput = createInput({
            id: 'new-password',
            label: '새 비밀번호',
            type: 'password',
            placeholder: '새 비밀번호를 입력하세요',
            icon: 'lock_reset'
        });

        const confirmPasswordInput = createInput({
            id: 'confirm-password',
            label: '새 비밀번호 확인',
            type: 'password',
            placeholder: '새 비밀번호를 다시 입력하세요',
            icon: 'check_circle'
        });

        this.formContainer.append(
            currentPasswordInput,
            newPasswordInput,
            confirmPasswordInput
        );

        this.currentPasswordInput =
            currentPasswordInput.querySelector('#current-password');
        this.newPasswordInput = newPasswordInput.querySelector('#new-password');
        this.confirmPasswordInput =
            confirmPasswordInput.querySelector('#confirm-password');

        this.saveButton = createButton({
            id: 'save-password-button',
            text: '비밀번호 변경',
            style: 'primary',
            onClick: this.handleChangePassword.bind(this)
        });

        this.actionsContainer.appendChild(this.saveButton);
    }

    attachEventListeners() {
        this.mobileNavToggle.addEventListener('click', () =>
            this.toggleSideNav()
        );
        this.navBackdrop.addEventListener('click', () => this.closeSideNav());
    }

    toggleSideNav() {
        const isOpen = document.body.classList.contains('side-nav-open');
        if (isOpen) {
            this.closeSideNav();
        } else {
            document.body.classList.add('side-nav-open');
            this.navBackdrop.style.display = 'block';
        }
    }

    closeSideNav() {
        document.body.classList.remove('side-nav-open');
        this.navBackdrop.style.display = 'none';
    }

    async handleChangePassword(event) {
        event.preventDefault();
        const currentPassword = this.currentPasswordInput.value;
        const newPassword = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            showError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const response = await fetch('/api/v1/auth/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess('비밀번호가 성공적으로 변경되었습니다.');
                this.currentPasswordInput.value = '';
                this.newPasswordInput.value = '';
                this.confirmPasswordInput.value = '';
            } else {
                showError(result.message || '비밀번호 변경에 실패했습니다.');
            }
        } catch (err) {
            console.error('Error changing password:', err);
            showError('서버 오류로 비밀번호 변경에 실패했습니다.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
    new EditPasswordPage();
});
