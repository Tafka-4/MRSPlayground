import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';
import { createConfirmCancelModal } from '../component/modals/index.js';

class MyPageManager {
    constructor() {
        this.user = null;
        this.init();
    }
    
    init() {
        initializeComponents();
        loadSavedTheme();
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
            Notice.error('사용자 정보를 불러오는 데 실패했습니다.');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
    }

    renderUser() {
        document.getElementById('nickname').textContent = this.user.nickname;
        const profileImage = document.getElementById('profile-image');
        if (this.user.profile_image_url) {
            profileImage.src = this.user.profile_image_url;
        } else {
            profileImage.src = '';
        }
    }

    async uploadProfileImage(file) {
        const formData = new FormData();
        formData.append('profileImage', file);
        try {
            const response = await api.post('/api/v1/users/me/profile-image', formData);
            if(response.success) {
                Notice.success('프로필 사진이 변경되었습니다.');
                this.fetchUser();
            }
        } catch (error) {
            Notice.error('업로드에 실패했습니다.');
        }
    }
    
    async deleteProfileImage() {
        const confirmed = await new Promise(resolve => {
            const modal = createConfirmCancelModal({
                title: '프로필 사진 삭제',
                message: '정말로 프로필 사진을 삭제하시겠습니까?',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
            document.body.appendChild(modal);
        });

        if (!confirmed) return;

        try {
            const response = await api.delete('/api/v1/users/me/profile-image');
            if(response.success) {
                Notice.success('프로필 사진이 삭제되었습니다.');
                this.fetchUser();
            }
        } catch (error) {
            Notice.error(error.message);
        }
    }

    async deleteAccount() {
        const confirmed = await new Promise(resolve => {
            const modal = createConfirmCancelModal({
                title: '회원 탈퇴',
                message: '정말로 회원 탈퇴를 하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
            document.body.appendChild(modal);
        });
        
        if (!confirmed) return;

        try {
            await api.delete('/api/v1/users/me');
            Notice.success('회원 탈퇴가 완료되었습니다.');
            localStorage.removeItem('accessToken');
            window.location.href = '/';
        } catch (error) {
            Notice.error(error.message);
        }
    }

    setupEventListeners() {
        const profileImageInput = document.getElementById('profile-image-input');
        if(profileImageInput) {
            profileImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.uploadProfileImage(file);
            });
        }
        
        const deleteImageBtn = document.getElementById('delete-profile-image-btn');
        if(deleteImageBtn) {
            deleteImageBtn.addEventListener('click', () => this.deleteProfileImage());
        }

        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if(deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MyPageManager();
});
