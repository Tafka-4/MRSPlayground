import escape from '../module/escape.js';
import apiClient from '../module/api.js';
import NoticeBox from '../module/notice.js';
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

    document.getElementById('page-title').textContent = `${user.nickname}님의 프로필`;
    document.getElementById('mobile-title').textContent = `${user.nickname}님의 프로필`;
    document.title = `${user.nickname}님의 프로필 - 마법연구회`;

    const usernameElement = document.getElementById('username');
    const usernameContainer = document.getElementById('username-container');

    if (usernameElement) {
        usernameElement.textContent = user.nickname;

        if (user.authority === 'admin') {
            const adminBadge = createRoleBadge('admin');
            usernameContainer.appendChild(adminBadge);
        } else if (user.authority === 'bot') {
            const botBadge = createRoleBadge('bot');
            usernameContainer.appendChild(botBadge);
        }

        if (user.isVerified) {
            const verifiedBadge = createVerificationBadge(user.isVerified);
            usernameContainer.appendChild(verifiedBadge);
        }
    }

    if (document.getElementById('userid')) {
        document.getElementById('userid').textContent = user.userid;
    }
    if (document.getElementById('description')) {
        document.getElementById('description').textContent = user.description || '소개가 없습니다.';
    }
    if (document.getElementById('created-at')) {
        document.getElementById('created-at').textContent = new Date(user.createdAt).toLocaleDateString('ko-KR');
    }
    if (document.getElementById('uid')) {
        document.getElementById('uid').textContent = user.uid;
    }

    const profileImage = document.getElementById('profile-image');
    if (user.profileImage) {
        profileImage.innerHTML = `<img src="${user.profileImage}" alt="프로필 이미지" />`;
    }
}

document.getElementById('guestbook-button').addEventListener('click', () => {
    new NoticeBox('방명록 기능은 준비 중입니다.', 'info').show();
});

document.getElementById('article-list-button').addEventListener('click', () => {
    new NoticeBox('활동 목록 기능은 준비 중입니다.', 'info').show();
});

document.getElementById('message-button').addEventListener('click', () => {
    new NoticeBox('메시지 기능은 준비 중입니다.', 'info').show();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
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

loadUserProfile();
