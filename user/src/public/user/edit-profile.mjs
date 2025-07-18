import api from '../module/api.js';
import escape from '../module/escape.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';

class EditProfileManager {
    constructor() {
        this.user = null;
        this.initialData = { nickname: '', description: '' };
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.elements = {
            profileImage: document.getElementById('profile-image'),
            profileImageActions: document.getElementById('profile-image-actions'),
            profileImageInput: document.getElementById('profile-image-input'),
            formContainer: document.getElementById('profile-form-container'),
            formActions: document.getElementById('form-actions'),
            readOnly: {
                id: document.getElementById('user-id'),
                email: document.getElementById('user-email'),
                uid: document.getElementById('uid'),
            }
        };
    }

    init() {
        this.fetchUser();
    }

    async fetchUser() {
        try {
            const response = await api.get('/api/v1/auth/me');
            if (response.success) {
                this.user = response.user;
                this.initialData.nickname = this.user.nickname || '';
                this.initialData.description = this.user.description || '';
                this.renderProfile();
                this.renderForm();
                this.setupEventListeners();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            Notice.error('사용자 정보를 불러오는 데 실패했습니다.');
        }
    }

    renderProfile() {
        if (this.user.profileImage) {
            this.elements.profileImage.style.backgroundImage = `url('${this.user.profileImage}')`;
            this.elements.profileImage.innerHTML = '';
        } else {
            this.elements.profileImage.style.backgroundImage = 'none';
        }
        
        this.elements.readOnly.id.textContent = this.user.id;
        this.elements.readOnly.email.textContent = this.user.email;
        this.elements.readOnly.uid.textContent = this.user.userid;
        
        // Render profile image action buttons
        const uploadButton = document.createElement('button');
        uploadButton.id = 'upload-image-btn';
        uploadButton.className = 'auth-btn auth-btn-secondary';
        uploadButton.innerHTML = `<span class="material-symbols-outlined">upload</span> 사진 업로드`;
        
        const deleteButton = document.createElement('button');
        deleteButton.id = 'delete-image-btn';
        deleteButton.className = 'auth-btn auth-btn-danger';
        deleteButton.innerHTML = `<span class="material-symbols-outlined">delete</span> 사진 삭제`;
        
        this.elements.profileImageActions.append(uploadButton, deleteButton);
    }
    
    renderForm() {
        this.elements.formContainer.innerHTML = `
            <form id="edit-profile-form">
                <div class="info-item">
                    <label for="nickname">닉네임</label>
                    <input type="text" id="nickname" value="${escape(this.initialData.nickname)}" required>
                </div>
                <div class="info-item">
                    <label for="description">소개</label>
                    <textarea id="description" rows="5" maxlength="500">${escape(this.initialData.description)}</textarea>
                    <div id="char-count" class="char-counter">0/500</div>
                </div>
            </form>
        `;

        this.elements.formActions.innerHTML = `
            <button id="save-btn" class="auth-btn auth-btn-primary" disabled>
                <span class="material-symbols-outlined">save</span> 저장
            </button>
            <button id="cancel-btn" class="auth-btn auth-btn-secondary">
                <span class="material-symbols-outlined">cancel</span> 취소
            </button>
        `;

        // Re-cache dynamic elements
        this.form = document.getElementById('edit-profile-form');
        this.inputs = {
            nickname: document.getElementById('nickname'),
            description: document.getElementById('description'),
        };
        this.buttons = {
            save: document.getElementById('save-btn'),
            cancel: document.getElementById('cancel-btn'),
            uploadImage: document.getElementById('upload-image-btn'),
            deleteImage: document.getElementById('delete-image-btn'),
        };
        this.messages = {
            charCount: document.getElementById('char-count'),
        };
        this.updateCharCount();
    }
    
    updateCharCount() {
        const currentLength = this.inputs.description.value.length;
        const maxLength = 500;
        this.messages.charCount.textContent = `${currentLength}/${maxLength}`;
        this.messages.charCount.classList.toggle('error', currentLength > maxLength);
    }
    
    checkForChanges() {
        const hasChanged = this.inputs.nickname.value !== this.initialData.nickname ||
                           this.inputs.description.value !== this.initialData.description;
        this.buttons.save.disabled = !hasChanged;
    }

    async handleUpdate() {
        const nickname = this.inputs.nickname.value;
        const description = this.inputs.description.value;
        
        if (description.length > 500) {
            Notice.error('소개는 500자를 초과할 수 없습니다.');
            return;
        }

        const originalButtonHTML = this.buttons.save.innerHTML;
        this.buttons.save.disabled = true;
        this.buttons.save.innerHTML = '<span class="spinner"></span> 저장 중...';

        try {
            await api.put('/api/v1/users/me', { nickname, description });
            Notice.success('프로필이 성공적으로 업데이트되었습니다.');
            this.initialData = { nickname, description };
            this.checkForChanges();
            setTimeout(() => { window.location.href = '/mypage'; }, 1000);
        } catch (error) {
            Notice.error(error.message || '프로필 업데이트에 실패했습니다.');
            this.buttons.save.disabled = false;
            this.buttons.save.innerHTML = originalButtonHTML;
        }
    }
    
    async uploadProfileImage(file) {
        const formData = new FormData();
        formData.append('profileImage', file);
        try {
            const response = await api.post('/api/v1/users/me/profile-image', formData);
            if (response.success) {
                Notice.success('프로필 사진이 변경되었습니다.');
                this.fetchUser();
            }
        } catch (error) {
            Notice.error(error.message || '업로드에 실패했습니다.');
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
            await api.delete('/api/v1/users/me/profile-image');
            Notice.success('프로필 사진이 삭제되었습니다.');
            this.fetchUser();
        } catch (error) {
            Notice.error(error.message || '삭제에 실패했습니다.');
        }
    }

    setupEventListeners() {
        this.buttons.save.addEventListener('click', () => this.handleUpdate());
        this.buttons.cancel.addEventListener('click', () => window.location.href = '/mypage');
        
        this.inputs.nickname.addEventListener('input', () => this.checkForChanges());
        this.inputs.description.addEventListener('input', () => {
            this.updateCharCount();
            this.checkForChanges();
        });
        this.inputs.description.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleUpdate();
            }
        });
        
        this.buttons.uploadImage.addEventListener('click', () => this.elements.profileImageInput.click());
        this.elements.profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.uploadProfileImage(file);
        });
        this.buttons.deleteImage.addEventListener('click', () => this.deleteProfileImage());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditProfileManager();
});
