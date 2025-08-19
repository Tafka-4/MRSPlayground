import api from '../module/api.js';
import escape from '../module/escape.js';
import { createRoleBadge, createVerificationBadge } from '../component/badges/index.js';
import { setupUserPage } from './user-common.mjs';

class UserProfileManager {
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
            pageTitle: document.getElementById('page-title'),
            mobileTitle: document.getElementById('mobile-title'),
            usernameContainer: document.getElementById('username-container'),
            userid: document.getElementById('userid'),
            username: document.getElementById('username'),
            description: document.getElementById('description'),
            createdAt: document.getElementById('created-at'),
            uid: document.getElementById('uid'),
            profileImage: document.getElementById('profile-image'),
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
        this.loadUserProfile();
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

    async loadUserProfile() {
        if (await this.isMe()) {
            window.location.href = '/mypage';
            return;
        }
        
        try {
            const response = await api.get(`/api/v1/users/${this.targetUserId}`);
            if (!response.success || !response.user) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }
            this.currentUser = response.user;
            this.renderUserProfile();
            this.showProfile();
        } catch (error) {
            this.showError(error.message);
        }
    }

    renderUserProfile() {
        const user = this.currentUser;
        const title = `${user.nickname}님의 프로필`;
        document.title = `${title} - 마법연구회`;
        this.elements.pageTitle.textContent = title;
        this.elements.mobileTitle.textContent = '프로필';

        this.elements.usernameContainer.innerHTML = '';
        this.elements.username.textContent = user.nickname;
        this.elements.usernameContainer.prepend(this.elements.username);

        if (user.authority === 'admin' || user.authority === 'bot') {
            const roleBadge = createRoleBadge(user.authority);
            this.elements.usernameContainer.appendChild(roleBadge);
        }
        if (user.isVerified) {
            const verifiedBadge = createVerificationBadge();
            this.elements.usernameContainer.appendChild(verifiedBadge);
        }

        this.elements.userid.textContent = user.id;
        this.elements.description.textContent = user.description || '소개가 없습니다.';
        this.elements.createdAt.textContent = new Date(user.createdAt).toLocaleDateString('ko-KR');
        this.elements.uid.textContent = user.userid;

        if (user.profileImage) {
            this.elements.profileImage.style.backgroundImage = `url('${escape(user.profileImage)}')`;
            this.elements.profileImage.innerHTML = '';
        } else {
            this.elements.profileImage.style.backgroundImage = 'none';
            this.elements.profileImage.innerHTML = '<span class="material-symbols-outlined">person</span>';
        }
        
        this.elements.navLinks.profile.href = `/user/${escape(user.userid)}`;
        this.elements.navLinks.activity.href = `/user/${escape(user.userid)}/activity`;
        this.elements.navLinks.guestbook.href = `/user/${escape(user.userid)}/guestbook`;
    }
    
    showLoading() {
        this.elements.loading.style.display = 'block';
        this.elements.errorContainer.style.display = 'none';
        this.elements.profileContainer.style.display = 'none';
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.errorContainer.style.display = 'block';
        this.elements.profileContainer.style.display = 'none';
        this.elements.errorMessage.textContent = message;
    }

    showProfile() {
        this.elements.loading.style.display = 'none';
        this.elements.errorContainer.style.display = 'none';
        this.elements.profileContainer.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UserProfileManager();
});
