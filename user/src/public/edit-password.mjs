import NoticeBox from "./module/notice.js";
import apiClient from "./module/api.js";

class EditPassword {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSaveButton();
    }

    setupEventListeners() {
        document.querySelectorAll('.visibility-container').forEach(container => {
            container.addEventListener('click', this.togglePasswordVisibility.bind(this));
        });

        document.getElementById('new-password').addEventListener('input', this.validatePassword.bind(this));
        document.getElementById('confirm-password').addEventListener('input', this.checkPasswordMatch.bind(this));
        
        document.querySelectorAll('input[type="password"]').forEach(input => {
            input.addEventListener('input', this.updateSaveButton.bind(this));
        });

        document.getElementById('save-password-button').addEventListener('click', this.handlePasswordChange.bind(this));
    }

    togglePasswordVisibility(event) {
        const container = event.currentTarget;
        const targetId = container.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        const visibilityIcon = container.querySelector('.visibility-icon');
        const visibilityOffIcon = container.querySelector('.visibility-off-icon');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            visibilityIcon.style.display = 'none';
            visibilityOffIcon.style.display = 'block';
        } else {
            passwordInput.type = 'password';
            visibilityIcon.style.display = 'block';
            visibilityOffIcon.style.display = 'none';
        }
    }

    validatePassword() {
        const password = document.getElementById('new-password').value;
        
        const requirements = {
            'length-check': password.length >= 8,
            'uppercase-check': /[A-Z]/.test(password),
            'lowercase-check': /[a-z]/.test(password),
            'number-check': /\d/.test(password),
            'special-check': /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        Object.entries(requirements).forEach(([id, isValid]) => {
            const element = document.getElementById(id);
            if (isValid) {
                element.classList.add('valid');
            } else {
                element.classList.remove('valid');
            }
        });

        this.checkPasswordMatch();
        
        return Object.values(requirements).every(Boolean);
    }

    checkPasswordMatch() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const messageContainer = document.getElementById('password-message');

        if (!confirmPassword) {
            messageContainer.textContent = '';
            messageContainer.className = 'password-message';
            return false;
        }

        if (newPassword === confirmPassword) {
            messageContainer.textContent = '비밀번호가 일치합니다.';
            messageContainer.className = 'password-message success';
            return true;
        } else {
            messageContainer.textContent = '비밀번호가 일치하지 않습니다.';
            messageContainer.className = 'password-message error';
            return false;
        }
    }

    updateSaveButton() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const saveButton = document.getElementById('save-password-button');

        const isPasswordValid = this.validatePassword();
        const isPasswordMatch = this.checkPasswordMatch();
        const allFieldsFilled = currentPassword && newPassword && confirmPassword;

        saveButton.disabled = !(allFieldsFilled && isPasswordValid && isPasswordMatch);
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            new NoticeBox('모든 필드를 입력해주세요.', 'error').show();
            return;
        }

        if (!this.validatePassword()) {
            new NoticeBox('새 비밀번호가 요구사항을 만족하지 않습니다.', 'error').show();
            return;
        }

        if (newPassword !== confirmPassword) {
            new NoticeBox('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.', 'error').show();
            return;
        }

        if (currentPassword === newPassword) {
            new NoticeBox('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 'error').show();
            return;
        }

        const saveButton = document.getElementById('save-password-button');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>변경 중...';

        try {
            const response = await apiClient.put('/api/v1/auth/change-password', {
                currentPassword: currentPassword,
                newPassword: newPassword
            });

            if (!response) return;

            if (response.ok) {
                const result = await response.json();
                new NoticeBox(result.message || '비밀번호가 성공적으로 변경되었습니다.', 'success').show();
                
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('password-message').textContent = '';
                document.getElementById('password-message').className = 'password-message';
                
                document.querySelectorAll('.password-requirements li').forEach(li => {
                    li.classList.remove('valid');
                });

                setTimeout(() => {
                    window.location.href = '/mypage';
                }, 1500);
            } else {
                const error = await response.json();
                new NoticeBox(error.message || '비밀번호 변경에 실패했습니다.', 'error').show();
            }
        } catch (error) {
            console.error('비밀번호 변경 실패:', error);
            new NoticeBox('비밀번호 변경 중 오류가 발생했습니다.', 'error').show();
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = '<span class="material-symbols-outlined">save</span>비밀번호 변경';
            this.updateSaveButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditPassword();
}); 