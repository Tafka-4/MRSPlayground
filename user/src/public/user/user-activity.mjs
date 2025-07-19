import api from '../module/api.js';
import escape from '../module/escape.js';
import { setupUserPage } from './user-common.mjs';

class UserActivityManager {
    constructor() {
        this.targetUserId = window.location.pathname.split('/')[2];
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
            userNicknameDisplay: document.getElementById('user-nickname-display'),
            mobileTitle: document.getElementById('mobile-title'),
            activityList: document.getElementById('activity-list'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            navLinks: {
                profile: document.getElementById('profile-nav-link'),
                activity: document.getElementById('activity-nav-link'),
                guestbook: document.getElementById('guestbook-nav-link'),
            },
        };
    }

    init() {
        if (!this.targetUserId) {
            this.showError('사용자 ID가 올바르지 않습니다.');
            return;
        }
        this.loadUserProfileAndActivity();
        this.setupEventListeners();
        setupUserPage(this.targetUserId);
    }
    
    async isMe() {
        try {
            const result = await api.get(`/api/v1/auth/me`);
            return result.success && result.user && result.user.userid === this.targetUserId;
        } catch (error) {
            return false;
        }
    }

    async loadUserProfileAndActivity() {
        if (await this.isMe()) {
            window.location.href = '/mypage';
            return;
        }

        try {
            const userResponse = await api.get(`/api/v1/users/${this.targetUserId}`);
            if (!userResponse.success || !userResponse.user) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }
            this.currentUser = userResponse.user;
            this.renderUserHeader();
            this.loadActivity('all');
            this.showProfile();
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    renderUserHeader() {
        const title = `${this.currentUser.nickname}님의 활동 내역`;
        document.title = `${title} - 마법연구회`;
        this.elements.userNicknameDisplay.textContent = title;
        this.elements.mobileTitle.textContent = '활동 내역';
        
        this.elements.navLinks.profile.href = `/user/${this.currentUser.userid}`;
        this.elements.navLinks.activity.href = `/user/${this.currentUser.userid}/activity`;
        this.elements.navLinks.guestbook.href = `/user/${this.currentUser.userid}/guestbook`;
    }

    async loadActivity(filter) {
        this.elements.activityList.innerHTML = `<div class="loading-spinner"></div>`;
        try {
            const response = await api.get(`/api/v1/logs/users/${this.targetUserId}/activity`, { query: { filter } });
            if (response.success && response.logs) {
                this.renderActivityList(response.logs);
            } else {
                this.showActivityError('활동 내역을 불러오지 못했습니다.');
            }
        } catch (error) {
            this.showActivityError(error.message || '활동 내역 로딩 중 오류 발생');
        }
    }

    renderActivityList(logs) {
        if (logs.length === 0) {
            this.elements.activityList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <p>아직 활동 내역이 없습니다.</p>
                </div>`;
            return;
        }
        
        this.elements.activityList.innerHTML = logs.map(log => this.createActivityItemHTML(log)).join('');
    }
    
    createActivityItemHTML(log) {
        const icon = this.getActivityIcon(log.type);
        const message = this.formatLogMessage(log);
        return `
            <div class="activity-item">
                <div class="activity-icon"><span class="material-symbols-outlined">${icon}</span></div>
                <div class="activity-content">
                    <p>${message}</p>
                    <small>${new Date(log.createdAt).toLocaleString()}</small>
                </div>
            </div>
        `;
    }

    getActivityIcon(type) {
        if (type.startsWith('POST')) return 'add_circle';
        if (type.startsWith('GET')) return 'visibility';
        if (type.startsWith('PUT') || type.startsWith('PATCH')) return 'edit';
        if (type.startsWith('DELETE')) return 'delete';
        return 'history';
    }
    
    formatLogMessage(log) {
        const type = escape(log.type);
        const endpoint = escape(log.endpoint);
        const status = escape(String(log.status));
        return `[${type}] ${endpoint} 경로에 접근했습니다. (상태: ${status})`;
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.profileContainer.style.display = 'none';
        this.elements.errorContainer.style.display = 'block';
        this.elements.errorMessage.textContent = message;
    }
    
    showProfile() {
        this.elements.loading.style.display = 'none';
        this.elements.errorContainer.style.display = 'none';
        this.elements.profileContainer.style.display = 'block';
    }

    showActivityError(message) {
        this.elements.activityList.innerHTML = `<div class="error-message">${message}</div>`;
    }

    setupEventListeners() {
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadActivity(btn.dataset.filter);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UserActivityManager();
}); 