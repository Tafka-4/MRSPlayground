import api from '../module/api.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import escape from '../module/escape.js';
import { setupUserPage } from './user-common.mjs';

class UserGuestbookManager {
    constructor() {
        this.targetUserId = window.location.pathname.split('/')[2];
        this.targetUser = null;
        this.currentUser = null;
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
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
            guestbookStats: document.getElementById('guestbook-stats'),
            paginationContainer: document.getElementById('pagination-container'),
        };
    }

    async init() {
        if (!this.targetUserId) {
            this.showError('사용자 ID가 올바르지 않습니다.');
            return;
        }
        await this.loadUsersAndGuestbook();
        this.setupEventListeners();
        setupUserPage(this.targetUserId);
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
            this.loadGuestbookStats();
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

    async loadGuestbookStats() {
        try {
            const response = await api.get(`/api/v1/guestbook/stats/${this.targetUserId}`);
            if (response.success) {
                this.renderStats(response.stats);
            }
        } catch (error) {
            console.error('Failed to load guestbook stats:', error);
        }
    }

    renderStats(stats) {
        this.elements.guestbookStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${escape(stats.totalMessages)}</span>
                <span class="stat-label">총 메시지</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${escape(stats.uniqueSenders)}</span>
                <span class="stat-label">방문자 수</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${escape(stats.recentMessages)}</span>
                <span class="stat-label">최근 7일</span>
            </div>
        `;
    }

    async loadGuestbookEntries(isInitialLoad = true) {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        if (isInitialLoad) {
            this.elements.guestbookList.innerHTML = `<div class="loading-spinner"></div>`;
        }
        
        try {
            const response = await api.get(`/api/v1/guestbook/${this.targetUserId}`, { query: { page: this.currentPage, limit: 10 } });
            
            if (response.success) {
                if (isInitialLoad) this.elements.guestbookList.innerHTML = '';
                this.renderGuestbookList(response.data);
                this.hasMore = response.data.length === 10;
                this.currentPage++;
                this.renderPagination();
            } else {
                this.showGuestbookError('방명록을 불러오지 못했습니다.');
            }
        } catch (error) {
            this.showGuestbookError(error.message || '방명록 로딩 중 오류 발생');
        } finally {
            this.isLoading = false;
        }
    }

    renderGuestbookList(entries) {
        if (this.currentPage === 1 && entries.length === 0) {
            this.elements.guestbookList.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">book</span><p>아직 방명록이 없습니다.</p></div>`;
            this.hasMore = false;
            return;
        }

        const newEntriesHTML = entries
            .map(entry => {
                if (!entry || !entry.sender) {
                    console.warn('Invalid guestbook entry data:', entry);
                    return ''; 
                }

                const sender = entry.sender;
                const canDelete = this.currentUser && (this.currentUser.userid === sender.userid || this.currentUser.authority === 'admin' || this.currentUser.userid === this.targetUserId);
                
                const authorProfile = `/user/${escape(sender.userid)}`;
                const authorAvatar = sender.profileImage 
                    ? `<img src="${escape(sender.profileImage)}" alt="${escape(sender.nickname)}" class="author-avatar">` 
                    : `<div class="author-avatar-placeholder"><span class="material-symbols-outlined">person</span></div>`;
                const authorNickname = escape(sender.nickname);

                return `
                    <div class="card guestbook-entry" id="guestbook-${escape(String(entry.id))}">
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
            })
            .join('');
        
        this.elements.guestbookList.insertAdjacentHTML('beforeend', newEntriesHTML);
    }

    renderPagination() {
        this.elements.paginationContainer.innerHTML = '';
        if (this.hasMore) {
            const loadMoreButton = document.createElement('button');
            loadMoreButton.className = 'btn btn-primary';
            loadMoreButton.textContent = '더보기';
            loadMoreButton.addEventListener('click', () => this.loadGuestbookEntries(false));
            this.elements.paginationContainer.appendChild(loadMoreButton);
        }
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
            this.currentPage = 1;
            this.hasMore = true;
            this.loadGuestbookEntries(true);
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
            const entryElement = document.getElementById(`guestbook-${id}`);
            if (entryElement) entryElement.remove();
        } catch (error) {
            Notice.error(error.message || '삭제에 실패했습니다.');
        }
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.profileContainer.style.display = 'none';
        this.elements.errorMessage.textContent = message;
        this.elements.errorContainer.style.display = 'block';
    }

    showProfile() {
        this.elements.loading.style.display = 'none';
        this.elements.errorContainer.style.display = 'none';
        this.elements.profileContainer.style.display = 'block';
    }
    
    showGuestbookError(message) { this.elements.guestbookList.innerHTML = `<div class="error-message">${message}</div>`; }
    
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UserGuestbookManager();
}); 