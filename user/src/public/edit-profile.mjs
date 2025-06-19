import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';
import {
    initializeComponents,
    loadSavedTheme,
    createButton,
    createInput
} from '/component/index.js';

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
        this.mobileNavToggle.addEventListener('click', () =>
            this.toggleSideNav()
        );
        this.navBackdrop.addEventListener('click', () => this.closeSideNav());
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

    async fetchUserData() {
        try {
            const userData = await apiClient.get('/api/v1/auth/me');
            if (!userData) {
                throw new Error(
                    'User data is null or undefined in API response.'
                );
            }
            this.userData = (await userData.json()).user;
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
        if (this.userData.profileImage) {
            this.profileImage.innerHTML = `<img src="${this.userData.profileImage}" alt="Profile Image">`;
        } else {
            this.profileImage.innerHTML = `<span class="material-symbols-outlined">person</span>`;
        }
    }

    renderForm() {
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

        const editFormBody = document.querySelector('.edit-form-body');
        if (editFormBody) {
            let infoColumn = editFormBody.querySelector('.info-column');
            if (!infoColumn) {
                infoColumn = document.createElement('div');
                infoColumn.className = 'info-column';
                editFormBody.appendChild(infoColumn);
            }
            infoColumn.innerHTML = '';

            const idField = this.createReadonlyField(
                '아이디',
                this.userData.id
            );
            const subDivider1 = document.createElement('hr');
            subDivider1.className = 'sub-divider';

            const emailField = this.createReadonlyField(
                '이메일',
                this.userData.email
            );
            const subDivider2 = document.createElement('hr');
            subDivider2.className = 'sub-divider';

            const useridField = this.createReadonlyField(
                'UID',
                this.userData.userid
            );

            infoColumn.append(
                idField,
                subDivider1,
                emailField,
                subDivider2,
                useridField
            );
            useridField.querySelector('.info-value').style.color =
                'rgb(100, 100, 100)';
            useridField.querySelector('.info-value').style.fontStyle = 'italic';
        }

        this.usernameInput = this.formContainer.querySelector('#username');
        this.descriptionInput =
            this.formContainer.querySelector('#description');

        this.usernameInput.value = this.userData.nickname || '';
        this.descriptionInput.value = this.userData.description || '';

        [this.usernameInput, this.descriptionInput].forEach((input) => {
            input.addEventListener('input', () => this.checkForChanges());
        });
    }

    renderButtons() {
        this.actionsContainer.innerHTML = '';
        const imageActionsContainer = document.createElement('div');
        imageActionsContainer.className = 'profile-image-actions';

        const uploadButton = createButton({
            text: '사진 변경',
            icon: 'photo_camera',
            onClick: () => this.profileImageInput.click()
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

        this.actionsContainer.appendChild(saveButton);
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

    async handleImageUpload(file) {
        if (!file) return;
        const formData = new FormData();
        formData.append('profileImage', file);

        try {
            const result = await apiClient.post(
                '/api/v1/users/upload-profile',
                formData
            );
            this.userData.profileImage = result.profileImage;
            this.updateProfileImage();
            new NoticeBox('프로필 이미지가 변경되었습니다.', 'success').show();
        } catch (error) {
            console.error(error);
            new NoticeBox('이미지 업로드에 실패했습니다.', 'error').show();
        }
    }

    async handleImageDelete() {
        try {
            await apiClient.delete('/api/v1/users/delete-profile');
            this.userData.profileImage = null;
            this.updateProfileImage();
            new NoticeBox('프로필 이미지가 삭제되었습니다.', 'success').show();
        } catch (error) {
            console.error(error);
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
            console.error(error);
            new NoticeBox('프로필 업데이트에 실패했습니다.', 'error').show();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
    new EditProfilePage();
});
