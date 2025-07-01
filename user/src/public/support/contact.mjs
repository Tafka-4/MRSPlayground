import apiClient from '/module/api.js';

class ContactManager {
    constructor() {
        this.init();
    }

    init() {
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }

    showMessage(message, type = 'success') {
        this.hideMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        const form = document.getElementById('contactForm');
        form.insertBefore(messageDiv, form.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    hideMessages() {
        const messages = document.querySelectorAll('.success-message, .error-message');
        messages.forEach(msg => msg.remove());
    }

    setLoadingState(loading) {
        const form = document.getElementById('contactForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> 제출 중...';
        } else {
            form.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> 문의 보내기';
        }
    }

    validateForm(formData) {
        const { subject, category, email, message } = formData;

        if (!subject || !category || !email || !message) {
            throw new Error('모든 필드를 입력해주세요.');
        }

        if (subject.length > 500) {
            throw new Error('제목은 500자를 초과할 수 없습니다.');
        }

        if (message.length > 5000) {
            throw new Error('메시지는 5000자를 초과할 수 없습니다.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('올바른 이메일 형식을 입력해주세요.');
        }

        const validCategories = ['general', 'technical', 'feature', 'account', 'other'];
        if (!validCategories.includes(category)) {
            throw new Error('올바른 카테고리를 선택해주세요.');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const contactData = {
            subject: formData.get('subject'),
            category: formData.get('category'),
            email: formData.get('email'),
            message: formData.get('message')
        };

        try {
            this.hideMessages();
            this.validateForm(contactData);
            this.setLoadingState(true);

            const result = await apiClient.post(
                '/api/v1/contact/submit',
                contactData
            );

            if (result.success) {
                this.showMessage('문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.', 'success');
                e.target.reset();
            } else {
                throw new Error(result.message || '문의 접수에 실패했습니다.');
            }
        } catch (error) {
            console.error('Contact submission error:', error);
            this.showMessage(`문의 접수 중 오류가 발생했습니다: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContactManager();
}); 