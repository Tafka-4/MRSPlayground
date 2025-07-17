import escape from '/module/escape.js';
import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { initializeComponents, loadSavedTheme } from '/component/index.js';
import { createButton } from '/component/buttons/index.js';
import { createRoleBadge, createVerificationBadge } from '/component/badges/index.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[2];

let currentUser = null;
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;
let editingEntryId = null;

async function isMe() {
    try {
        const result = await apiClient.get(`/api/v1/auth/me`);
        return result.success && result.user && result.user.userid === targetUserId;
    } catch (error) {
        return false;
    }
}

async function getCurrentUserInfo() {
    try {
        const result = await apiClient.get(`/api/v1/auth/me`);
        if (result.success && result.user) {
            currentUser = result.user;
        }
    } catch (error) {
        console.error('Current user info fetch failed:', error);
        currentUser = null;
    }
}

function canEditEntry(entry) {
    return currentUser && currentUser.userid === entry.sender_userid;
}

function updatePaginationDisplay() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        createPaginationContainer();
        return updatePaginationDisplay();
    }

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    
    let paginationHTML = '';
    
    if (currentPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" onclick="loadGuestbookList(${currentPage - 1})">
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
        `;
    }
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        paginationHTML += `
            <button class="pagination-btn ${isActive}" onclick="loadGuestbookList(${i})">
                ${i}
            </button>
        `;
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-btn" onclick="loadGuestbookList(${currentPage + 1})">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        `;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function createPaginationContainer() {
    const guestbookContent = document.querySelector('.guestbook-content');
    if (guestbookContent && !document.getElementById('pagination-container')) {
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.className = 'pagination-container';
        guestbookContent.appendChild(paginationContainer);
    }
}

function hidePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
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

    document.getElementById('mobile-title').textContent = `${user.nickname}님의 방명록`;
    document.getElementById('user-nickname').textContent = user.nickname;
    document.title = `${user.nickname}님의 방명록 - 마법연구회`;

    setupEventListeners();
    setupProfileNavigation();
    updateNavigationLinks();
    loadGuestbookList();
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
            window.location.href = `/user/${targetUserId}/activity`;
        });
    }
    if (guestbookNavLink) {
        guestbookNavLink.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
}

