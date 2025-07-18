import { get, post } from '/module/api.js';
import { setupMobileHeaderScroll } from '/module/animation.js';
import { showNotice } from '/module/notice.js';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    if (!userId) {
        window.location.href = '/';
        return;
    }

    const loadingEl = document.getElementById('loading');
    const errorContainerEl = document.getElementById('error-container');
    const errorMessageEl = document.getElementById('error-message');
    
    let currentUser = null;
    let targetUser = null;

    try {
        [currentUser, targetUser] = await Promise.all([
            get('/api/user').catch(() => null),
            get(`/api/user/${userId}`)
        ]);

        if (!targetUser) throw new Error('사용자를 찾을 수 없습니다.');
        
        if (currentUser && currentUser.userId === targetUser.userId) {
            showNotice('자신의 방명록에는 메시지를 남길 수 없습니다.', 'error');
            setTimeout(() => { window.location.href = '/mypage/guestbook'; }, 1500);
            return;
        }

        renderPage(currentUser, targetUser);
        setupEventListeners(targetUser);
        setupMobileHeaderScroll();

    } catch (error) {
        loadingEl.style.display = 'none';
        errorMessageEl.textContent = error.message || '정보를 불러오는데 실패했습니다.';
        errorContainerEl.style.display = 'block';
    }
});

function renderPage(currentUser, targetUser) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    
    renderUserInfo(targetUser);
    updateNavigation(currentUser, targetUser);
}


function renderUserInfo(user) {
    document.getElementById('page-title').textContent = `${user.nickname}님에게 방명록 작성`;
    document.getElementById('target-username').textContent = user.nickname;
    document.getElementById('target-description').textContent = user.description || '소개가 없습니다.';

    const profileImageEl = document.getElementById('target-profile-image');
    if (user.profileImage) {
        profileImageEl.innerHTML = `<img src="${user.profileImage}" alt="${user.nickname} 프로필 이미지">`;
    } else {
        profileImageEl.innerHTML = `<span class="material-symbols-outlined">person</span>`;
    }
}

function updateNavigation(currentUser, targetUser) {
    const mobileTitleEl = document.getElementById('mobile-title');
    const navTitleEl = document.getElementById('nav-title');
    const navListEl = document.getElementById('profile-nav-list');
    
    const isMyPage = currentUser && currentUser.userId === targetUser.userId;
    
    mobileTitleEl.textContent = "방명록 작성";
    navTitleEl.textContent = isMyPage ? "프로필 관리" : "사용자 메뉴";

    let navItems = '';
    const writeLink = `
        <a href="/user/${targetUser.userId}/guestbook/write" class="profile-nav-item">
            <span class="material-symbols-outlined">edit_note</span>
            <span>방명록 작성</span>
        </a>
    `;

    if (isMyPage) {
        navItems = `
            <a href="/mypage" class="profile-nav-item">...</a>
            ${writeLink}
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
            ${writeLink}
        `;
    }
    navListEl.innerHTML = navItems;
}

function setupEventListeners(targetUser) {
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNavClose = document.getElementById('profileNavClose');
    const profileNavOverlay = document.getElementById('profileNavOverlay');
    const profileNavigation = document.getElementById('profileNavigation');

    profileMenuToggle.addEventListener('click', () => {
        profileNavigation.classList.add('open');
        profileNavOverlay.classList.add('open');
    });

    const closeNav = () => {
        profileNavigation.classList.remove('open');
        profileNavOverlay.classList.remove('open');
    };
    profileNavClose.addEventListener('click', closeNav);
    profileNavOverlay.addEventListener('click', closeNav);

    const messageTextarea = document.getElementById('message');
    const charCountSpan = document.getElementById('char-count');
    const previewMessageEl = document.getElementById('preview-message');
    const cancelButton = document.getElementById('cancelButton');
    const guestbookForm = document.getElementById('guestbook-form');
    
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