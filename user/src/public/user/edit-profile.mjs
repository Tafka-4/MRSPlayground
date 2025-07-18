import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';

class EditProfileManager {
    constructor() {
        this.user = null;
        this.initialData = { nickname: '', description: '' };
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.form = document.getElementById('edit-profile-form');
        this.inputs = {
            nickname: this.form.querySelector('#nickname'),
            description: this.form.querySelector('#description'),
        };
        this.buttons = {
            save: this.form.querySelector('#save-btn'),
        };
        this.messages = {
            charCount: document.getElementById('char-count'),
        };
    }

    init() {
        initializeComponents();
        loadSavedTheme();
        this.fetchUser();
        this.setupEventListeners();
    }

    async fetchUser() {
        try {
            const response = await api.get('/api/v1/auth/me');
            if (response.success) {
                this.user = response.user;
                this.initialData.nickname = this.user.nickname || '';
                this.initialData.description = this.user.description || '';
                this.renderForm();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            Notice.error('사용자 정보를 불러오는 데 실패했습니다.');
        }
    }

    renderForm() {
        this.inputs.nickname.value = this.initialData.nickname;
        this.inputs.description.value = this.initialData.description;
        this.updateCharCount();
        this.checkForChanges();
    }

    updateCharCount() {
        const currentLength = this.inputs.description.value.length;
        const maxLength = 500;
        this.messages.charCount.textContent = `${currentLength}/${maxLength}`;
        if (currentLength > maxLength) {
            this.messages.charCount.classList.add('error');
        } else {
            this.messages.charCount.classList.remove('error');
        }
    }
    
    checkForChanges() {
        const hasChanged = this.inputs.nickname.value !== this.initialData.nickname ||
                           this.inputs.description.value !== this.initialData.description;
        this.buttons.save.disabled = !hasChanged;
    }

    async handleUpdate(e) {
        e.preventDefault();
        const nickname = this.inputs.nickname.value;
        const description = this.inputs.description.value;
        
        if (description.length > 500) {
            Notice.error('자기소개는 500자를 초과할 수 없습니다.');
            return;
        }

        try {
            const response = await api.put('/api/v1/users/me', { nickname, description });
            if (response.success) {
                Notice.success('프로필이 업데이트되었습니다.');
                this.initialData = { nickname, description };
                this.checkForChanges();
                setTimeout(() => { window.location.href = '/mypage'; }, 1000);
            }
        } catch (error) {
            Notice.error(error.message);
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleUpdate(e));
        this.inputs.nickname.addEventListener('input', () => this.checkForChanges());
        this.inputs.description.addEventListener('input', () => {
            this.updateCharCount();
            this.checkForChanges();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditProfileManager();
});
