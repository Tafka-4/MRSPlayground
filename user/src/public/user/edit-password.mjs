import {
    initializeComponents,
    loadSavedTheme,
    createButton,
    createInput,
    showSuccess,
    showError
} from '/component/index.js';
import { createConfirmCancelModal } from '/component/modals/index.js';
import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';

class EditPasswordPage {
    constructor() {
        this.cacheDOM();
        this.renderForm();
        this.attachEventListeners();
    }

    cacheDOM() {
        this.currentPasswordContainer = document.querySelector('#current-password-container');
        this.newPasswordContainer = document.querySelector('#new-password-container');
        this.confirmPasswordContainer = document.querySelector('#confirm-password-container');
        this.actionsContainer = document.querySelector('#form-actions');
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
            icon: 'lock',
            validation: null
        });

        const newPasswordInput = createInput({
            id: 'new-password',
            label: '새 비밀번호',
            type: 'password',
            placeholder: '새 비밀번호를 입력하세요',
            icon: 'lock_reset',
            validation: null
        });

        const confirmPasswordInput = createInput({
            id: 'confirm-password',
            label: '새 비밀번호 확인',
            type: 'password',
            placeholder: '새 비밀번호를 다시 입력하세요',
            icon: 'check_circle',
            validation: null
        });

        this.currentPasswordContainer.appendChild(currentPasswordInput);
        this.newPasswordContainer.appendChild(newPasswordInput);
        this.confirmPasswordContainer.appendChild(confirmPasswordInput);

        this.currentPasswordInput =
            currentPasswordInput.querySelector('#current-password');
        this.newPasswordInput = newPasswordInput.querySelector('#new-password');
        this.confirmPasswordInput =
            confirmPasswordInput.querySelector('#confirm-password');

        this.addVisibilityToggle(currentPasswordInput, this.currentPasswordInput);
        this.addVisibilityToggle(newPasswordInput, this.newPasswordInput);
        this.addVisibilityToggle(confirmPasswordInput, this.confirmPasswordInput);

        this.newPasswordInput.addEventListener('input', this.checkPassword.bind(this));
        this.confirmPasswordInput.addEventListener('input', this.checkPassword.bind(this));

        this.saveButton = createButton({
            id: 'save-password-button',
            text: '비밀번호 변경',
            style: 'primary',
            onClick: this.handleChangePassword.bind(this)
        });

        this.actionsContainer.appendChild(this.saveButton);
    }

    addVisibilityToggle(inputContainer, inputElement) {
        const inputWrapper = inputContainer.querySelector('.input-wrapper');
        
        const visibilityToggle = document.createElement('button');
        visibilityToggle.type = 'button';
        visibilityToggle.className = 'visibility-toggle';
        visibilityToggle.setAttribute('aria-label', 'Toggle password visibility');
        
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = 'visibility';
        visibilityToggle.appendChild(icon);
        
        inputWrapper.appendChild(visibilityToggle);
        
        visibilityToggle.addEventListener('click', () => {
            const isPassword = inputElement.type === 'password';
            inputElement.type = isPassword ? 'text' : 'password';
            icon.textContent = isPassword ? 'visibility_off' : 'visibility';
            visibilityToggle.setAttribute('aria-label', 
                isPassword ? 'Hide password' : 'Show password'
            );
        });
    }

    checkPassword() {
        const newPassword = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        let messageElement = document.querySelector('.password-message-container-message');
        const container = document.querySelector('.password-message-container');

        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.classList.add('password-message-container-message');
            if (container) {
                container.appendChild(messageElement);
            } else {
                console.error("'.password-message-container' not found.");
                return;
            }
        }

        if (newPassword === '' && confirmPassword === '') {
            messageElement.textContent = '';
            return;
        }

        if (newPassword !== confirmPassword && confirmPassword !== '') {
            messageElement.textContent = '비밀번호가 일치하지 않습니다.';
            messageElement.style.color = '#f47c7c';
            return;
        }

        if (newPassword.length > 0) {
            if (newPassword.length < 8) {
                messageElement.textContent = '비밀번호는 8자 이상이어야 합니다.';
                messageElement.style.color = '#f47c7c';
                return;
            }

            if (newPassword.length > 20) {
                messageElement.textContent = '비밀번호는 20자 이하여야 합니다.';
                messageElement.style.color = '#f47c7c';
                return;
            }

            const hasLetter = /[a-zA-Z]/g.test(newPassword);
            const hasNumber = /[0-9]/g.test(newPassword);
            const hasSpecial = /[!@#$%^&*()_]/g.test(newPassword);

            if (!hasLetter || !hasNumber || !hasSpecial) {
                messageElement.textContent = '영문, 숫자, 특수문자를 모두 포함해야 합니다.';
                messageElement.style.color = '#f47c7c';
                return;
            }

            if (confirmPassword === newPassword) {
                messageElement.textContent = '비밀번호가 일치하며 조건을 만족합니다!';
                messageElement.style.color = '#4bb92c';
            } else if (confirmPassword === '') {
                messageElement.textContent = '비밀번호 조건을 만족합니다. 확인을 위해 다시 입력해주세요.';
                messageElement.style.color = '#4bb92c';
            } else {
                messageElement.textContent = '비밀번호가 일치하지 않습니다.';
                messageElement.style.color = '#f47c7c';
            }
        }
    }

    attachEventListeners() {
        if (this.mobileNavToggle) {
            this.mobileNavToggle.addEventListener('click', () =>
                this.toggleSideNav()
            );
        }
        if (this.navBackdrop) {
            this.navBackdrop.addEventListener('click', () => this.closeSideNav());
        }
        
        this.setupProfileNavigation();
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
        if (this.navBackdrop) {
            this.navBackdrop.style.display = 'none';
        }
    }

    setupProfileNavigation() {
        const profileMenuToggle = document.getElementById('profileMenuToggle');
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavClose = document.getElementById('profileNavClose');
        const profileNavOverlay = document.getElementById('profileNavOverlay');
        const navDeleteBtn = document.getElementById('navDeleteAccount');

        if (profileMenuToggle) {
            profileMenuToggle.addEventListener('click', () => {
                profileNavigation.classList.add('active');
                profileNavOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (profileNavClose) {
            profileNavClose.addEventListener('click', this.closeProfileNavigation);
        }

        if (profileNavOverlay) {
            profileNavOverlay.addEventListener('click', this.closeProfileNavigation);
        }

        if (navDeleteBtn) {
            navDeleteBtn.addEventListener('click', () => {
                this.closeProfileNavigation();
                this.showAccountDeleteModal();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileNavigation.classList.contains('active')) {
                this.closeProfileNavigation();
            }
        });
    }

    closeProfileNavigation() {
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavOverlay = document.getElementById('profileNavOverlay');
        
        profileNavigation.classList.remove('active');
        profileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
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
            const result = await apiClient.put('/api/v1/auth/change-password', {
                currentPassword,
                newPassword
            });

            if (result) {
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

    showAccountDeleteModal() {
        const modal = createConfirmCancelModal({
            id: 'account-delete-modal',
            title: '회원 탈퇴',
            message:
                '<p>정말로 계정을 삭제하시겠습니까?</p><p class="warning">이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.</p>',
            confirmText: '탈퇴 확인',
            cancelText: '취소',
            variant: 'danger',
            onConfirm: () => this.handleAccountDelete()
        });
        document.body.appendChild(modal);
    }

    async handleAccountDelete() {
        try {
            await apiClient.delete('/api/v1/users/delete');
            new NoticeBox(
                '회원 탈퇴가 완료되었습니다.',
                'success'
            ).show();
            window.location.href = '/login';
        } catch (error) {
            console.error('회원 탈퇴 처리 실패:', error);
            new NoticeBox(
                '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.',
                'error'
            ).show();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
    new EditPasswordPage();
});
