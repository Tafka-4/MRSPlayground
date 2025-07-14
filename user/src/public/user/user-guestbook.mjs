import escape from '/module/escape.js';
import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { initializeComponents, loadSavedTheme } from '/component/index.js';
import { createButton } from '/component/buttons/index.js';
import { createRoleBadge, createVerificationBadge } from '/component/badges/index.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[2];

let currentUser = null;

async function isMe() {
    try {
        const user = await apiClient.get(`/api/v1/auth/me`);
        return user.user.userid === targetUserId;
    } catch (error) {
        return false;
    }
}

async function loadUserProfile() {
    try {
        const response = await apiClient.get(`/api/v1/users/${targetUserId}`);
        const user = response.user;
        
        if (!user) {
            throw new Error('사용자 정보를 찾을 수 없습니다.');
        }
        
        if (await isMe()) {
            location.href = '/mypage';
            return;
        }
        displayUserProfile(user);
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-container').style.display = 'block';
        document.getElementById('error-message').textContent = error.message;
    }
}

function displayUserProfile(user) {
    currentUser = user;
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';

    document.getElementById('mobile-title').textContent = `${user.nickname}님의 방명록`;
    document.getElementById('user-nickname').textContent = user.nickname;
    document.title = `${user.nickname}님의 방명록 - 마법연구회`;

    setupEventListeners();
    setupProfileNavigation();
    updateNavigationLinks();
    loadGuestbookList();
}

function updateNavigationLinks() {
    const profileNavLink = document.getElementById('profile-nav-link');
    const activityNavLink = document.getElementById('activity-nav-link');
    const guestbookNavLink = document.getElementById('guestbook-nav-link');
    
    if (profileNavLink) {
        profileNavLink.href = `/user/${targetUserId}`;
    }
    if (activityNavLink) {
        activityNavLink.href = `/user/${targetUserId}/activity`;
    }
    if (guestbookNavLink) {
        guestbookNavLink.href = `/user/${targetUserId}/guestbook`;
    }
}

function setupEventListeners() {
    // Guestbook form
    const submitGuestbook = document.getElementById('submit-guestbook');
    const guestbookMessage = document.getElementById('guestbook-message');
    
    if (submitGuestbook) {
        submitGuestbook.addEventListener('click', handleGuestbookSubmit);
    }
    
    if (guestbookMessage) {
        guestbookMessage.addEventListener('input', handleGuestbookInput);
        updateGuestbookCharCounter();
    }
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

async function loadGuestbookList() {
    const guestbookList = document.getElementById('guestbook-list');
    if (!guestbookList) return;

    try {
        guestbookList.innerHTML = '<div class="loading">방명록을 불러오는 중...</div>';
        
        const guestbook = await apiClient.get(`/api/v1/guestbook/${targetUserId}`);
        
        if (guestbook.success && guestbook.data.length === 0) {
            guestbookList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">book</span>
                    <p>아직 방명록이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        if (guestbook.success && guestbook.data) {
            guestbookList.innerHTML = guestbook.data.map(entry => `
                <div class="guestbook-item">
                    <div class="guestbook-author">
                        <strong>${escape(entry.sender_nickname)}</strong>
                        <small>${new Date(entry.createdAt).toLocaleDateString('ko-KR')}</small>
                    </div>
                    <div class="guestbook-message">${escape(entry.message)}</div>
                </div>
            `).join('');
        } else {
            throw new Error('방명록 데이터를 불러올 수 없습니다.');
        }
        
    } catch (error) {
        guestbookList.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>방명록을 불러올 수 없습니다.</p>
            </div>
        `;
    }
}

function handleGuestbookInput() {
    const messageInput = document.getElementById('guestbook-message');
    const maxLength = 150;
    const currentLength = messageInput.value.length;
    
    if (currentLength > maxLength) {
        messageInput.value = messageInput.value.substring(0, maxLength);
        showGuestbookCharLimitMessage();
    }
    
    updateGuestbookCharCounter();
}

function updateGuestbookCharCounter() {
    const messageInput = document.getElementById('guestbook-message');
    const charCounter = document.getElementById('guestbook-char-counter');
    
    if (!messageInput || !charCounter) return;
    
    const maxLength = 150;
    const currentLength = messageInput.value.length;
    
    charCounter.textContent = `${currentLength}/${maxLength}`;
    
    if (currentLength >= 130) {
        charCounter.classList.add('warning');
    } else {
        charCounter.classList.remove('warning');
    }
}

function showGuestbookCharLimitMessage() {
    const existingMessage = document.querySelector('.char-limit-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const charLimitMessage = document.createElement('div');
    charLimitMessage.className = 'char-limit-message';
    charLimitMessage.textContent = '방명록은 150자까지 입력 가능합니다.';
    
    const guestbookForm = document.querySelector('.guestbook-form');
    guestbookForm.appendChild(charLimitMessage);
    
    setTimeout(() => {
        charLimitMessage.remove();
    }, 2000);
}

async function handleGuestbookSubmit() {
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    
    if (!message) {
        new NoticeBox('방명록 내용을 입력해주세요.', 'warning').show();
        return;
    }
    
    if (message.length > 150) {
        new NoticeBox('방명록은 150자 이하로 작성해주세요.', 'warning').show();
        return;
    }
    
    try {
        const response = await apiClient.post(`/api/v1/guestbook/${targetUserId}`, {
            message: message
        });
        
        if (response.success) {
            messageInput.value = '';
            updateGuestbookCharCounter();
            new NoticeBox('방명록이 작성되었습니다.', 'success').show();
            loadGuestbookList();
        } else {
            throw new Error(response.message || '방명록 작성에 실패했습니다.');
        }
        
    } catch (error) {
        new NoticeBox(error.message || '방명록 작성에 실패했습니다.', 'error').show();
    }
}

// Add dynamic styles
const style = document.createElement('style');
style.textContent = `
    .guestbook-item {
        padding: 1rem;
        margin-bottom: 1rem;
        background: var(--background-color);
        border-radius: 0.5rem;
        box-shadow: var(--shadow);
    }

    .guestbook-author {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .guestbook-author small {
        color: var(--text-muted);
    }

    .guestbook-message {
        color: var(--text-secondary);
        line-height: 1.5;
    }

    .loading {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
    }
`;
document.head.appendChild(style);

// Initialize the page
loadUserProfile(); 