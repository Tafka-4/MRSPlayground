import api from '../module/api.js';
import Notice from '../module/notice.js';

class ContactManager {
    constructor() {
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.form = document.getElementById('contactForm');
        this.inputs = {
            subject: this.form.querySelector('input[name="subject"]'),
            category: this.form.querySelector('select[name="category"]'),
            email: this.form.querySelector('input[name="email"]'),
            message: this.form.querySelector('textarea[name="message"]'),
        };
        this.button = this.form.querySelector('button[type="submit"]');
    }

    init() {
        this.setupEventListeners();
        this.fetchUserEmail();
    }

    async fetchUserEmail() {
        try {
            if (localStorage.getItem('accessToken')) {
                const response = await api.get('/api/v1/auth/me');
                if (response.success && response.user) {
                    this.inputs.email.value = response.user.email;
                    this.inputs.email.disabled = true;
                }
            }
        } catch (error) {
            console.warn('Could not fetch user email.', error);
        }
    }

    validateForm() {
        for (const key in this.inputs) {
            if (!this.inputs[key].value) {
                Notice.warning('모든 필드를 입력해주세요.');
                return false;
            }
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.inputs.email.value)) {
            Notice.warning('올바른 이메일 형식을 입력해주세요.');
            return false;
        }
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        if (this.inputs.email.disabled) {
            data.email = this.inputs.email.value;
        }

        const originalButtonHTML = this.button.innerHTML;
        this.button.disabled = true;
        this.button.innerHTML = '<span class="spinner"></span> 제출 중...';

        try {
            await api.post('/api/v1/contacts', data);
            Notice.success('문의가 성공적으로 접수되었습니다. 검토 후 입력하신 이메일로 답변드리겠습니다.');
            this.form.reset();
            this.fetchUserEmail(); 
        } catch (error) {
            Notice.error(error.message || '문의 제출에 실패했습니다.');
        } finally {
            this.button.disabled = false;
            this.button.innerHTML = originalButtonHTML;
        }
    }
    
    setupEventListeners() {
        if(this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContactManager();
}); 