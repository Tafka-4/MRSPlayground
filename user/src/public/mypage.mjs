import NoticeBox from "./module/notice.js";
import apiClient from "./module/api.js";

class MyPage {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
    }

    async loadUserData() {
        try {
            const response = await apiClient.get('/api/v1/auth/me');

            if (!response) {
                return;
            }

            if (response.ok) {
                this.currentUser = await response.json();
                this.displayUserData();
                return;
            } else {
                console.error('사용자 정보 로드 실패:', response.status, response.statusText);
                if (response.status === 401 || response.status === 404) {
                    if (!apiClient.isRedirecting) {
                        new NoticeBox('사용자 정보를 불러오는데 실패했습니다.', 'error').show();
                        localStorage.removeItem('accessToken');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1000);
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            if (!apiClient.isRedirecting) {
                new NoticeBox('사용자 정보를 불러오는데 실패했습니다.', 'error').show();
            }
            return;
        }
    }

    displayUserData() {
        if (!this.currentUser) return;

        document.getElementById('userid').textContent = this.currentUser.id || '정보 없음';
        if (this.currentUser.authority === 'admin') {
            document.getElementById('username').innerHTML = "<span style='color:rgb(234, 178, 47);'>[관리자]</span> " + this.currentUser.nickname || '정보 없음';
        } else {
            document.getElementById('username').innerHTML = this.currentUser.nickname || '정보 없음';
        }
        document.getElementById('email').textContent = this.currentUser.email || '정보 없음';
        document.getElementById('description').textContent = this.currentUser.description || '소개가 없습니다.';
        
        if (this.currentUser.createdAt) {
            const createdDate = new Date(this.currentUser.createdAt);
            document.getElementById('created-at').textContent = createdDate.toLocaleDateString('ko-KR');
        }

        this.updateProfileImage();
    }

    updateProfileImage() {
        const profileImageElement = document.getElementById('profile-image');
        
        if (this.currentUser.profileImage) {
            profileImageElement.innerHTML = `<img src="${this.currentUser.profileImage}" alt="프로필 이미지" />`;
        } else {
            profileImageElement.innerHTML = '<span class="material-symbols-outlined">person</span>';
        }
    }

    setupEventListeners() {
        document.getElementById('logout-button').addEventListener('click', this.handleLogout.bind(this));

        document.getElementById('image-upload-button').addEventListener('click', () => {
            document.getElementById('profile-image-input').click();
        });

        document.getElementById('profile-image-input').addEventListener('change', this.handleImageUpload.bind(this));

        document.getElementById('image-delete-button').addEventListener('click', this.handleImageDelete.bind(this));
        
        document.getElementById('delete-account-button').addEventListener('click', this.showDeleteModal.bind(this));
        document.getElementById('modal-close').addEventListener('click', this.hideDeleteModal.bind(this));
        document.getElementById('cancel-delete').addEventListener('click', this.hideDeleteModal.bind(this));
        document.getElementById('confirm-delete').addEventListener('click', this.handleAccountDelete.bind(this));

        document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideDeleteModal();
            }
        });
    }

    async handleLogout() {
        try {
            const response = await apiClient.post('/api/v1/auth/logout');

            if (!response) return;

            if (response.ok) {
                localStorage.removeItem('accessToken');
                new NoticeBox('로그아웃되었습니다.', 'success').show();
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                throw new Error('로그아웃 실패');
            }
        } catch (error) {
            console.error('로그아웃 실패:', error);
            new NoticeBox('로그아웃에 실패했습니다.', 'error').show();
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            new NoticeBox('파일 크기는 5MB 이하여야 합니다.', 'error').show();
            return;
        }

        if (!file.type.startsWith('image/')) {
            new NoticeBox('이미지 파일만 업로드 가능합니다.', 'error').show();
            return;
        }

        const formData = new FormData();
        formData.append('profileImage', file);

        try {
            const response = await apiClient.post('/api/v1/users/upload-profile', formData);

            if (!response) return;

            if (response.ok) {
                const result = await response.json();
                this.currentUser.profileImage = result.profileImage;
                this.updateProfileImage();
                new NoticeBox(result.message || '프로필 이미지가 업데이트되었습니다.', 'success').show();
            } else {
                const error = await response.json();
                new NoticeBox(error.message || '이미지 업로드에 실패했습니다.', 'error').show();
            }
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            new NoticeBox('이미지 업로드 중 오류가 발생했습니다.', 'error').show();
        }

        event.target.value = '';
    }

    async handleImageDelete() {
        if (!this.currentUser.profileImage) {
            new NoticeBox('삭제할 프로필 이미지가 없습니다.', 'warning').show();
            return;
        }

        try {
            const response = await apiClient.delete('/api/v1/users/delete-profile');

            if (!response) return;

            if (response.ok) {
                const result = await response.json();
                this.currentUser.profileImage = null;
                this.updateProfileImage();
                new NoticeBox(result.message || '프로필 이미지가 삭제되었습니다.', 'success').show();
            } else {
                const error = await response.json();
                new NoticeBox(error.message || '이미지 삭제에 실패했습니다.', 'error').show();
            }
        } catch (error) {
            console.error('이미지 삭제 실패:', error);
            new NoticeBox('이미지 삭제 중 오류가 발생했습니다.', 'error').show();
        }
    }

    showDeleteModal() {
        document.getElementById('delete-modal-overlay').style.display = 'flex';
    }

    hideDeleteModal() {
        document.getElementById('delete-modal-overlay').style.display = 'none';
    }

    async handleAccountDelete() {
        try {
            const response = await apiClient.delete('/api/v1/users/delete');

            if (!response) return;

            if (response.ok) {
                const result = await response.json();
                localStorage.removeItem('accessToken');
                new NoticeBox(result.message || '계정이 삭제되었습니다.', 'success').show();
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else {
                const error = await response.json();
                new NoticeBox(error.message || '계정 삭제에 실패했습니다.', 'error').show();
            }
        } catch (error) {
            console.error('계정 삭제 실패:', error);
            new NoticeBox('계정 삭제 중 오류가 발생했습니다.', 'error').show();
        }

        this.hideDeleteModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MyPage();
});
