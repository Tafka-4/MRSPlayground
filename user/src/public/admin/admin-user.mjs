import NoticeBox from '../module/notice.js';
import apiClient from '../module/api.js';
import escape from '../module/escape.js';

let currentUsers = [];
let currentPage = 1;
let currentQuery = '';
let userToDelete = null;
let pendingAdminAction = null;
let pendingVerifyAction = null;

async function loadUsers(query = '', limit = 10) {
    try {
        const tableContent = document.getElementById('table-content');
        tableContent.innerHTML =
            '<div class="loading">사용자 목록을 불러오는 중...</div>';

        const response = await apiClient.get('/api/v1/users', {
            query: {
                query: query,
                limit: limit
            }
        });

        if (!response.ok) {
            throw new Error('사용자 목록을 불러오는데 실패했습니다.');
        }

        const users = await response.json();
        currentUsers = users;
        displayUsers(users);
    } catch (error) {
        console.error('사용자 로딩 실패:', error);
        document.getElementById('table-content').innerHTML =
            '<div class="empty-state">사용자 목록을 불러오는데 실패했습니다.</div>';
        new NoticeBox(error.message, 'error').show();
    }
}

function displayUsers(users) {
    const tableContent = document.getElementById('table-content');

    if (users.length === 0) {
        tableContent.innerHTML =
            '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }

    const usersHtml = users
        .map(
            (user) => `
        <div class="user-item">
            <div class="user-avatar">
                ${
                    user.profileImage
                        ? `<img src="${user.profileImage}" alt="프로필 이미지" />`
                        : '<span class="material-symbols-outlined">person</span>'
                }
            </div>
            <div class="user-info">
                <div class="user-name">
                    ${escape(user.nickname)}
                    ${
                        user.authority === 'admin'
                            ? '<span class="admin-badge">관리자</span>'
                            : user.authority === 'bot'
                            ? '<span class="bot-badge">오토마타</span>'
                            : ''
                    }
                    ${
                        user.isVerified
                            ? '<span class="verified-badge">인증됨</span>'
                            : '<span class="unverified-badge">미인증</span>'
                    }
                </div>
                <div class="user-details">
                    <span>ID: ${escape(user.userid)}</span>
                    <span>이메일: ${escape(user.email || '미설정')}</span>
                    <span>가입일: ${new Date(user.createdAt).toLocaleDateString(
                        'ko-KR'
                    )}</span>
                    <span>권한: ${
                        user.authority === 'admin'
                            ? '관리자'
                            : user.authority === 'bot'
                            ? '오토마타'
                            : '일반 사용자'
                    }</span>
                </div>
            </div>
            <div class="user-actions">
                <button class="action-button view-button" onclick="viewUser('${escape(
                    user.userid
                )}')">
                    <span class="material-symbols-outlined">visibility</span>
                    보기
                </button>
                ${
                    user.authority === 'admin' || user.authority === 'bot'
                        ? `<button class="action-button admin-button" onclick="confirmAdminAction('${escape(
                              user.userid
                          )}', '${escape(user.nickname)}', 'unset')">
                        <span class="material-symbols-outlined">remove_moderator</span>
                        ${
                            user.authority === 'bot'
                                ? '오토마타 권한 해제'
                                : '관리자 해제'
                        }
                       </button>`
                        : `<button class="action-button admin-button" onclick="confirmAdminAction('${escape(
                              user.userid
                          )}', '${escape(user.nickname)}', 'set')">
                        <span class="material-symbols-outlined">admin_panel_settings</span>
                        관리자 설정
                       </button>`
                }
                ${
                    user.isVerified
                        ? `<button class="action-button verify-button" onclick="confirmVerifyAction('${escape(
                              user.userid
                          )}', '${escape(user.nickname)}', 'unverify')">
                        <span class="material-symbols-outlined">verified</span>
                        인증 해제
                       </button>`
                        : `<button class="action-button verify-button" onclick="confirmVerifyAction('${escape(
                              user.userid
                          )}', '${escape(user.nickname)}', 'verify')">
                        <span class="material-symbols-outlined">verified_user</span>
                        인증 설정
                       </button>`
                }
                <button class="action-button delete-button" onclick="confirmDeleteUser('${escape(
                    user.userid
                )}', '${escape(user.nickname)}')">
                    <span class="material-symbols-outlined">delete</span>
                    삭제
                </button>
            </div>
        </div>
    `
        )
        .join('');

    tableContent.innerHTML = usersHtml;
}

function viewUser(userid) {
    window.open(`/${userid}`, '_blank');
}

function confirmDeleteUser(userid, nickname) {
    userToDelete = userid;
    document.getElementById(
        'delete-user-info'
    ).textContent = `정말로 "${nickname}" 사용자를 삭제하시겠습니까?`;
    document.getElementById('delete-modal-overlay').style.display = 'flex';
}

async function deleteUser(userid) {
    try {
        const response = await apiClient.delete(
            `/api/v1/auth/admin/user-delete/${userid}`
        );

        if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error);
        }

        new NoticeBox('사용자가 성공적으로 삭제되었습니다.').show();
        loadUsers(currentQuery);
    } catch (error) {
        console.error('사용자 삭제 실패:', error);
        new NoticeBox(error.message, 'error').show();
    }
}

