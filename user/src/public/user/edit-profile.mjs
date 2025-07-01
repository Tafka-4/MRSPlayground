import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';
import {
    initializeComponents,
    loadSavedTheme,
    createButton,
    createInput
} from '/component/index.js';
import { createConfirmCancelModal } from '/component/modals/index.js';

class EditProfilePage {
    constructor() {
        this.userData = null;
        this.hasChanges = false;
        this.cacheDOM();
        this.attachEventListeners();
        this.fetchUserData();
    }

    cacheDOM() {
        this.formContainer = document.querySelector('#profile-form-container');
        this.actionsContainer = document.querySelector('#form-actions');
        this.profileImage = document.querySelector('#profile-image');
        this.profileImageInput = document.querySelector('#profile-image-input');
        this.sideNav = document.querySelector('.side-nav');
        this.navBackdrop = document.querySelector('.nav-backdrop');
        this.mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    }

    attachEventListeners() {
        if (this.mobileNavToggle) {
            this.mobileNavToggle.addEventListener('click', () =>
                this.toggleSideNav()
            );
        }
        if (this.navBackdrop) {
            this.navBackdrop.addEventListener('click', () => this.closeSideNav());
        }
        
        this.setupProfileNavigation();
        
        this.profileImageInput.addEventListener('change', (e) =>
            this.handleImageUpload(e.target.files[0])
        );
    }

    toggleSideNav() {
        const isOpen = document.body.classList.contains('side-nav-open');
        if (isOpen) {
            this.closeSideNav();
        } else {
            document.body.classList.add('side-nav-open');
            this.navBackdrop.style.display = 'block';
        }
    }

    closeSideNav() {
        document.body.classList.remove('side-nav-open');
        this.navBackdrop.style.display = 'none';
    }

