import api from '../module/api.js';
import Notice from '../module/notice.js';

class GuestbookWriteManager {
    constructor() {
        this.cacheDOM();
        if (!this.form) return;
        this.setupEventListeners();
    }

    cacheDOM() {
        this.form = document.getElementById('guestbook-write-form');
        if (!this.form) return;
        
        this.messageInput = this.form.querySelector('#guestbook-message');
        this.button = this.form.querySelector('button[type="submit"]');
        this.targetUserid = this.form.dataset.targetUserid;
    }

    validateForm() {
        if (!this.messageInput.value.trim()) {
            Notice.warning('메시지를 입력해주세요.');
            return false;
        }
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;

        this.button.disabled = true;
        this.button.textContent = '작성 중...';

        try {
            const response = await api.post('/api/v1/guestbook/', {
                target_userid: this.targetUserid,
                message: this.messageInput.value
            });

            if (response && response.success) {
                Notice.success('방명록이 성공적으로 작성되었습니다.');
                window.location.href = `/user/${this.targetUserid}/guestbook`;
            }
        } catch (error) {
            Notice.error(error.message);
        } finally {
            this.button.disabled = false;
            this.button.textContent = '작성 완료';
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new GuestbookWriteManager();
}); 