import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { createRoleBadge, createVerificationBadge } from '/component/badges/index.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[2];

let currentUser = null;

async function isMe() {
    try {
        const result = await apiClient.get(`/api/v1/auth/me`);
        return result.success && result.user && result.user.userid === targetUserId;
    } catch (error) {
        return false;
    }
}

async function loadUserProfile() {
    try {
        const response = await apiClient.get(`/api/v1/users/${targetUserId}`);
        
        if (!response.success || !response.user) {
            throw new Error('사용자 정보를 찾을 수 없습니다.');
        }
        
        if (await isMe()) {
            location.href = '/mypage';
            return;
        }
        displayUserProfile(response.user);
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

    document.getElementById('userid').textContent = user.id;
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

    setupMobileHeaderScroll();
});

function setupMobileHeaderScroll() {
    const mobileHeader = document.querySelector('.mobile-profile-header');
    if (!mobileHeader) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateMobileHeader() {
        const scrollY = window.scrollY;
        const scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
        const scrollDelta = Math.abs(scrollY - lastScrollY);

        if (scrollY === 0) {
            mobileHeader.classList.remove('header-hidden');
        } else if (
            scrollY > 50 &&
            scrollDirection === 'up' &&
            scrollDelta > 2
        ) {
            mobileHeader.classList.add('header-hidden');
        } else if (scrollDirection === 'down' && scrollDelta > 1) {
            mobileHeader.classList.remove('header-hidden');
        }

        if (scrollY > 50) {
            mobileHeader.classList.add('header-shadow');
        } else {
            mobileHeader.classList.remove('header-shadow');
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateMobileHeader);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    let touchStartY = 0;
    let touchEndY = 0;

    window.addEventListener(
        'touchstart',
        (e) => {
            touchStartY = e.changedTouches[0].screenY;
        },
        { passive: true }
    );

    window.addEventListener(
        'touchend',
        (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const touchDelta = touchStartY - touchEndY;

            if (Math.abs(touchDelta) > 50) {
                if (touchDelta < 0) {
                    mobileHeader.classList.add('header-hidden');
                } else {
                    mobileHeader.classList.remove('header-hidden');
                }
            }
        },
        { passive: true }
    );
}
