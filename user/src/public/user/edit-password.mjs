import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';

class EditPasswordManager {
    constructor() {
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.form = document.getElementById('edit-password-form');
        this.inputs = {
            currentPassword: this.form.querySelector('#current_password'),
            newPassword: this.form.querySelector('#new_password'),
            newPasswordCheck: this.form.querySelector('#new_password_check'),
        };
        this.messages = {
            password: document.getElementById('password-message'),
        };
        this.buttons = {
            save: this.form.querySelector('#save-btn'),
        }
    }

    init() {
        initializeComponents();
        loadSavedTheme();
        this.setupEventListeners();
    }
    
    validatePassword() {
        const { newPassword, newPasswordCheck } = this.inputs;
        const message = this.messages.password;
        
        message.style.display = 'block';

        if(newPassword.value.length === 0 && newPasswordCheck.value.length === 0) {
            message.style.display = 'none';
            return true;
        }

        if (newPassword.value.length < 8) {
             message.textContent = '새 비밀번호는 8자 이상이어야 합니다.';
             return false;
        }
        
        if (newPassword.value !== newPasswordCheck.value) {
            message.textContent = '새 비밀번호가 일치하지 않습니다.';
            return false;
        }
        
        message.textContent = '새 비밀번호가 일치합니다.';
        return true;
    }

    async handleUpdate(e) {
        e.preventDefault();

        if (!this.validatePassword()) {
            Notice.error('비밀번호를 확인해주세요.');
            return;
        }

        const { currentPassword, newPassword } = this.inputs;

        try {
            await api.put('/api/v1/users/me/password', { 
                current_password: currentPassword.value,
                new_password: newPassword.value 
            });
            Notice.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('accessToken');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
            
        } catch (error) {
            Notice.error(error.message);
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleUpdate(e));
        this.inputs.newPassword.addEventListener('input', () => this.validatePassword());
        this.inputs.newPasswordCheck.addEventListener('input', () => this.validatePassword());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditPasswordManager();
});
