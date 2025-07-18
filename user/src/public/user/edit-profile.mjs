import api from '../module/api.js';
import escape from '../module/escape.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import { createButton } from '../component/buttons/index.js';

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
        
        this.elements.profileImageActions.innerHTML = '';
        
        const uploadButton = createButton({
            text: '사진 업로드',
            variant: 'secondary',
            icon: 'upload',
            onClick: () => this.elements.profileImageInput.click()
        });
        
        const deleteButton = createButton({
            text: '사진 삭제',
            variant: 'danger',
            icon: 'delete',
            onClick: () => this.deleteProfileImage()
        });
        
        this.elements.profileImageActions.appendChild(uploadButton);
        if (this.user.profileImage) {
            this.elements.profileImageActions.appendChild(deleteButton);
        }
    }
    
    renderForm() {
        this.elements.formContainer.innerHTML = `
            <form id="edit-profile-form">
                <div class="input-wrapper">
                    <label for="nickname">닉네임</label>
                    <input type="text" id="nickname" class="input" value="${escape(this.initialData.nickname)}" required>
                </div>
                <div class="input-wrapper">
                    <label for="description">소개</label>
                    <textarea id="description" class="textarea" rows="5" maxlength="500">${escape(this.initialData.description)}</textarea>
                    <div id="char-count" class="char-counter">0/500</div>
                </div>
            </form>
        `;

        this.elements.formActions.innerHTML = '';

        const saveButton = createButton({
            text: '저장',
            variant: 'primary',
            icon: 'save',
            disabled: true,
            onClick: () => this.handleUpdate()
        });
        saveButton.id = 'save-btn';

        const cancelButton = createButton({
            text: '취소',
            variant: 'secondary',
            icon: 'cancel',
            onClick: () => window.location.href = '/mypage'
        });
        cancelButton.id = 'cancel-btn';

        this.elements.formActions.append(cancelButton, saveButton);

        this.form = document.getElementById('edit-profile-form');
        this.inputs = {
            nickname: document.getElementById('nickname'),
            description: document.getElementById('description'),
        };
        this.buttons = {
            save: saveButton,
            cancel: cancelButton,
            uploadImage: this.elements.profileImageActions.querySelector('button'),
            deleteImage: this.elements.profileImageActions.querySelector('button:last-child'),
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
        this.elements.profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.uploadProfileImage(file);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditProfileManager();
});
