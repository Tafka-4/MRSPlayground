import escape from '../module/escape.js';
import apiClient from '../module/api.js';
import NoticeBox from '../module/notice.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[pathParts.length - 1];

async function isMe() {
    const response = await apiClient.get(`/api/v1/auth/me`);
    const user = await response.json();
    return user.userid === targetUserId;
}

async function loadUserProfile() {
    try {
        const response = await apiClient.get(`/api/v1/users/${targetUserId}`);

        if (!response.ok) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        const user = await response.json();
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
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';

    document.getElementById(
        'page-title'
    ).textContent = `${user.nickname}님의 프로필`;
    document.title = `${user.nickname}님의 프로필`;

    document.getElementById('userid').textContent = user.id;
    document.getElementById('username').textContent = user.nickname;
    document.getElementById('description').textContent =
        user.description || '소개가 없습니다.';
    document.getElementById('created-at').textContent = new Date(
        user.createdAt
    ).toLocaleDateString('ko-KR');
    document.getElementById('uid').textContent = user.userid;

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
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

loadUserProfile();
