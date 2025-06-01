import escape from './module/escape.js';
import apiClient from './module/api.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[pathParts.length - 1];

let isFollowing = false;

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
    //dummy data
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';

    document.getElementById(
        'page-title'
    ).textContent = `${user.nickname}님의 프로필`;
    document.title = `${user.nickname}님의 프로필`;

    document.getElementById('userid').textContent = user.userid;
    document.getElementById('username').textContent = user.nickname;
    document.getElementById('description').textContent =
        user.description || '소개가 없습니다.';
    document.getElementById('created-at').textContent = new Date(
        user.createdAt
    ).toLocaleDateString('ko-KR');

    const profileImage = document.getElementById('profile-image');
    if (user.profileImage) {
        profileImage.innerHTML = `<img src="${user.profileImage}" alt="프로필 이미지" />`;
    }

    document.getElementById('posts-count').textContent = Math.floor(
        Math.random() * 100
    );
    document.getElementById('followers-count').textContent = Math.floor(
        Math.random() * 1000
    );
    document.getElementById('following-count').textContent = Math.floor(
        Math.random() * 500
    );
}

function showNotice(message, type = 'success') {
    const notice = document.createElement('div');
    notice.style.cssText = `
        background-color: ${type === 'success' ? '#4CAF50' : '#f47c7c'};
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    notice.textContent = message;
    document.querySelector('.notice-container').appendChild(notice);

    setTimeout(() => {
        notice.remove();
    }, 3000);
}

document.getElementById('follow-button').addEventListener('click', async () => {
    try {
        const button = document.getElementById('follow-button');
        const icon = button.querySelector('.material-symbols-outlined');

        if (isFollowing) {
            button.classList.remove('following');
            icon.textContent = 'person_add';
            button.innerHTML =
                '<span class="material-symbols-outlined">person_add</span>팔로우';
            showNotice('팔로우를 취소했습니다.');
            isFollowing = false;
        } else {
            button.classList.add('following');
            icon.textContent = 'person_remove';
            button.innerHTML =
                '<span class="material-symbols-outlined">person_remove</span>팔로잉';
            showNotice('팔로우했습니다.');
            isFollowing = true;
        }
    } catch (error) {
        showNotice('팔로우 처리 중 오류가 발생했습니다.', 'error');
    }
});

document.getElementById('message-button').addEventListener('click', () => {
    showNotice('메시지 기능은 준비 중입니다.');
});

loadUserProfile();
