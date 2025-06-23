import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { initializeComponents, loadSavedTheme } from '/component/index.js';
import { createButton, createDeleteButton } from '/component/buttons/index.js';
import { createConfirmCancelModal } from '/component/modals/index.js';
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
            if (!currentUser.isVerified) {
                window.location.href = '/verify-internal-member';
            }
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

function renderComponents() {
    const imageActionsContainer = document.querySelector(
        '.profile-image-actions'
    );
    if (imageActionsContainer) {
        const uploadBtn = createButton({
            text: '사진 변경',
            icon: 'photo_camera',
            onClick: () => {
                const input = document.getElementById('profile-image-input');
                input.value = '';
                input.click();
            }
        });

        const deleteBtn = createButton({
            text: '사진 삭제',
            icon: 'delete',
            variant: 'danger',
            onClick: showImageDeleteModal
        });
        imageActionsContainer.append(uploadBtn, deleteBtn);
    }

    const navDeleteBtn = document.getElementById('navDeleteAccount');
    if (navDeleteBtn) {
        navDeleteBtn.addEventListener('click', showAccountDeleteModal);
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

    const observer = new MutationObserver(updateUidColor);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    setupProfileNavigation();
}

function setupProfileNavigation() {
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNavigation = document.getElementById('profileNavigation');
    const profileNavClose = document.getElementById('profileNavClose');
    const profileNavOverlay = document.getElementById('profileNavOverlay');

    if (profileMenuToggle) {
        profileMenuToggle.addEventListener('click', () => {
            profileNavigation.classList.add('active');
            profileNavOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (profileNavClose) {
        profileNavClose.addEventListener('click', closeProfileNavigation);
    }

    if (profileNavOverlay) {
        profileNavOverlay.addEventListener('click', closeProfileNavigation);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileNavigation.classList.contains('active')) {
            closeProfileNavigation();
        }
    });
}

function closeProfileNavigation() {
    const profileNavigation = document.getElementById('profileNavigation');
    const profileNavOverlay = document.getElementById('profileNavOverlay');
    
    profileNavigation.classList.remove('active');
    profileNavOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        return (new NoticeBox(
            '파일 크기는 5MB 이하여야 합니다.',
            'error'
        )).show();
    }
    if (!file.type.startsWith('image/')) {
        return (new NoticeBox(
            '이미지 파일만 업로드 가능합니다.',
            'error'
        )).show();
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        const response = await apiClient.post(
            '/api/v1/users/upload-profile',
            formData
        );
        const result = await response.json();
        currentUser.profileImage = result.profileImage;
        updateProfileImage();
        event.target.value = '';
        (new NoticeBox(
            '프로필 이미지가 성공적으로 변경되었습니다.',
            'success'
        )).show();
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        (new NoticeBox(
            '이미지 업로드에 실패했습니다. 다시 시도해주세요.',
            'error'
        )).show();
    }
}

async function handleImageDeleteApiCall() {
    try {
        await apiClient.delete('/api/v1/users/delete-profile');
        (new NoticeBox(
            '프로필 이미지가 삭제되었습니다.',
            'success'
        )).show();

        currentUser.profileImage = null;
        updateProfileImage();
        const input = document.getElementById('profile-image-input');
        if (input) input.value = '';
    } catch (error) {
        console.error('프로필 이미지 삭제 실패:', error);
        (new NoticeBox(
            '이미지 삭제에 실패했습니다. 다시 시도해주세요.',
            'error'
        )).show();
    }
}

async function handleAccountDelete() {
    try {
        await apiClient.delete('/api/v1/users/delete');
        (new NoticeBox(
            '회원 탈퇴가 완료되었습니다.',
            'success'
        )).show();
        window.location.href = '/login';
    } catch (error) {
        console.error('회원 탈퇴 처리 실패:', error);
        (new NoticeBox(
            '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.',
            'error'
        )).show();
    }
}

async function initializePage() {
    initializeComponents();
    loadSavedTheme();
    try {
        const response = await apiClient.get('/api/v1/auth/me');
        const result = await response.json();
        if (result.success) {
            displayUserData(result.user);
            renderComponents();
            setupEventListeners();
        } else {
            throw new Error(result.message || 'Failed to fetch user data');
        }
    } catch (error) {
        console.error('사용자 정보 로딩 실패:', error);
        (new NoticeBox(
            '사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.',
            'error'
        )).show();
        setTimeout(() => (window.location.href = '/login'), 2000);
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
