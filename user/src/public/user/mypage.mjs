import api from '../module/api.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import {
    createRoleBadge,
    createVerificationBadge,
} from '../component/badges/index.js';

class MyPageManager {
    constructor() {
        this.user = null;
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.elements = {
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            description: document.getElementById('description'),
            createdAt: document.getElementById('created-at'),
            uid: document.getElementById('uid'),
            profileImage: document.getElementById('profile-image'),
            usernameContainer: document.getElementById('username-container'),
            navDeleteAccount: document.getElementById('navDeleteAccount'),
            profileMenuToggle: document.getElementById('profileMenuToggle'),
            profileNavigation: document.getElementById('profileNavigation'),
            profileNavClose: document.getElementById('profileNavClose'),
            profileNavOverlay: document.getElementById('profileNavOverlay'),
        };
    }

    init() {
        this.fetchUser();
        this.setupEventListeners();
    }

    async fetchUser() {
        try {
            const response = await api.get('/api/v1/auth/me');
            if (response.success) {
                this.user = response.user;
                this.renderUser();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            Notice.error('사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
    }

    renderUser() {
        if (!this.user) return;

        // 기존 닉네임 텍스트 노드만 남기고 모두 제거
        const textNode = Array.from(this.elements.username.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        this.elements.username.innerHTML = '';
        if(textNode) this.elements.username.appendChild(textNode);
        this.elements.username.firstChild.textContent = this.user.nickname;
        
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'badge-container';
        
        const badges = [
            createRoleBadge(this.user.role),
            createVerificationBadge(this.user.isVerified),
        ];
        badges.forEach(badge => {
            if (badge) badgeContainer.appendChild(badge);
        });
        this.elements.usernameContainer.appendChild(badgeContainer);

        this.elements.email.textContent = this.user.email;
        this.elements.description.textContent = this.user.description || '소개가 없습니다.';
        this.elements.createdAt.textContent = new Date(this.user.createdAt).toLocaleDateString('ko-KR');
        this.elements.uid.textContent = this.user.userid;

        if (this.user.profileImage) {
            this.elements.profileImage.style.backgroundImage = `url('${this.user.profileImage}')`;
            this.elements.profileImage.innerHTML = '';
        } else {
            this.elements.profileImage.style.backgroundImage = 'none';
            this.elements.profileImage.innerHTML = '<span class="material-symbols-outlined">person</span>';
        }
    }
    
    async deleteAccount() {
        const confirmed = await new Promise(resolve => {
            const modal = createConfirmCancelModal({
                title: '회원 탈퇴',
                message: '정말로 회원 탈퇴를 하시겠습니까? 모든 정보가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.',
                variant: 'danger',
                confirmText: '탈퇴 확인',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
            document.body.appendChild(modal);
        });
        
        if (!confirmed) return;

        try {
            await api.delete('/api/v1/users/me');
            Notice.success('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
            localStorage.removeItem('accessToken');
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } catch (error) {
            Notice.error(error.message || '회원 탈퇴 중 오류가 발생했습니다.');
        }
    }

    toggleMobileNav(show) {
        if (show) {
            this.elements.profileNavigation.classList.add('open');
            this.elements.profileNavOverlay.classList.add('open');
        } else {
            this.elements.profileNavigation.classList.remove('open');
            this.elements.profileNavOverlay.classList.remove('open');
        }
    }

    setupEventListeners() {
        if (this.elements.navDeleteAccount) {
            this.elements.navDeleteAccount.addEventListener('click', () => this.deleteAccount());
        }
        if (this.elements.profileMenuToggle) {
            this.elements.profileMenuToggle.addEventListener('click', () => this.toggleMobileNav(true));
        }
        if (this.elements.profileNavClose) {
            this.elements.profileNavClose.addEventListener('click', () => this.toggleMobileNav(false));
        }
        if (this.elements.profileNavOverlay) {
            this.elements.profileNavOverlay.addEventListener('click', () => this.toggleMobileNav(false));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MyPageManager();
});
