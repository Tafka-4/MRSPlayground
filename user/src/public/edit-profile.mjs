import NoticeBox from "./module/notice.js";
import apiClient from "./module/api.js";

class EditProfile {
    constructor() {
        this.currentUser = null;
        this.hasChanges = false;
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
            } else {
                console.error('사용자 정보 로드 실패:', response.status, response.statusText);
                if (response.status !== 401) {
                    new NoticeBox('사용자 정보를 불러오는데 실패했습니다.', 'error').show();
                }
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            new NoticeBox('사용자 정보를 불러오는데 실패했습니다.', 'error').show();
        }
    }

    displayUserData() {
        if (!this.currentUser) return;

        document.getElementById('userid').textContent = this.currentUser.id || '정보 없음';
        document.getElementById('email').textContent = this.currentUser.email || '정보 없음';

        document.getElementById('username-input').value = this.currentUser.nickname || '';
        document.getElementById('description-input').value = this.currentUser.description || '';

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
        document.getElementById('username-input').addEventListener('input', this.handleInputChange.bind(this));
        document.getElementById('description-input').addEventListener('input', this.handleInputChange.bind(this));

        document.getElementById('image-upload-button').addEventListener('click', () => {
            document.getElementById('profile-image-input').click();
        });

        document.getElementById('profile-image-input').addEventListener('change', this.handleImageUpload.bind(this));

        document.getElementById('image-delete-button').addEventListener('click', this.handleImageDelete.bind(this));

        document.getElementById('save-button').addEventListener('click', this.handleSave.bind(this));

        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = '변경사항이 저장되지 않았습니다. 정말 페이지를 떠나시겠습니까?';
            }
        });
    }

    handleInputChange() {
        const currentUsername = document.getElementById('username-input').value;
        const currentDescription = document.getElementById('description-input').value;

        this.hasChanges = (
            currentUsername !== (this.currentUser.nickname || '') ||
            currentDescription !== (this.currentUser.description || '')
        );

        this.updateSaveButton();
    }

    updateSaveButton() {
        const saveButton = document.getElementById('save-button');
        saveButton.disabled = !this.hasChanges;
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

    async handleSave() {
        if (!this.hasChanges) {
            new NoticeBox('변경된 내용이 없습니다.', 'warning').show();
            return;
        }

        const nickname = document.getElementById('username-input').value.trim();
        const description = document.getElementById('description-input').value.trim();

        if (!nickname) {
            new NoticeBox('닉네임을 입력해주세요.', 'error').show();
            document.getElementById('username-input').focus();
            return;
        }

        if (nickname.length < 2 || nickname.length > 20) {
            new NoticeBox('닉네임은 2자 이상 20자 이하로 입력해주세요.', 'error').show();
            document.getElementById('username-input').focus();
            return;
        }

        if (description.length > 500) {
            new NoticeBox('자기소개는 500자 이하로 입력해주세요.', 'error').show();
            document.getElementById('description-input').focus();
            return;
        }

        const saveButton = document.getElementById('save-button');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>저장 중...';

        try {
            const response = await apiClient.put('/api/v1/users/update', {
                nickname: nickname,
                description: description
            });

            if (!response) return;

            if (response.ok) {
                const updatedUser = await response.json();
                this.currentUser = { ...this.currentUser, ...updatedUser };
                this.hasChanges = false;
                
                new NoticeBox('프로필이 성공적으로 업데이트되었습니다.', 'success').show();
                
                setTimeout(() => {
                    window.location.href = '/mypage';
                }, 1000);
            } else {
                const error = await response.json();
                throw new Error(error.message || '프로필 업데이트 실패');
            }
        } catch (error) {
            console.error('프로필 업데이트 실패:', error);
            new NoticeBox('프로필 업데이트에 실패했습니다.', 'error').show();
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = '<span class="material-symbols-outlined">save</span>저장';
            this.updateSaveButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditProfile();
}); 