function confirmAdminAction(userid, nickname, action) {
    pendingAdminAction = { userid, action };
    const title = action === 'set' ? '관리자 권한 부여' : '관리자 권한 해제';
    const message =
        action === 'set'
            ? `"${nickname}" 사용자에게 관리자 권한을 부여하시겠습니까?`
            : `"${nickname}" 사용자의 관리자 권한을 해제하시겠습니까?`;

    document.getElementById('admin-modal-title').textContent = title;
    document.getElementById('admin-action-info').textContent = message;
    document.getElementById('admin-modal-overlay').style.display = 'flex';
}

async function performAdminAction(userid, action) {
    try {
        const endpoint =
            action === 'set'
                ? `/api/v1/auth/admin/set-admin/${userid}`
                : `/api/v1/auth/admin/unset-admin/${userid}`;
        let response;
        if (action === 'set') {
            response = await apiClient.post(endpoint);
        } else {
            response = await apiClient.delete(endpoint);
        }

        if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error);
        }

        const message =
            action === 'set'
                ? '관리자 권한이 성공적으로 부여되었습니다.'
                : '관리자 권한이 성공적으로 해제되었습니다.';
        new NoticeBox(message).show();
        loadUsers(currentQuery);
    } catch (error) {
        console.error('관리자 권한 변경 실패:', error);
        new NoticeBox(error.message, 'error').show();
    }
}

function confirmVerifyAction(userid, nickname, action) {
    pendingVerifyAction = { userid, action };
    const title = action === 'verify' ? '사용자 인증' : '사용자 인증 해제';
    const message =
        action === 'verify'
            ? `"${nickname}" 사용자를 인증된 사용자로 설정하시겠습니까?`
            : `"${nickname}" 사용자의 인증을 해제하시겠습니까?`;

    document.getElementById('verify-modal-title').textContent = title;
    document.getElementById('verify-action-info').textContent = message;
    document.getElementById('verify-modal-overlay').style.display = 'flex';
}

async function performVerifyAction(userid, action) {
    try {
        const endpoint =
            action === 'verify'
                ? `/api/v1/auth/admin/verify-user/${userid}`
                : `/api/v1/auth/admin/unverify-user/${userid}`;
        let response;
        if (action === 'verify') {
            response = await apiClient.post(endpoint);
        } else {
            response = await apiClient.delete(endpoint);
        }

        if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error);
        }

        const message =
            action === 'verify'
                ? '사용자가 성공적으로 인증되었습니다.'
                : '사용자 인증이 성공적으로 해제되었습니다.';
        new NoticeBox(message, 'success').show();
        loadUsers(currentQuery);
    } catch (error) {
        console.error('사용자 인증 상태 변경 실패:', error);
        new NoticeBox(error.message, 'error').show();
    }
}

document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    currentQuery = query;
    loadUsers(query);
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('search-button').click();
    }
});

document.getElementById('refresh-button').addEventListener('click', () => {
    loadUsers(currentQuery);
});

document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('delete-modal-overlay').style.display = 'none';
    userToDelete = null;
});

document.getElementById('cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-modal-overlay').style.display = 'none';
    userToDelete = null;
});

document.getElementById('confirm-delete').addEventListener('click', () => {
    if (userToDelete) {
        deleteUser(userToDelete);
        document.getElementById('delete-modal-overlay').style.display = 'none';
        userToDelete = null;
    }
});

document
    .getElementById('delete-modal-overlay')
    .addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('delete-modal-overlay').style.display =
                'none';
            userToDelete = null;
        }
    });

// Admin action modal event listeners
document.getElementById('admin-modal-close').addEventListener('click', () => {
    document.getElementById('admin-modal-overlay').style.display = 'none';
    pendingAdminAction = null;
});

document.getElementById('cancel-admin-action').addEventListener('click', () => {
    document.getElementById('admin-modal-overlay').style.display = 'none';
    pendingAdminAction = null;
});

document
    .getElementById('confirm-admin-action')
    .addEventListener('click', () => {
        if (pendingAdminAction) {
            performAdminAction(
                pendingAdminAction.userid,
                pendingAdminAction.action
            );
            document.getElementById('admin-modal-overlay').style.display =
                'none';
            pendingAdminAction = null;
        }
    });

document
    .getElementById('admin-modal-overlay')
    .addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('admin-modal-overlay').style.display =
                'none';
            pendingAdminAction = null;
        }
    });

// Verify action modal event listeners
document.getElementById('verify-modal-close').addEventListener('click', () => {
    document.getElementById('verify-modal-overlay').style.display = 'none';
    pendingVerifyAction = null;
});

document
    .getElementById('cancel-verify-action')
    .addEventListener('click', () => {
        document.getElementById('verify-modal-overlay').style.display = 'none';
        pendingVerifyAction = null;
    });

document
    .getElementById('confirm-verify-action')
    .addEventListener('click', () => {
        if (pendingVerifyAction) {
            performVerifyAction(
                pendingVerifyAction.userid,
                pendingVerifyAction.action
            );
            document.getElementById('verify-modal-overlay').style.display =
                'none';
            pendingVerifyAction = null;
        }
    });

document
    .getElementById('verify-modal-overlay')
    .addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('verify-modal-overlay').style.display =
                'none';
            pendingVerifyAction = null;
        }
    });

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

window.viewUser = viewUser;
window.confirmDeleteUser = confirmDeleteUser;
window.confirmAdminAction = confirmAdminAction;
window.confirmVerifyAction = confirmVerifyAction;
