import api from '../module/api.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import escape from '../module/escape.js';

class UserGuestbookManager {
    constructor() {
        this.targetUserId = window.location.pathname.split('/')[2];
        this.targetUser = null;
        this.currentUser = null;
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.elements = {
            loading: document.getElementById('loading'),
            errorContainer: document.getElementById('error-container'),
            errorMessage: document.getElementById('error-message'),
            profileContainer: document.getElementById('profile-container'),
            userNickname: document.getElementById('user-nickname'),
            mobileTitle: document.getElementById('mobile-title'),
            guestbookList: document.getElementById('guestbook-list'),
            messageInput: document.getElementById('guestbook-message'),
            charCounter: document.getElementById('guestbook-char-counter'),
            submitButton: document.getElementById('submit-guestbook'),
            navLinks: {
                profile: document.getElementById('profile-nav-link'),
                activity: document.getElementById('activity-nav-link'),
                guestbook: document.getElementById('guestbook-nav-link'),
            },
            mobileNav: {
                toggle: document.getElementById('profileMenuToggle'),
                nav: document.getElementById('profileNavigation'),
                close: document.getElementById('profileNavClose'),
                overlay: document.getElementById('profileNavOverlay'),
            }
        };
    }

    async init() {
        if (!this.targetUserId) {
            this.showError('사용자 ID가 올바르지 않습니다.');
            return;
        }
        await this.loadUsersAndGuestbook();
        this.setupEventListeners();
    }

    async loadUsersAndGuestbook() {
        try {
            const [targetUserRes, currentUserRes] = await Promise.all([
                api.get(`/api/v1/users/${this.targetUserId}`),
                api.get('/api/v1/auth/me').catch(() => ({ success: false }))
            ]);

            if (!targetUserRes.success || !targetUserRes.user) throw new Error('대상 사용자를 찾을 수 없습니다.');
            this.targetUser = targetUserRes.user;
            
            if (currentUserRes.success && currentUserRes.user) {
                this.currentUser = currentUserRes.user;
                if (this.currentUser.userid === this.targetUserId) {
                    window.location.href = '/mypage/guestbook';
                    return;
                }
            }
            
            this.renderUserHeader();
            this.showProfile();
            this.loadGuestbookEntries();

        } catch (error) {
            this.showError(error.message);
        }
    }
    
    renderUserHeader() {
        const title = `${this.targetUser.nickname}님의 방명록`;
        document.title = title + ' - 마법연구회';
        this.elements.userNickname.textContent = this.targetUser.nickname;
        this.elements.mobileTitle.textContent = '방명록';
        
        this.elements.navLinks.profile.href = `/user/${this.targetUser.userid}`;
        this.elements.navLinks.activity.href = `/user/${this.targetUser.userid}/activity`;
        this.elements.navLinks.guestbook.href = `/user/${this.targetUser.userid}/guestbook`;
    }

    async loadGuestbookEntries() {
        this.elements.guestbookList.innerHTML = `<div class="loading-spinner"></div>`;
        try {
            const response = await api.get(`/api/v1/guestbook/${this.targetUserId}`, { query: { limit: 100 } }); // 페이지네이션은 일단 생략
            if (response.success) {
                this.renderGuestbookList(response.data);
            } else {
                this.showGuestbookError('방명록을 불러오지 못했습니다.');
            }
        } catch (error) {
            this.showGuestbookError(error.message || '방명록 로딩 중 오류 발생');
        }
    }