function setupEventListeners() {
    const submitGuestbook = document.getElementById('submit-guestbook');
    const guestbookMessage = document.getElementById('guestbook-message');
    
    if (submitGuestbook) {
        submitGuestbook.addEventListener('click', handleGuestbookSubmit);
    }
    
    if (guestbookMessage) {
        guestbookMessage.addEventListener('input', handleGuestbookInput);
        updateGuestbookCharCounter();
    }

    const guestbookContent = document.querySelector('.guestbook-content');
    if (guestbookContent && !document.getElementById('write-guestbook-btn')) {
        const writeButton = document.createElement('button');
        writeButton.id = 'write-guestbook-btn';
        writeButton.className = 'btn btn-primary write-guestbook-btn';
        writeButton.innerHTML = '<span class="material-symbols-outlined">edit</span>방명록 작성하기';
        writeButton.addEventListener('click', () => {
            window.location.href = `/user/${targetUserId}/guestbook/write`;
        });
        
        guestbookContent.insertBefore(writeButton, guestbookContent.firstChild);
    }
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

async function loadGuestbookList(page = 1) {
    const guestbookList = document.getElementById('guestbook-list');
    if (!guestbookList) return;

    try {
        guestbookList.innerHTML = '<div class="loading">방명록을 불러오는 중...</div>';
        
        const response = await apiClient.get(`/api/v1/guestbook/${targetUserId}?page=${page}&limit=${itemsPerPage}`);
        
        if (!response.success || !response.data || response.data.length === 0) {
            guestbookList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">book</span>
                    <p>아직 방명록이 없습니다.</p>
                </div>
            `;
            hidePagination();
            return;
        }
        
        currentPage = page;
        if (response.pagination) {
            totalPages = response.pagination.totalPages;
            updatePaginationDisplay();
        }
        
        await getCurrentUserInfo();
        
        guestbookList.innerHTML = response.data.map(entry => `
            <div class="guestbook-item" data-entry-id="${entry.id}">
                <div class="guestbook-header">
                    <div class="guestbook-author">
                        <strong>${escape(entry.sender_nickname || '익명')}</strong>
                        <small>${new Date(entry.createdAt).toLocaleDateString('ko-KR')}</small>
                        ${entry.updatedAt && entry.updatedAt !== entry.createdAt ? 
                            `<small class="edited-indicator">(edited)</small>` : ''
                        }
                    </div>
                    <div class="guestbook-actions">
                        ${canEditEntry(entry) ? `
                            <button class="action-btn edit-btn" onclick="startEditEntry(${entry.id})">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteEntry(${entry.id})">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="guestbook-message" id="message-${entry.id}">
                    ${escape(entry.message)}
                </div>
                <div class="edit-form" id="edit-form-${entry.id}" style="display: none;">
                    <textarea class="edit-textarea" maxlength="150">${escape(entry.message)}</textarea>
                    <div class="edit-actions">
                        <button class="btn btn-sm btn-primary" onclick="saveEdit(${entry.id})">저장</button>
                        <button class="btn btn-sm btn-secondary" onclick="cancelEdit(${entry.id})">취소</button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('방명록 로딩 실패:', error);
        guestbookList.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>방명록을 불러올 수 없습니다.</p>
            </div>
        `;
        hidePagination();
    }
}

function handleGuestbookInput() {
    const messageInput = document.getElementById('guestbook-message');
    const maxLength = 150;
    const currentLength = messageInput.value.length;
    
    if (currentLength > maxLength) {
        messageInput.value = messageInput.value.substring(0, maxLength);
        showGuestbookCharLimitMessage();
    }
    
    updateGuestbookCharCounter();
}

function updateGuestbookCharCounter() {
    const messageInput = document.getElementById('guestbook-message');
    const charCounter = document.getElementById('guestbook-char-counter');
    
    if (!messageInput || !charCounter) return;
    
    const maxLength = 150;
    const currentLength = messageInput.value.length;
    
    charCounter.textContent = `${currentLength}/${maxLength}`;
    
    if (currentLength >= 130) {
        charCounter.classList.add('warning');
    } else {
        charCounter.classList.remove('warning');
    }
}

function showGuestbookCharLimitMessage() {
    const existingMessage = document.querySelector('.char-limit-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const charLimitMessage = document.createElement('div');
    charLimitMessage.className = 'char-limit-message';
    charLimitMessage.textContent = '방명록은 150자까지 입력 가능합니다.';
    
    const guestbookForm = document.querySelector('.guestbook-form');
    guestbookForm.appendChild(charLimitMessage);
    
    setTimeout(() => {
        charLimitMessage.remove();
    }, 2000);
}

async function handleGuestbookSubmit() {
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    
    if (!message) {
        new NoticeBox('방명록 내용을 입력해주세요.', 'warning').show();
        return;
    }
    
    if (message.length > 150) {
        new NoticeBox('방명록은 150자 이하로 작성해주세요.', 'warning').show();
        return;
    }
    
    try {
        const response = await apiClient.post(`/api/v1/guestbook/${targetUserId}`, {
            message: message
        });
        
        if (response.success) {
            messageInput.value = '';
            updateGuestbookCharCounter();
            new NoticeBox(response.message || '방명록이 작성되었습니다.', 'success').show();
            loadGuestbookList(currentPage);
        } else {
            throw new Error(response.message || '방명록 작성에 실패했습니다.');
        }
        
    } catch (error) {
        new NoticeBox(error.message || '방명록 작성에 실패했습니다.', 'error').show();
    }
}

async function startEditEntry(entryId) {
    if (editingEntryId && editingEntryId !== entryId) {
        cancelEdit(editingEntryId);
    }
    
    editingEntryId = entryId;
    document.getElementById(`message-${entryId}`).style.display = 'none';
    document.getElementById(`edit-form-${entryId}`).style.display = 'block';
    
    const textarea = document.querySelector(`#edit-form-${entryId} .edit-textarea`);
    if (textarea) {
        textarea.focus();
    }
}

async function saveEdit(entryId) {
    const textarea = document.querySelector(`#edit-form-${entryId} .edit-textarea`);
    const newMessage = textarea.value.trim();
    
    if (!newMessage) {
        new NoticeBox('메시지를 입력해주세요.', 'warning').show();
        return;
    }
    
    if (newMessage.length > 150) {
        new NoticeBox('메시지는 150자를 초과할 수 없습니다.', 'warning').show();
        return;
    }
    
    try {
        const response = await apiClient.put(`/api/v1/guestbook/entry/${entryId}`, {
            message: newMessage
        });
        
        if (response.success) {
            new NoticeBox('방명록이 수정되었습니다.', 'success').show();
            loadGuestbookList(currentPage);
            editingEntryId = null;
        } else {
            throw new Error(response.message || '방명록 수정에 실패했습니다.');
        }
        
    } catch (error) {
        new NoticeBox(error.message || '방명록 수정에 실패했습니다.', 'error').show();
    }
}

function cancelEdit(entryId) {
    document.getElementById(`message-${entryId}`).style.display = 'block';
    document.getElementById(`edit-form-${entryId}`).style.display = 'none';
    editingEntryId = null;
}

async function deleteEntry(entryId) {
    if (!confirm('정말로 이 방명록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await apiClient.delete(`/api/v1/guestbook/entry/${entryId}`);
        
        if (response.success) {
            new NoticeBox('방명록이 삭제되었습니다.', 'success').show();
            
            const guestbookItems = document.querySelectorAll('.guestbook-item');
            if (guestbookItems.length === 1 && currentPage > 1) {
                loadGuestbookList(currentPage - 1);
            } else {
                loadGuestbookList(currentPage);
            }
        } else {
            throw new Error(response.message || '방명록 삭제에 실패했습니다.');
        }
        
    } catch (error) {
        new NoticeBox(error.message || '방명록 삭제에 실패했습니다.', 'error').show();
    }
}

const style = document.createElement('style');
style.textContent = `
    .guestbook-item {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        background: var(--background-color);
        border-radius: 0.5rem;
        box-shadow: var(--shadow);
    }

    .guestbook-author {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.375rem;
        color: var(--text-primary);
    }

    .guestbook-author small {
        color: var(--text-muted);
    }

    .guestbook-message {
        color: var(--text-secondary);
        line-height: 1.4;
        margin: 0;
        word-wrap: break-word;
    }

    .loading {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
    }

    .write-guestbook-btn {
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
    }

    .guestbook-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.25rem;
    }

    .guestbook-actions {
        display: flex;
        gap: 0.25rem;
    }

    .action-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
    }

    .action-btn:hover {
        background-color: var(--lighter-background);
    }

    .action-btn .material-symbols-outlined {
        font-size: 16px;
        color: var(--text-secondary);
    }

    .edit-btn:hover .material-symbols-outlined {
        color: var(--info-color);
    }

    .delete-btn:hover .material-symbols-outlined {
        color: var(--error-color);
    }

    .edited-indicator {
        color: var(--text-muted);
        font-style: italic;
        margin-left: 0.5rem;
    }

    .edit-form {
        margin-top: 0.25rem;
    }

    .edit-textarea {
        width: 100%;
        min-height: 60px;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 0.25rem;
        font-family: inherit;
        font-size: 0.9rem;
        resize: vertical;
        background-color: var(--card-background);
        color: var(--text-primary);
    }

    .edit-textarea:focus {
        outline: none;
        border-color: var(--primary-color);
    }

    .edit-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.375rem;
        justify-content: flex-end;
    }

    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
    }

    .btn-primary {
        background-color: var(--primary-color);
        color: var(--card-background);
    }

    .btn-primary:hover {
        background-color: var(--primary-hover);
    }

    .btn-secondary {
        background-color: var(--secondary-color);
        color: var(--card-background);
    }

    .btn-secondary:hover {
        background-color: var(--text-secondary);
    }

    .pagination-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
        padding: 1rem 0;
    }

    .pagination-btn {
        background-color: var(--card-background);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        padding: 0.5rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 2.5rem;
        font-size: 0.875rem;
    }

    .pagination-btn:hover {
        background-color: var(--lighter-background);
        color: var(--text-primary);
    }

    .pagination-btn.active {
        background-color: var(--primary-color);
        color: var(--card-background);
        border-color: var(--primary-color);
    }

    .pagination-btn .material-symbols-outlined {
        font-size: 18px;
    }

    .mobile-profile-header {
        position: sticky;
        top: 64px;
        background: var(--card-background);
        z-index: 100;
        border-bottom: 1px solid var(--border-color);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    .guestbook-content {
        position: relative;
    }

    .write-guestbook-btn {
        position: sticky;
        top: 120px; /* Below mobile header */
        z-index: 90;
        background: var(--primary-color) !important;
        color: var(--card-background) !important;
        border: none !important;
        margin-bottom: 1rem;
        box-shadow: var(--shadow);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    .write-guestbook-btn:hover {
        background: var(--primary-hover) !important;
        transform: translateY(-1px);
    }

    /* Compact form styling for mobile */
    .guestbook-form {
        background: var(--lighter-background);
        border-radius: 0.5rem;
        padding: 0.75rem;
        margin-bottom: 1rem;
        border: 1px solid var(--border-color);
    }

    .guestbook-form textarea {
        margin-bottom: 0.5rem;
    }

    .guestbook-form-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
    }

    .char-counter {
        font-size: 0.8rem;
        color: var(--text-muted);
    }

    .char-counter.warning {
        color: var(--warning-color);
        font-weight: 500;
    }

    @media (max-width: 768px) {
        .guestbook-header {
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .guestbook-actions {
            align-self: flex-end;
        }
        
        .edit-actions {
            flex-direction: column;
        }
        
        .pagination-container {
            flex-wrap: wrap;
        }

        .write-guestbook-btn {
            top: 100px; /* Adjust for mobile header */
        }

        .mobile-profile-header {
            top: 60px; /* Adjust for mobile main header */
        }
    }

    @media (min-width: 769px) {
        /* Desktop sticky navigation */
        .profile-navigation-container {
            position: sticky;
            top: 80px;
            z-index: 100;
        }
    }
`;
document.head.appendChild(style);

window.startEditEntry = startEditEntry;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.deleteEntry = deleteEntry;
window.loadGuestbookList = loadGuestbookList;

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
}); 