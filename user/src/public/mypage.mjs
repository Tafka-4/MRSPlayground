import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { createButton, createAdminButton } from '/component/buttons/index.js';
import {
    createModal,
    createConfirmCancelModal
} from '/component/modals/index.js';
import {
    createRoleBadge,
    createVerificationBadge
} from '/component/badges/index.js';

let currentUser = null;

function updateUidColor() {
    const uidElement = document.getElementById('uid');
    if (uidElement) {
        const isDarkMode =
            document.documentElement.getAttribute('data-theme') === 'dark';
        uidElement.style.color = isDarkMode
            ? 'rgb(220, 220, 220)'
            : 'rgb(100, 100, 100)';
    }
}

function displayUserData(user) {
    currentUser = user;
    if (!currentUser) return;

    document.getElementById('username').textContent =
        currentUser.nickname || '정보 없음';
    document.getElementById('email').textContent =
        currentUser.email || '정보 없음';
    document.getElementById('description').textContent =
        currentUser.description || '소개가 없습니다.';

    const uidElement = document.getElementById('uid');
    if (uidElement) {
        uidElement.textContent = currentUser.userid || '정보 없음';
        uidElement.style.fontStyle = 'italic';
        updateUidColor();
    }

    if (currentUser.createdAt) {
        const createdDate = new Date(currentUser.createdAt);
        document.getElementById('created-at').textContent =
            createdDate.toLocaleDateString('ko-KR');
    }

    renderBadges();
    updateProfileImage();
}

function renderBadges() {
    const usernameContainer = document.getElementById('username-container');
    if (!usernameContainer) return;

    const existingBadges = usernameContainer.querySelectorAll('.badge');
    existingBadges.forEach((badge) => badge.remove());

    if (currentUser.authority === 'admin') {
        const roleBadge = createRoleBadge('admin');
        usernameContainer.appendChild(roleBadge);
    }

    const verificationBadge = createVerificationBadge(
        currentUser.isVerified,
        () => {
            window.location.href = '/verify-internal-member';
        }
    );
    usernameContainer.appendChild(verificationBadge);
}

function updateProfileImage() {
    const profileImageElement = document.getElementById('profile-image');
    if (!profileImageElement) return;

    if (currentUser && currentUser.profileImage) {
        profileImageElement.innerHTML = `<img src="${currentUser.profileImage}" alt="프로필 이미지" />`;
    } else {
        profileImageElement.innerHTML = `<span class="material-symbols-outlined">person</span>`;
    }
}

function updateVerificationStatus() {
    const usernameContainer = document.getElementById('username-container');
    if (!usernameContainer) return;

    const existingBadges = usernameContainer.querySelectorAll(
        '.verified-badge, .unverified-badge'
    );
    existingBadges.forEach((badge) => badge.remove());

    let statusBadge;
    if (currentUser && currentUser.isVerified) {
        statusBadge = document.createElement('span');
        statusBadge.className = 'verified-badge';
        statusBadge.innerHTML = `<span class="material-symbols-outlined">verified</span>`;
        usernameContainer.classList.remove('clickable');
        usernameContainer.title = '인증된 사용자입니다.';
    } else {
        statusBadge = document.createElement('div');
        statusBadge.className = 'unverified-badge-container';
        statusBadge.innerHTML = `<span class="unverified-badge"><span class="material-symbols-outlined">unpublished</span></span>
                                           <div class="unverified-tooltip">미인증 사용자입니다. 내부 구성원이라면 인증을 진행해주세요.</div>`;

        usernameContainer.classList.add('clickable');
        usernameContainer.title = '내부 사용자 인증하기';
        usernameContainer.addEventListener(
            'click',
            () => {
                window.location.href = '/verify-internal-member';
            },
            { once: true }
        );
    }
    usernameContainer.appendChild(statusBadge);
}

