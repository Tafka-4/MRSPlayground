import api from '../module/api.js';
import escape from '../module/escape.js';
import Notice from '../module/notice.js';
import { createButton } from '../component/buttons/index.js';

class EditPasswordManager {
    constructor() {
        this.cacheDOM();
        this.renderForm();
        this.setupEventListeners();
    }

    cacheDOM() {
        this.containers = {
            currentPassword: document.getElementById('current-password-container'),
            newPassword: document.getElementById('new-password-container'),
            confirmPassword: document.getElementById('confirm-password-container'),
            message: document.querySelector('.password-message-container-message'),
            formActions: document.getElementById('form-actions'),
        };
    }
    
    renderForm() {
        this.containers.currentPassword.innerHTML = this.createInputHTML('current-password', 'password', '현재 비밀번호', 'lock');
        this.containers.newPassword.innerHTML = this.createInputHTML('new-password', 'password', '새 비밀번호', 'lock');
        this.containers.confirmPassword.innerHTML = this.createInputHTML('confirm-password', 'password', '새 비밀번호 확인', 'lock');
        
        this.containers.formActions.innerHTML = '';
        
        const saveButton = createButton({
            text: '변경사항 저장',
            variant: 'primary',
            icon: 'save',
            disabled: true,
            onClick: () => this.handleUpdate()
        });
        saveButton.id = 'save-btn';
        
        this.containers.formActions.appendChild(saveButton);
        
        this.inputs = {
            currentPassword: document.getElementById('current-password'),
            newPassword: document.getElementById('new-password'),
            confirmPassword: document.getElementById('confirm-password'),
        };
        this.buttons = { save: saveButton };
    }

    createInputHTML(id, type, placeholder, icon) {
        return `
            <div class="input-wrapper icon-left">
                <span class="material-symbols-outlined">${icon}</span>
                <input type="${type}" id="${escape(id)}" placeholder="${escape(placeholder)}" required style="font-family: 'Courier New';">
                <div class="visibility-container">
                    <span class="material-symbols-outlined visibility-on">visibility</span>
                    <span class="material-symbols-outlined visibility-off" style="display: none;">visibility_off</span>
                </div>
            </div>
        `;
    }

    validatePassword() {
        const { newPassword, confirmPassword } = this.inputs;
        const message = this.containers.message;
        
        message.textContent = '';
        message.className = 'password-message-container-message';

        if (!newPassword.value && !confirmPassword.value) {
            this.buttons.save.disabled = true;
            return;
        }

        if (newPassword.value.length < 8) {
             message.textContent = '새 비밀번호는 8자 이상이어야 합니다.';
             message.classList.add('error');
             this.buttons.save.disabled = true;
             return false;
        }
        
        if (newPassword.value !== confirmPassword.value) {
            message.textContent = '새 비밀번호가 일치하지 않습니다.';
            message.classList.add('error');
            this.buttons.save.disabled = true;
            return false;
        }
        
        message.textContent = '새 비밀번호가 유효합니다.';
        message.classList.add('success');
        this.buttons.save.disabled = !this.inputs.currentPassword.value;
        return true;
    }
    
    togglePasswordVisibility(inputElement) {
        const wrapper = inputElement.closest('.input-wrapper');
        const onIcon = wrapper.querySelector('.visibility-on');
        const offIcon = wrapper.querySelector('.visibility-off');
        if (inputElement.type === 'password') {
            inputElement.type = 'text';
            onIcon.style.display = 'none';
            offIcon.style.display = 'block';
        } else {
            inputElement.type = 'password';
            onIcon.style.display = 'block';
            offIcon.style.display = 'none';
        }
    }

    async handleUpdate() {
        if (!this.validatePassword() || this.buttons.save.disabled) {
            Notice.error('입력 내용을 다시 확인해주세요.');
            return;
        }

        const originalButtonHTML = this.buttons.save.innerHTML;
        this.buttons.save.disabled = true;
        this.buttons.save.innerHTML = '<span class="spinner"></span> 변경 중...';

        try {
            await api.put('/api/v1/auth/change-password', { 
                currentPassword: this.inputs.currentPassword.value,
                newPassword: this.inputs.newPassword.value 
            });
            Notice.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('accessToken');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (error) {
            Notice.error(error.message || '비밀번호 변경에 실패했습니다.');
            this.buttons.save.disabled = false;
            this.buttons.save.innerHTML = originalButtonHTML;
        }
    }

    setupEventListeners() {
        Object.values(this.inputs).forEach(input => {
            input.addEventListener('input', () => this.validatePassword());
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleUpdate();
            });
            
            const visibilityToggle = input.closest('.input-wrapper').querySelector('.visibility-container');
            if (visibilityToggle) {
                visibilityToggle.addEventListener('click', () => this.togglePasswordVisibility(input));
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditPasswordManager();
});
