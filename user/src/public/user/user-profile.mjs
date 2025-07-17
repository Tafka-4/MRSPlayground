import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { createRoleBadge, createVerificationBadge } from '/component/badges/index.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[2];

let currentUser = null;

async function isMe() {
    try {
        const result = await apiClient.get(`/api/v1/auth/me`);
        return result.user.userid === targetUserId;
    } catch (error) {
        return false;
    }
}

async function loadUserProfile() {
    try {
        const user = await apiClient.get(`/api/v1/users/${targetUserId}`);
        
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
    document.title = `${user.nickname}님의 프로필 - 마법연구회`;

    const usernameContainer = document.getElementById('username-container');

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

    document.getElementById('userid').textContent = user.userid || user.id;
    document.getElementById('username').textContent = user.nickname;
    document.getElementById('description').textContent = user.description || '소개가 없습니다.';
    document.getElementById('created-at').textContent = new Date(user.createdAt).toLocaleDateString('ko-KR');
    document.getElementById('uid').textContent = user.userid;

    const profileImage = document.getElementById('profile-image');
    if (user.profileImage) {
        profileImage.innerHTML = `<img src="${user.profileImage}" alt="프로필 이미지" />`;
    }
}

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
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    
    const profileNavLink = document.getElementById('profile-nav-link');
    const activityNavLink = document.getElementById('activity-nav-link');
    const guestbookNavLink = document.getElementById('guestbook-nav-link');

    if (profileNavLink) {
        profileNavLink.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }

    if (activityNavLink) {
        activityNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/user/${targetUserId}/activity`;
        });
    }

    if (guestbookNavLink) {
        guestbookNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/user/${targetUserId}/guestbook`;
        });
    }

    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNavigation = document.getElementById('profileNavigation');
    const profileNavClose = document.getElementById('profileNavClose');
    const profileNavOverlay = document.getElementById('profileNavOverlay');

    if (profileMenuToggle && profileNavigation) {
        profileMenuToggle.addEventListener('click', () => {
            profileNavigation.classList.add('active');
            profileNavOverlay.classList.add('active');
        });
    }

    if (profileNavClose && profileNavigation) {
        profileNavClose.addEventListener('click', () => {
            profileNavigation.classList.remove('active');
            profileNavOverlay.classList.remove('active');
        });
    }

    if (profileNavOverlay && profileNavigation) {
        profileNavOverlay.addEventListener('click', () => {
            profileNavigation.classList.remove('active');
            profileNavOverlay.classList.remove('active');
        });
    }
});
