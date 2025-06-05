import NoticeBox from './module/notice.js';
import apiClient from './module/api.js';
import escape from './module/escape.js';

let currentAdmins = [];

async function loadAdmins() {
    try {
        const tableContent = document.getElementById('table-content');
        tableContent.innerHTML =
            '<div class="loading">관리자 목록을 불러오는 중...</div>';

        const response = await apiClient.get('/api/v1/auth/admin/user-list');

        if (!response.ok) {
            throw new Error('관리자 목록을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        currentAdmins = data.users || [];
        displayAdmins(currentAdmins);
    } catch (error) {
        console.error('관리자 로딩 실패:', error);
        document.getElementById('table-content').innerHTML =
            '<div class="empty-state">관리자 목록을 불러오는데 실패했습니다.</div>';
        new NoticeBox(error.message, 'error').show();
    }
}

function displayAdmins(admins) {
    const tableContent = document.getElementById('table-content');

    if (admins.length === 0) {
        tableContent.innerHTML =
            '<div class="empty-state">등록된 관리자가 없습니다.</div>';
        return;
    }

    const adminsHtml = admins
        .map(
            (admin) => `
        <div class="user-item">
            <div class="user-avatar">
                ${
                    admin.profileImage
                        ? `<img src="${admin.profileImage}" alt="프로필 이미지" />`
                        : '<span class="material-symbols-outlined">person</span>'
                }
            </div>
            <div class="user-info">
                <div class="user-name">
                    ${escape(admin.nickname)}
                    ${
                        admin.authority === 'admin'
                            ? '<span class="admin-badge">관리자</span>'
                            : admin.authority === 'bot'
                            ? '<span class="bot-badge">오토마타</span>'
                            : ''
                    }
                    ${
                        admin.isVerified
                            ? '<span class="verified-badge">인증됨</span>'
                            : '<span class="unverified-badge">미인증</span>'
                    }
                </div>
                <div class="user-details">
                    <span>ID: ${escape(admin.userid)}</span>
                    <span>이메일: ${escape(admin.email || '미설정')}</span>
                    <span>가입일: ${new Date(
                        admin.createdAt
                    ).toLocaleDateString('ko-KR')}</span>
                    <span>권한: ${
                        admin.authority === 'admin'
                            ? '관리자'
                            : admin.authority === 'bot'
                            ? '오토마타'
                            : '일반 사용자'
                    }</span>
                </div>
            </div>
            <div class="user-actions">
                <button class="action-button view-button" onclick="viewUser('${escape(
                    admin.userid
                )}')">
                    <span class="material-symbols-outlined">visibility</span>
                    보기
                </button>
            </div>
        </div>
    `
        )
        .join('');

    tableContent.innerHTML = adminsHtml;
}

function viewUser(userid) {
    window.open(`/${userid}`, '_blank');
}

document.getElementById('refresh-button').addEventListener('click', () => {
    loadAdmins();
});

document.addEventListener('DOMContentLoaded', () => {
    loadAdmins();
});

window.viewUser = viewUser;
