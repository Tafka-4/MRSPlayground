import api from '../module/api.js';
import Notice from '../module/notice.js';

class ContactManager {
    constructor() {
        this.cacheDOM();
        this.setupEventListeners();
    }

    cacheDOM() {
        this.form = document.getElementById('contact-form');
        this.inputs = {
            subject: this.form.querySelector('input[name="subject"]'),
            category: this.form.querySelector('select[name="category"]'),
            email: this.form.querySelector('input[name="email"]'),
            message: this.form.querySelector('textarea[name="message"]'),
        };
        this.button = this.form.querySelector('button[type="submit"]');
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

        this.button.disabled = true;
        this.button.textContent = '제출 중...';

        try {
            const response = await api.post('/api/v1/contacts/', data);
            if (response && response.success) {
                Notice.success('문의가 성공적으로 접수되었습니다.');
                this.form.reset();
            }
        } catch (error) {
            Notice.error(error.message);
        } finally {
            this.button.disabled = false;
            this.button.textContent = '문의 보내기';
        }
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContactManager();
}); 