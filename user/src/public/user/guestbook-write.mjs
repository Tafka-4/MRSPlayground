import { get, post } from '/module/api.js';
import { setupMobileHeaderScroll } from '/module/animation.js';
import { showNotice } from '/module/notice.js';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    const loadingEl = document.getElementById('loading');
    const errorContainerEl = document.getElementById('error-container');
    const errorMessageEl = document.getElementById('error-message');
    const profileContainerEl = document.getElementById('profile-container');
    const guestbookWriteContainerEl = document.getElementById('guestbook-write-container');

    let currentUser = null;
    let targetUser = null;

    try {
        [currentUser, targetUser] = await Promise.all([
            get('/api/user'),
            get(`/api/user/${userId}`)
        ]);

        if (!targetUser) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        renderUserInfo(targetUser);
        updateNavigation(currentUser, targetUser);
        setupEventListeners(currentUser, targetUser);
        setupMobileHeaderScroll();

        loadingEl.style.display = 'none';
        profileContainerEl.style.display = 'block';
        guestbookWriteContainerEl.style.display = 'flex';

    } catch (error) {
        loadingEl.style.display = 'none';
        errorMessageEl.textContent = error.message || '정보를 불러오는데 실패했습니다.';
        errorContainerEl.style.display = 'block';
    }
});

function renderUserInfo(user) {
    const pageTitleEl = document.getElementById('page-title');
    const targetUsernameEl = document.getElementById('target-username');
    const targetDescriptionEl = document.getElementById('target-description');
    const targetProfileImageEl = document.getElementById('target-profile-image');

    pageTitleEl.textContent = `${user.nickname}님에게 방명록 작성`;
    targetUsernameEl.textContent = user.nickname;
    targetDescriptionEl.textContent = user.description || '소개가 없습니다.';

    if (user.profileImage) {
        targetProfileImageEl.innerHTML = `<img src="${user.profileImage}" alt="${user.nickname} 프로필 이미지">`;
    } else {
        targetProfileImageEl.innerHTML = `<span class="material-symbols-outlined">person</span>`;
    }
}

function updateNavigation(currentUser, targetUser) {
    const isMyPage = currentUser.userId === targetUser.userId;
    
    mobileTitleEl.textContent = isMyPage ? "내 프로필" : "사용자 프로필";
    navTitleEl.textContent = isMyPage ? "프로필 관리" : "사용자 메뉴";

    let navItems = '';
    if (isMyPage) {
        navItems = `
            <a href="/mypage" class="profile-nav-item">
                <span class="material-symbols-outlined">person</span>
                <span>프로필 보기</span>
            </a>
            <a href="/mypage/edit" class="profile-nav-item">
                <span class="material-symbols-outlined">edit</span>
                <span>프로필 수정</span>
            </a>
            <a href="/mypage/activity" class="profile-nav-item">
                <span class="material-symbols-outlined">history</span>
                <span>활동</span>
            </a>
            <a href="/mypage/guestbook" class="profile-nav-item">
                <span class="material-symbols-outlined">book</span>
                <span>방명록</span>
            </a>
            <a href="/mypage/edit/password" class="profile-nav-item">
                <span class="material-symbols-outlined">lock</span>
                <span>비밀번호 변경</span>
            </a>
            <div class="profile-nav-divider"></div>
            <a href="/user/${targetUser.userId}/guestbook/write" class="profile-nav-item active">
                <span class="material-symbols-outlined">edit_note</span>
                <span>방명록 작성</span>
            </a>
        `;
    } else {
        navItems = `
            <a href="/user/${targetUser.userId}" class="profile-nav-item">
                <span class="material-symbols-outlined">person</span>
                <span>프로필</span>
            </a>
            <a href="/user/${targetUser.userId}/activity" class="profile-nav-item">
                <span class="material-symbols-outlined">history</span>
                <span>활동</span>
            </a>
            <a href="/user/${targetUser.userId}/guestbook" class="profile-nav-item">
                <span class="material-symbols-outlined">book</span>
                <span>방명록</span>
            </a>
             <div class="profile-nav-divider"></div>
            <a href="/user/${targetUser.userId}/guestbook/write" class="profile-nav-item active">
                <span class="material-symbols-outlined">edit_note</span>
                <span>방명록 작성</span>
            </a>
        `;
    }
    navListEl.innerHTML = navItems;
}

function setupEventListeners(currentUser, targetUser) {
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNavClose = document.getElementById('profileNavClose');
    const profileNavOverlay = document.getElementById('profileNavOverlay');
    const profileNavigation = document.getElementById('profileNavigation');

    profileMenuToggle.addEventListener('click', () => {
        profileNavigation.classList.add('open');
        profileNavOverlay.classList.add('open');
    });

    profileNavClose.addEventListener('click', () => {
        profileNavigation.classList.remove('open');
        profileNavOverlay.classList.remove('open');
    });

    profileNavOverlay.addEventListener('click', () => {
        profileNavigation.classList.remove('open');
        profileNavOverlay.classList.remove('open');
    });

    const messageTextarea = document.getElementById('message');
    const charCountSpan = document.getElementById('char-count');
    const previewMessageEl = document.getElementById('preview-message');
    const cancelButton = document.getElementById('cancelButton');
    const guestbookForm = document.getElementById('guestbook-form');
    
    const maxLength = messageTextarea.maxLength;

    messageTextarea.addEventListener('input', () => {
        const currentLength = messageTextarea.value.length;
        charCountSpan.textContent = currentLength;
        if (currentLength > 0) {
            previewMessageEl.textContent = messageTextarea.value;
        } else {
            previewMessageEl.textContent = '메시지를 입력하면 여기에 미리보기가 표시됩니다.';
        }
    });

    cancelButton.addEventListener('click', () => {
        window.history.back();
    });

    guestbookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        submitButton.innerHTML = `<div class="spinner"></div> 전송 중...`;

        try {
            const message = messageTextarea.value;
            if (!message.trim()) {
                showNotice('메시지를 입력해주세요.', 'error');
                return;
            }

            await post(`/api/user/${targetUser.userId}/guestbook`, { message });
            
            showNotice('방명록이 성공적으로 작성되었습니다.', 'success');
            setTimeout(() => {
                window.location.href = `/user/${targetUser.userId}/guestbook`;
            }, 1000);

        } catch (error) {
            showNotice(error.message || '방명록 작성에 실패했습니다.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<span class="material-symbols-outlined">send</span> 방명록 남기기`;
        }
    });
} 