function renderComponents() {
    const imageActionsContainer = document.querySelector(
        '.profile-image-actions'
    );
    if (imageActionsContainer) {
        imageActionsContainer
            .querySelectorAll('button')
            .forEach((btn) => btn.remove());

        const uploadBtn = createButton({
            id: 'image-upload-button',
            text: '업로드',
            icon: 'upload',
            size: 'sm',
            variant: 'primary',
            className: 'image-upload-button',
            onClick: () => {
                document.getElementById('profile-image-input').click();
            }
        });

        const deleteBtn = createButton({
            id: 'image-delete-button',
            text: '삭제',
            icon: 'delete',
            size: 'sm',
            variant: 'danger',
            className: 'image-delete-button',
            onClick: showImageDeleteModal
        });
        imageActionsContainer.append(uploadBtn, deleteBtn);
    }

    const buttonsContainer = document.getElementById(
        'action-buttons-container'
    );
    if (buttonsContainer) {
        buttonsContainer.innerHTML = '';
        const editProfileBtn = createButton({
            id: 'edit-profile-button',
            text: '프로필 수정',
            variant: 'primary',
            size: 'md',
            onClick: () => (window.location.href = '/mypage/edit')
        });
        const editPasswordBtn = createButton({
            id: 'edit-password-button',
            text: '비밀번호 변경',
            className: 'password-button',
            size: 'md',
            onClick: () => (window.location.href = '/mypage/edit/password')
        });
        const deleteAccountBtn = createButton({
            id: 'delete-account-button',
            text: '회원 탈퇴',
            variant: 'danger',
            size: 'md',
            onClick: showAccountDeleteModal
        });

        buttonsContainer.append(
            editProfileBtn,
            editPasswordBtn,
            deleteAccountBtn
        );
    }

    const adminBtnContainer = document.getElementById('admin-button-container');
    if (adminBtnContainer && currentUser && currentUser.authority === 'admin') {
        const adminBtn = createButton({
            text: '관리자 페이지',
            variant: 'warning',
            icon: 'admin_panel_settings',
            onClick: () => (window.location.href = '/admin')
        });
        adminBtnContainer.appendChild(adminBtn);
    }
}

function showAccountDeleteModal() {
    const modal = createConfirmCancelModal({
        id: 'account-delete-modal',
        title: '회원 탈퇴',
        message:
            '<p>정말로 계정을 삭제하시겠습니까?</p><p class="warning">이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.</p>',
        confirmText: '탈퇴 확인',
        cancelText: '취소',
        variant: 'danger',
        onConfirm: handleAccountDelete
    });
    document.body.appendChild(modal);
}

function showImageDeleteModal() {
    const modal = createConfirmCancelModal({
        id: 'image-delete-modal',
        title: '프로필 이미지 삭제',
        message: '정말로 프로필 이미지를 삭제하시겠습니까?',
        confirmText: '삭제',
        cancelText: '취소',
        variant: 'danger',
        onConfirm: handleImageDeleteApiCall
    });
    document.body.appendChild(modal);
}

function setupEventListeners() {
    document
        .getElementById('profile-image-input')
        .addEventListener('change', handleImageUpload);
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
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
        const response = await apiClient.post(
            '/api/v1/users/upload-profile',
            formData
        );
        if (response && response.ok) {
            const result = await response.json();
            currentUser.profileImage = result.profileImage;
            updateProfileImage();
            new NoticeBox(
                '프로필 이미지가 업데이트되었습니다.',
                'success'
            ).show();
        } else {
            throw new Error('이미지 업로드에 실패했습니다.');
        }
    } catch (error) {
        console.error('Image upload failed:', error);
        new NoticeBox('이미지 업로드 중 오류가 발생했습니다.', 'error').show();
    }
}

async function handleImageDeleteApiCall() {
    try {
        const response = await apiClient.delete('/api/v1/users/delete-profile');
        if (response && response.ok) {
            currentUser.profileImage = null;
            updateProfileImage();
            new NoticeBox('프로필 이미지가 삭제되었습니다.', 'success').show();
        } else {
            throw new Error('이미지 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Image delete failed:', error);
        new NoticeBox('이미지 삭제 중 오류가 발생했습니다.', 'error').show();
    }
}

async function handleAccountDelete() {
    try {
        const response = await apiClient.delete('/api/v1/users/delete');
        if (response && response.ok) {
            const result = await response.json();
            localStorage.removeItem('accessToken');
            new NoticeBox(
                result.message || '계정이 삭제되었습니다.',
                'success'
            ).show();
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            new NoticeBox('계정 삭제에 실패했습니다.', 'error').show();
        }
    } catch (error) {
        new NoticeBox('계정 삭제 중 오류가 발생했습니다.', 'error').show();
    }
}

document.addEventListener('userLoaded', (e) => {
    const user = e.detail.user;
    if (user) {
        displayUserData(user);
        renderComponents();
        setupEventListeners();

        const observer = new MutationObserver(updateUidColor);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }
});

setTimeout(() => {
    if (!currentUser) {
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.innerHTML =
                '<h1>로그인 필요</h1><p>마이페이지를 이용하시려면 <a href="/login">로그인</a>이 필요합니다.</p>';

            const isDarkMode =
                document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDarkMode) {
                mainContainer.querySelector('h1').style.color =
                    'var(--text-primary)';
                mainContainer.querySelector('p').style.color =
                    'var(--text-secondary)';
            }
        }
    }
}, 1000);
