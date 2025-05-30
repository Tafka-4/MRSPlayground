import NoticeBox from './module/notice.js';

let currentUsers = [];
let currentPage = 1;
let currentQuery = '';
let userToDelete = null;

async function loadUsers(query = '', limit = 10) {
    try {
        const tableContent = document.getElementById('table-content');
        tableContent.innerHTML = '<div class="loading">사용자 목록을 불러오는 중...</div>';
        
        const url = new URL('/api/user', window.location.origin);
        if (query) url.searchParams.append('query', query);
        url.searchParams.append('limit', limit);
        
        const response = await fetch(url, {
            credentials: 'include'
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
        showNotice(error.message, 'error');
    }
}

function displayUsers(users) {
    const tableContent = document.getElementById('table-content');
    
    if (users.length === 0) {
        tableContent.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }
    
    const usersHtml = users.map(user => `
        <div class="user-item">
            <div class="user-avatar">
                ${user.profileImage ? 
                    `<img src="${user.profileImage}" alt="프로필 이미지" />` : 
                    '<span class="material-symbols-outlined">person</span>'
                }
            </div>
            <div class="user-info">
                <div class="user-name">${user.nickname}</div>
                <div class="user-details">
                    <span>ID: ${user.userid}</span>
                    <span>이메일: ${user.email || '미설정'}</span>
                    <span>가입일: ${new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
            </div>
            <div class="user-actions">
                <button class="action-button view-button" onclick="viewUser('${user.userid}')">
                    <span class="material-symbols-outlined">visibility</span>
                    보기
                </button>
                <button class="action-button delete-button" onclick="confirmDeleteUser('${user.userid}', '${user.nickname}')">
                    <span class="material-symbols-outlined">delete</span>
                    삭제
                </button>
            </div>
        </div>
    `).join('');
    
    tableContent.innerHTML = usersHtml;
}

function viewUser(userid) {
    window.open(`/${userid}`, '_blank');
}

function confirmDeleteUser(userid, nickname) {
    userToDelete = userid;
    document.getElementById('delete-user-info').textContent = 
        `정말로 "${nickname}" 사용자를 삭제하시겠습니까?`;
    document.getElementById('delete-modal-overlay').style.display = 'flex';
}

async function deleteUser(userid) {
    try {
        const response = await fetch('/api/user/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ userid })
        });
        
        if (!response.ok) {
            throw new Error('사용자 삭제에 실패했습니다.');
        }
        
        showNotice('사용자가 성공적으로 삭제되었습니다.');
        loadUsers(currentQuery);
        
    } catch (error) {
        console.error('사용자 삭제 실패:', error);
        showNotice(error.message, 'error');
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

document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('delete-modal-overlay').style.display = 'none';
        userToDelete = null;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

window.viewUser = viewUser;
window.confirmDeleteUser = confirmDeleteUser; 