    renderGuestbookList(entries) {
        if (!entries || entries.length === 0) {
            this.elements.guestbookList.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">book</span><p>아직 방명록이 없습니다.</p></div>`;
            return;
        }

        this.elements.guestbookList.innerHTML = entries.map(entry => {
            const sender = entry.sender;
            const canDelete = this.currentUser && sender && (this.currentUser.userid === sender.userid || this.currentUser.authority === 'admin' || this.currentUser.userid === this.targetUserId);
            
            const authorProfile = sender ? `/user/${escape(sender.userid)}` : '#';
            const authorAvatar = sender?.profileImage 
                ? `<img src="${escape(sender.profileImage)}" alt="${escape(sender.nickname)}" class="author-avatar">` 
                : `<div class="author-avatar-placeholder"><span class="material-symbols-outlined">person</span></div>`;
            const authorNickname = sender ? escape(sender.nickname) : '알 수 없는 사용자';

            return `
                <div class="card guestbook-entry">
                    <div class="card-header">
                        <a href="${authorProfile}" class="author-link">
                            ${authorAvatar}
                            <strong>${authorNickname}</strong>
                        </a>
                        <span class="entry-date">${new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="card-body"><p>${escape(entry.message)}</p></div>
                    ${canDelete ? `
                    <div class="card-footer">
                        <button class="btn btn-danger-outline delete-btn" data-id="${escape(String(entry.id))}">
                            <span class="material-symbols-outlined">delete</span> 삭제
                        </button>
                    </div>` : ''}
                </div>
            `;
        }).join('');
    }

    async handleSubmit() {
        const message = this.elements.messageInput.value;
        if (!message.trim()) {
            Notice.warn('메시지를 입력해주세요.');
            return;
        }
        if (!this.currentUser) {
            Notice.error('방명록을 작성하려면 로그인이 필요합니다.');
            return;
        }

        const originalButtonHTML = this.elements.submitButton.innerHTML;
        this.elements.submitButton.disabled = true;
        this.elements.submitButton.innerHTML = `<span class="spinner"></span>`;

        try {
            await api.post('/api/v1/guestbook', { target_userid: this.targetUserId, message });
            Notice.success('방명록을 성공적으로 남겼습니다.');
            this.elements.messageInput.value = '';
            this.elements.charCounter.textContent = '0/150';
            this.loadGuestbookEntries();
        } catch (error) {
            Notice.error(error.message || '방명록 작성에 실패했습니다.');
        } finally {
            this.elements.submitButton.disabled = false;
            this.elements.submitButton.innerHTML = originalButtonHTML;
        }
    }

    async handleDelete(id) {
        const confirmed = await new Promise(resolve => {
            createConfirmCancelModal({
                title: '방명록 삭제',
                message: '정말로 이 방명록을 삭제하시겠습니까?',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            }).show();
        });
        if (!confirmed) return;

        try {
            await api.delete(`/api/v1/guestbook/${id}`);
            Notice.success('방명록이 삭제되었습니다.');
            this.loadGuestbookEntries();
        } catch (error) {
            Notice.error(error.message || '삭제에 실패했습니다.');
        }
    }

    showError(message) { /* ... 로직은 user-activity.mjs와 동일 ... */ }
    showProfile() { /* ... 로직은 user-activity.mjs와 동일 ... */ }
    showGuestbookError(message) { this.elements.guestbookList.innerHTML = `<div class="error-message">${message}</div>`; }
    toggleMobileNav(show) { /* ... 로직은 user-activity.mjs와 동일 ... */ }
    
    setupEventListeners() {
        this.elements.messageInput.addEventListener('input', () => {
            const length = this.elements.messageInput.value.length;
            this.elements.charCounter.textContent = `${length}/150`;
        });
        this.elements.submitButton.addEventListener('click', () => this.handleSubmit());
        this.elements.guestbookList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) this.handleDelete(deleteButton.dataset.id);
        });

        const { toggle, nav, close, overlay } = this.elements.mobileNav;
        if (toggle && nav) toggle.addEventListener('click', () => this.toggleMobileNav(true));
        if (close && nav) close.addEventListener('click', () => this.toggleMobileNav(false));
        if (overlay && nav) overlay.addEventListener('click', () => this.toggleMobileNav(false));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UserGuestbookManager();
}); 