import apiClient from '/module/api.js';
import escape from '/module/escape.js';

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
        const user = await apiClient.get(`/api/v1/users/${targetUserId}`);
        
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

    document.getElementById('mobile-title').textContent = `${user.nickname}님의 활동 내역`;
    document.getElementById('user-nickname').textContent = user.nickname;
    document.title = `${user.nickname}님의 활동 내역 - 마법연구회`;

    setupEventListeners();
    setupProfileNavigation();
    updateNavigationLinks();
    loadActivityList('all');
}

function updateNavigationLinks() {
    const profileNavLink = document.getElementById('profile-nav-link');
    const activityNavLink = document.getElementById('activity-nav-link');
    const guestbookNavLink = document.getElementById('guestbook-nav-link');
    
    if (profileNavLink) {
        profileNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/user/${targetUserId}`;
        });
    }
    if (activityNavLink) {
        activityNavLink.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
    if (guestbookNavLink) {
        guestbookNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/user/${targetUserId}/guestbook`;
        });
    }
}

function setupEventListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadActivityList(btn.dataset.filter);
        });
    });
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

async function loadActivityList(filter = 'all') {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    try {
        activityList.innerHTML = '<div class="loading">활동 내역을 불러오는 중...</div>';
        
        const activities = await apiClient.get(`/api/v1/users/${targetUserId}/activity?filter=${filter}`);
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <p>활동 내역이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <span class="material-symbols-outlined">${getActivityIcon(activity.type)}</span>
                </div>
                <div class="activity-content">
                    <h4>${escape(activity.title || '제목 없음')}</h4>
                    <p>${escape(activity.description || '설명 없음')}</p>
                    <small>${new Date(activity.createdAt).toLocaleDateString('ko-KR')}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('활동 내역 로딩 실패:', error);
        activityList.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>활동 내역을 불러올 수 없습니다.</p>
            </div>
        `;
    }
}

function getActivityIcon(type) {
    switch (type) {
        case 'post':
            return 'article';
        case 'comment':
            return 'comment';
        case 'like':
            return 'favorite';
        default:
            return 'circle';
    }
}

const style = document.createElement('style');
style.textContent = `
    .activity-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        margin-bottom: 1rem;
        background: var(--background-color);
        border-radius: 0.5rem;
        border-left: 4px solid var(--primary-color);
    }

    .activity-icon {
        width: 40px;
        height: 40px;
        background: var(--primary-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }

    .activity-content h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary);
    }

    .activity-content p {
        margin: 0 0 0.5rem 0;
        color: var(--text-secondary);
    }

    .activity-content small {
        color: var(--text-muted);
    }

    .loading {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
}); 