import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';
import escape from '/module/escape.js';

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

                    let response;
        if (query && query.trim().length >= 2) {
            response = await apiClient.get('/api/v1/users/admin/search', {
                query: {
                    q: query.trim(),
                    limit: limit
                }
            });
        } else {
            response = await apiClient.get('/api/v1/users', {
                query: {
                    limit: limit
                }
            });
        }

        const users = response.users || [];
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
                <div class="user-front-info-container">
                    <div class="user-nickname">
                        ${escape(user.nickname)}
                    </div>
                    <div class="user-badges-container">
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
    window.open(`/user/${userid}`, '_blank');
}

function confirmDeleteUser(userid, nickname) {
    userToDelete = userid;
    document.getElementById(
        'delete-user-info'
    ).textContent = `정말로 "${escape(nickname)}" 사용자를 삭제하시겠습니까?`;
    document.getElementById('delete-modal-overlay').style.display = 'flex';
}

async function deleteUser(userid) {
    try {
        await apiClient.delete(
            `/api/v1/auth/admin/user-delete/${userid}`
        );

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
            ? `"${escape(nickname)}" 사용자에게 관리자 권한을 부여하시겠습니까?`
            : `"${escape(nickname)}" 사용자의 관리자 권한을 해제하시겠습니까?`;

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
        if (action === 'set') {
            await apiClient.post(endpoint);
        } else {
            await apiClient.delete(endpoint);
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
            ? `"${escape(nickname)}" 사용자를 인증된 사용자로 설정하시겠습니까?`
            : `"${escape(nickname)}" 사용자의 인증을 해제하시겠습니까?`;

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
        if (action === 'verify') {
            await apiClient.post(endpoint);
        } else {
            await apiClient.delete(endpoint);
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

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const refreshButton = document.getElementById('refresh-button');
    
    const deleteModalOverlay = document.getElementById('delete-modal-overlay');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const deleteModalCloseBtn = document.querySelector('#delete-modal-overlay .modal-close');

    const adminModalOverlay = document.getElementById('admin-modal-overlay');
    const confirmAdminBtn = document.getElementById('confirm-admin-action');
    const cancelAdminBtn = document.getElementById('cancel-admin-action');
    const adminModalCloseBtn = document.querySelector('#admin-modal-overlay .modal-close');

    const verifyModalOverlay = document.getElementById('verify-modal-overlay');
    const confirmVerifyBtn = document.getElementById('confirm-verify-action');
    const cancelVerifyBtn = document.getElementById('cancel-verify-action');
    const verifyModalCloseBtn = document.querySelector('#verify-modal-overlay .modal-close');

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            currentQuery = searchInput.value;
            loadUsers(currentQuery);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                searchButton.click();
            }
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            searchInput.value = '';
            currentQuery = '';
            loadUsers();
        });
    }

    const closeModal = (modal) => {
        if (modal) {
            modal.style.display = 'none';
        }
        userToDelete = null;
        pendingAdminAction = null;
        pendingVerifyAction = null;
    };

    // Delete Modal
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (userToDelete) {
                deleteUser(userToDelete);
            }
            closeModal(deleteModalOverlay);
        });
    }
    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => closeModal(deleteModalOverlay));
    if(deleteModalCloseBtn) deleteModalCloseBtn.addEventListener('click', () => closeModal(deleteModalOverlay));

    // Admin Modal
    if (confirmAdminBtn) {
        confirmAdminBtn.addEventListener('click', () => {
            if (pendingAdminAction) {
                performAdminAction(pendingAdminAction.userid, pendingAdminAction.action);
            }
            closeModal(adminModalOverlay);
        });
    }
    if(cancelAdminBtn) cancelAdminBtn.addEventListener('click', () => closeModal(adminModalOverlay));
    if(adminModalCloseBtn) adminModalCloseBtn.addEventListener('click', () => closeModal(adminModalOverlay));
    
    // Verify Modal
    if(confirmVerifyBtn) {
        confirmVerifyBtn.addEventListener('click', () => {
            if (pendingVerifyAction) {
                performVerifyAction(pendingVerifyAction.userid, pendingVerifyAction.action);
            }
            closeModal(verifyModalOverlay);
        });
    }
    if(cancelVerifyBtn) cancelVerifyBtn.addEventListener('click', () => closeModal(verifyModalOverlay));
    if(verifyModalCloseBtn) verifyModalCloseBtn.addEventListener('click', () => closeModal(verifyModalOverlay));

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (deleteModalOverlay && deleteModalOverlay.style.display === 'flex') {
                closeModal(deleteModalOverlay);
            }
            if (adminModalOverlay && adminModalOverlay.style.display === 'flex') {
                closeModal(adminModalOverlay);
            }
            if (verifyModalOverlay && verifyModalOverlay.style.display === 'flex') {
                closeModal(verifyModalOverlay);
            }
        }
        if (event.key === 'Enter') {
            if (deleteModalOverlay && deleteModalOverlay.style.display === 'flex') {
                confirmDeleteBtn.click();
            }
            if (adminModalOverlay && adminModalOverlay.style.display === 'flex') {
                confirmAdminBtn.click();
            }
            if (verifyModalOverlay && verifyModalOverlay.style.display === 'flex') {
                confirmVerifyBtn.click();
            }
        }
    });
});

window.viewUser = viewUser;
window.confirmDeleteUser = confirmDeleteUser;
window.confirmAdminAction = confirmAdminAction;
window.confirmVerifyAction = confirmVerifyAction;
