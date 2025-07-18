import api from '../module/api.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import { createRoleBadge, createVerificationBadge } from '../component/badges/index.js';
import { createButton } from '../component/buttons/index.js';

class MyPageManager {
    constructor() {
        this.user = null;
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.elements = {
            username: document.getElementById('username'),
            usernameContainer: document.getElementById('username-container'),
            email: document.getElementById('email'),
            description: document.getElementById('description'),
            createdAt: document.getElementById('created-at'),
            uid: document.getElementById('uid'),
            profileImage: document.getElementById('profile-image'),
            profileImageActions: document.getElementById('profile-image-actions'),
            profileImageInput: document.getElementById('profile-image-input'),
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
            if (response.success && response.user) {
                this.user = response.user;
                this.renderUser();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            Notice.error('사용자 정보를 불러오는 데 실패했습니다.');
        }
    }

    renderUser() {
        if (!this.user) return;

        this.elements.username.textContent = this.user.nickname;
        
        const badgeContainer = this.elements.usernameContainer.querySelector('.badge-container') || document.createElement('div');
        badgeContainer.className = 'badge-container';
        badgeContainer.innerHTML = '';

        const badges = [
            createRoleBadge(this.user.authority),
            createVerificationBadge(this.user.isVerified, () => window.location.href = '/auth/verify-internal-member'),
        ];
        badges.forEach(badge => {
            if (badge) badgeContainer.appendChild(badge);
        });
        if (!badgeContainer.parentNode) {
            this.elements.usernameContainer.appendChild(badgeContainer);
        }

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
        
        this.renderActionButtons();
    }

    renderActionButtons() {
        this.elements.profileImageActions.innerHTML = '';
        
        const editButton = createButton({
            text: '사진 수정',
            variant: 'dark',
            icon: 'photo_camera',
            onClick: () => this.elements.profileImageInput.click()
        });

        const deleteButton = createButton({
            text: '사진 삭제',
            variant: 'danger-outline',
            icon: 'delete',
            onClick: () => this.deleteProfileImage()
        });

        this.elements.profileImageActions.appendChild(editButton);
        if (this.user && this.user.profileImage) {
            this.elements.profileImageActions.appendChild(deleteButton);
        }
    }
    
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profileImage', file);

        try {
            Notice.info('프로필 사진을 업로드하는 중입니다...');
            const response = await api.post('/api/v1/users/me/profile-image', formData);
            if(response.success) {
                this.user.profileImage = response.filePath;
                this.renderUser();
                Notice.success('프로필 사진이 변경되었습니다.');
            }
        } catch (error) {
            Notice.error(error.message || '사진 업로드에 실패했습니다.');
        }
    }
    
    async deleteProfileImage() {
        const confirmed = await new Promise(resolve => {
            createConfirmCancelModal({
                title: '사진 삭제',
                message: '정말로 프로필 사진을 삭제하시겠습니까?',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            }).show();
        });
        
        if (!confirmed) return;

        try {
            await api.delete('/api/v1/users/me/profile-image');
            this.user.profileImage = null;
            this.renderUser();
            Notice.success('프로필 사진이 삭제되었습니다.');
        } catch (error) {
            Notice.error(error.message || '사진 삭제에 실패했습니다.');
        }
    }

    toggleMobileNav(show) {
        this.elements.profileNavigation.classList.toggle('open', show);
        this.elements.profileNavOverlay.classList.toggle('open', show);
    }

    setupEventListeners() {
        if(this.elements.profileImageInput) {
            this.elements.profileImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        this.elements.profileMenuToggle?.addEventListener('click', () => this.toggleMobileNav(true));
        this.elements.profileNavClose?.addEventListener('click', () => this.toggleMobileNav(false));
        this.elements.profileNavOverlay?.addEventListener('click', () => this.toggleMobileNav(false));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('profile-image-input')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'profile-image-input';
        input.hidden = true;
        input.accept = 'image/*';
        document.body.appendChild(input);
    }
    new MyPageManager();
});