    setupProfileNavigation() {
        const profileMenuToggle = document.getElementById('profileMenuToggle');
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavClose = document.getElementById('profileNavClose');
        const profileNavOverlay = document.getElementById('profileNavOverlay');
        const navDeleteBtn = document.getElementById('navDeleteAccount');

        if (profileMenuToggle) {
            profileMenuToggle.addEventListener('click', () => {
                profileNavigation.classList.add('active');
                profileNavOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (profileNavClose) {
            profileNavClose.addEventListener('click', this.closeProfileNavigation);
        }

        if (profileNavOverlay) {
            profileNavOverlay.addEventListener('click', this.closeProfileNavigation);
        }

        if (navDeleteBtn) {
            navDeleteBtn.addEventListener('click', () => {
                this.closeProfileNavigation();
                this.showAccountDeleteModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileNavigation.classList.contains('active')) {
                this.closeProfileNavigation();
            }
        });
    }

    closeProfileNavigation() {
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavOverlay = document.getElementById('profileNavOverlay');
        
        profileNavigation.classList.remove('active');
        profileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    async fetchUserData() {
        try {
            const userData = await apiClient.get('/api/v1/auth/me');
            if (!userData) {
                throw new Error(
                    'User data is null or undefined in API response.'
                );
            }
            this.userData = userData.user;
            this.render();
        } catch (error) {
            console.error('Error fetching user data:', error);
            new NoticeBox(
                '사용자 정보를 불러오는 데 실패했습니다.',
                'error'
            ).show();
        }
    }

    render() {
        this.updateProfileImage();
        this.renderForm();
        this.renderButtons();
    }

    updateProfileImage() {
        if (!this.userData) return;
        
        if (this.userData.profileImage) {
            this.profileImage.innerHTML = `<img src="${this.userData.profileImage}" alt="Profile Image">`;
        } else {
            this.profileImage.innerHTML = `<span class="material-symbols-outlined">person</span>`;
        }
    }

    renderForm() {
        if (!this.userData) {
            console.warn('userData is not loaded yet');
            return;
        }
        
        this.formContainer.innerHTML = '';
        this.formContainer.className = 'form-content';

        const usernameInputEl = createInput({
            id: 'username',
            label: '닉네임',
            type: 'text',
            placeholder: '사용자 닉네임을 입력하세요',
            icon: 'person'
        });

        const descriptionInputEl = createInput({
            id: 'description',
            label: '자기소개',
            type: 'text',
            placeholder: '자기소개를 입력하세요',
            icon: 'notes',
            isTextarea: true
        });

        this.formContainer.append(usernameInputEl, descriptionInputEl);

        const inputWrappers = this.formContainer.querySelectorAll('.input-wrapper');
        const inputs = this.formContainer.querySelectorAll('input, textarea');
        
        inputWrappers.forEach(wrapper => {
            wrapper.style.maxWidth = '100%';
            wrapper.style.width = '100%';
        });
        
        inputs.forEach(input => {
            input.style.maxWidth = '100%';
            input.style.width = '100%';
        });

        const descriptionWrapper = descriptionInputEl.querySelector('.input-wrapper');
        if (descriptionWrapper && !descriptionWrapper.querySelector('.material-symbols-outlined')) {
            const iconEl = document.createElement('span');
            iconEl.className = 'material-symbols-outlined textarea-icon';
            iconEl.textContent = 'notes';
            descriptionWrapper.insertBefore(iconEl, descriptionWrapper.firstChild);
        }

        const userIdElement = document.getElementById('user-id');
        const userEmailElement = document.getElementById('user-email');
        const uidElement = document.getElementById('uid');
        
        if (userIdElement) {
            userIdElement.textContent = this.userData.id || '정보 없음';
        }
        
        if (userEmailElement) {
            userEmailElement.textContent = this.userData.email || '정보 없음';
        }
        
        if (uidElement) {
            uidElement.textContent = this.userData.userid || '정보 없음';
            uidElement.style.color = 'rgb(100, 100, 100)';
            uidElement.style.fontStyle = 'italic';
        }

        this.usernameInput = this.formContainer.querySelector('#username');
        this.descriptionInput =
            this.formContainer.querySelector('#description');

        this.usernameInput.value = this.userData.nickname || '';
        this.descriptionInput.value = this.userData.description || '';


        this.charCounter = document.createElement('div');
        this.charCounter.className = 'char-counter';
        
        this.charLimitMessage = document.createElement('div');
        this.charLimitMessage.className = 'char-limit-message';
        this.charLimitMessage.style.display = 'none';

        this.updateCharCounter();

        [this.usernameInput, this.descriptionInput].forEach((input) => {
            input.addEventListener('input', () => {
                this.checkForChanges();
                if (input === this.descriptionInput) {
                    this.handleDescriptionInput();
                }
            });
        });
    }

    renderButtons() {
        this.actionsContainer.innerHTML = '';
        const imageActionsContainer = document.createElement('div');
        imageActionsContainer.className = 'profile-image-actions';

        const uploadButton = createButton({
            text: '사진 변경',
            icon: 'photo_camera',
            onClick: () => {
                this.profileImageInput.value = '';
                this.profileImageInput.click();
            }
        });
        const deleteButton = createButton({
            text: '사진 삭제',
            icon: 'delete',
            variant: 'danger',
            onClick: () => this.handleImageDelete()
        });

        imageActionsContainer.append(uploadButton, deleteButton);
        this.profileImage.parentElement.insertBefore(
            imageActionsContainer,
            this.profileImage.nextSibling
        );

        const saveButton = createButton({
            id: 'save-changes',
            text: '변경사항 저장',
            style: 'primary',
            disabled: true,
            onClick: () => this.handleSave()
        });

        const rightButtonsContainer = document.createElement('div');
        rightButtonsContainer.className = 'action-buttons-right';
        rightButtonsContainer.appendChild(saveButton);

        this.actionsContainer.appendChild(this.charCounter);
        this.actionsContainer.appendChild(rightButtonsContainer);
        this.formContainer.appendChild(this.actionsContainer);
        this.saveButton = saveButton;
    }

    createReadonlyField(label, value) {
        const infoItem = document.createElement('div');
        infoItem.className = 'info-item';
        infoItem.innerHTML = `<label>${label}</label><div class="info-value">${value}</div>`;
        return infoItem;
    }

    checkForChanges() {
        const initialNickname = this.userData.nickname || '';
        const initialDescription = this.userData.description || '';
        this.hasChanges =
            this.usernameInput.value !== initialNickname ||
            this.descriptionInput.value !== initialDescription;
        this.saveButton.disabled = !this.hasChanges;
    }

    handleDescriptionInput() {
        const maxLength = 500;
        const currentLength = this.descriptionInput.value.length;
        
        if (currentLength > maxLength) {
            this.descriptionInput.value = this.descriptionInput.value.substring(0, maxLength);
            this.showCharLimitMessage();
        }
        
        this.updateCharCounter();
    }

    updateCharCounter() {
        const maxLength = 500;
        const currentLength = this.descriptionInput.value.length;
        
        this.charCounter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength >= 400) {
            this.charCounter.classList.add('warning');
        } else {
            this.charCounter.classList.remove('warning');
        }
    }

    showCharLimitMessage() {
        this.charLimitMessage.textContent = '자기소개는 500자까지 입력 가능합니다.';
        this.charLimitMessage.style.display = 'block';
        
        const container = document.querySelector('.container');
        const profileSection = container.querySelector('.profile-section');
        const actionsContainer = this.actionsContainer || container.querySelector('#form-actions');
        
        if (!container.contains(this.charLimitMessage)) {
            if (profileSection && actionsContainer) {
                container.insertBefore(this.charLimitMessage, actionsContainer);
            } else if (profileSection) {
                profileSection.insertAdjacentElement('afterend', this.charLimitMessage);
            }
        }
        
        setTimeout(() => {
            this.charLimitMessage.style.display = 'none';
        }, 2000);
    }

    async handleImageUpload(file) {
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            return new NoticeBox(
                '파일 크기는 5MB 이하여야 합니다.',
                'error'
            ).show();
        }
        if (!file.type.startsWith('image/')) {
            return new NoticeBox(
                '이미지 파일만 업로드 가능합니다.',
                'error'
            ).show();
        }

        const formData = new FormData();
        formData.append('profileImage', file);

        try {
            const result = await apiClient.post(
                '/api/v1/users/upload-profile',
                formData
            );
            this.userData.profileImage = result.profileImage;
            this.updateProfileImage();
            this.profileImageInput.value = '';
            new NoticeBox('프로필 이미지가 변경되었습니다.', 'success').show();
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            new NoticeBox('이미지 업로드에 실패했습니다.', 'error').show();
        }
    }

    async handleImageDelete() {
        try {
            const response = await apiClient.delete('/api/v1/users/delete-profile');
            if (response.ok) {
                this.userData.profileImage = null;
                this.updateProfileImage();
                this.profileImageInput.value = '';
                new NoticeBox('프로필 이미지가 삭제되었습니다.', 'success').show();
            } else {
                throw new Error('삭제 요청 실패');
            }
        } catch (error) {
            console.error('프로필 이미지 삭제 실패:', error);
            new NoticeBox('이미지 삭제에 실패했습니다.', 'error').show();
        }
    }

    async handleSave() {
        const payload = {
            nickname: this.usernameInput.value,
            description: this.descriptionInput.value
        };

        try {
            const result = await apiClient.put('/api/v1/users/update', payload);
            this.userData.nickname = result.nickname;
            this.userData.description = result.description;
            this.hasChanges = false;
            this.saveButton.disabled = true;
            new NoticeBox(
                '프로필이 성공적으로 업데이트되었습니다.',
                'success'
            ).show();
        } catch (error) {
            console.error('프로필 업데이트 실패:', error);
            new NoticeBox('프로필 업데이트에 실패했습니다.', 'error').show();
        }
    }

    showAccountDeleteModal() {
        const modal = createConfirmCancelModal({
            id: 'account-delete-modal',
            title: '회원 탈퇴',
            message:
                '<p>정말로 계정을 삭제하시겠습니까?</p><p class="warning">이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.</p>',
            confirmText: '탈퇴 확인',
            cancelText: '취소',
            variant: 'danger',
            onConfirm: () => this.handleAccountDelete()
        });
        document.body.appendChild(modal);
    }

    async handleAccountDelete() {
        try {
            await apiClient.delete('/api/v1/users/delete');
            new NoticeBox(
                '회원 탈퇴가 완료되었습니다.',
                'success'
            ).show();
            window.location.href = '/login';
        } catch (error) {
            console.error('회원 탈퇴 처리 실패:', error);
            new NoticeBox(
                '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.',
                'error'
            ).show();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
    new EditProfilePage();
});
