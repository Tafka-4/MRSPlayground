import api from '../module/api.js';
import Notice from '../module/notice.js';
import { setupUserPage } from './user-common.mjs';

class GuestbookWriteManager {
    constructor() {
        this.targetUserId = window.location.pathname.split('/')[2];
        this.targetUser = null;
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.elements = {
            loading: document.getElementById('loading'),
            errorContainer: document.getElementById('error-container'),
            errorMessage: document.getElementById('error-message'),
            profileContainer: document.getElementById('profile-container'),
            pageTitle: document.getElementById('page-title'),
            targetProfileImage: document.getElementById('target-profile-image'),
            targetUsername: document.getElementById('target-username'),
            targetDescription: document.getElementById('target-description'),
            form: document.getElementById('guestbook-form'),
            messageInput: document.getElementById('message'),
            charCount: document.getElementById('char-count'),
            previewMessage: document.getElementById('preview-message'),
            submitButton: document.getElementById('submitButton'),
            cancelButton: document.getElementById('cancelButton'),
        };
    }

    async init() {
        if (!localStorage.getItem('accessToken')) {
            Notice.error('방명록을 작성하려면 로그인이 필요합니다.');
            setTimeout(() => window.location.href = '/login', 2000);
            return;
        }

        if (!this.targetUserId) {
            this.showError('대상 사용자를 찾을 수 없습니다.');
            return;
        }
        
        await this.loadTargetUser();
        this.setupEventListeners();
        setupUserPage(this.targetUserId);
    }

    async loadTargetUser() {
        try {
            const [targetUserRes, currentUserRes] = await Promise.all([
                api.get(`/api/v1/users/${this.targetUserId}`),
                api.get('/api/v1/auth/me')
            ]);
            
            if (!targetUserRes.success || !targetUserRes.user) throw new Error('대상 사용자를 찾을 수 없습니다.');
            this.targetUser = targetUserRes.user;

            if (currentUserRes.success && currentUserRes.user && currentUserRes.user.userid === this.targetUser.userid) {
                Notice.error('자기 자신에게 방명록을 작성할 수 없습니다.');
                setTimeout(() => window.history.back(), 2000);
                return;
            }

            this.renderUserInfo();
            this.showContent();

        } catch (error) {
            this.showError(error.message);
        }
    }

    renderUserInfo() {
        this.elements.pageTitle.textContent = `${this.targetUser.nickname}님에게 방명록 남기기`;
        document.title = `${this.targetUser.nickname}님에게 방명록 남기기 - 마법연구회`;
        
        if (this.targetUser.profileImage) {
            this.elements.targetProfileImage.style.backgroundImage = `url('${this.targetUser.profileImage}')`;
            this.elements.targetProfileImage.innerHTML = '';
        }
        this.elements.targetUsername.textContent = this.targetUser.nickname;
        this.elements.targetDescription.textContent = this.targetUser.description || '소개가 없습니다.';
    }

    updatePreview() {
        const message = this.elements.messageInput.value;
        this.elements.charCount.textContent = message.length;
        this.elements.previewMessage.textContent = message || '메시지를 입력하면 여기에 미리보기가 표시됩니다.';
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.elements.messageInput.value.trim();
        if (!message) {
            Notice.warn('메시지를 입력해주세요.');
            return;
        }

        const originalButtonHTML = this.elements.submitButton.innerHTML;
        this.elements.submitButton.disabled = true;
        this.elements.submitButton.innerHTML = `<span class="spinner"></span> 전송 중...`;

        try {
            await api.post('/api/v1/guestbook', { target_userid: this.targetUserId, message });
            Notice.success('방명록을 성공적으로 남겼습니다.');
            setTimeout(() => {
                window.location.href = `/user/${this.targetUserId}/guestbook`;
            }, 1000);
        } catch (error) {
            Notice.error(error.message || '방명록 작성에 실패했습니다.');
            this.elements.submitButton.disabled = false;
            this.elements.submitButton.innerHTML = originalButtonHTML;
        }
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.errorContainer.style.display = 'flex';
        this.elements.errorMessage.textContent = message;
    }
    
    showContent() {
        this.elements.loading.style.display = 'none';
        this.elements.profileContainer.style.display = 'block';
    }

    setupEventListeners() {
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.messageInput.addEventListener('input', () => this.updatePreview());
        this.elements.cancelButton.addEventListener('click', () => window.history.back());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GuestbookWriteManager();
}); 