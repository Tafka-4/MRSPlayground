import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { initializeComponents, loadSavedTheme } from '/component/index.js';
import { createButton } from '/component/buttons/index.js';
import { createConfirmCancelModal } from '/component/modals/index.js';

let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 10;

async function initializePage() {
    initializeComponents();
    loadSavedTheme();
    
    try {
        const result = await apiClient.get('/api/v1/auth/me');
        currentUser = result.user;
        setupEventListeners();
        loadGuestbookData();
        loadGuestbookStats();
    } catch (error) {
        console.error('사용자 정보 로딩 실패:', error);
        new NoticeBox('사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.', 'error').show();
        setTimeout(() => window.location.href = '/login', 2000);
    }
}

function setupEventListeners() {
    document.getElementById('refreshButton').addEventListener('click', () => {
        loadGuestbookData();
        loadGuestbookStats();
    });

    document.getElementById('retryButton').addEventListener('click', () => {
        loadGuestbookData();
        loadGuestbookStats();
    });

    setupProfileNavigation();
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

async function loadGuestbookStats() {
    try {
        const result = await apiClient.get(`/api/v1/guestbook/${currentUser.userid}/statistics`);
        
        const stats = result.data;
        document.getElementById('totalMessages').textContent = stats.totalEntries;
        document.getElementById('uniqueSenders').textContent = stats.uniqueSenders;
        document.getElementById('recentMessages').textContent = stats.recentEntries;
    } catch (error) {
        console.error('방명록 통계 로딩 실패:', error);
    }
}

async function loadGuestbookData() {
    showLoading();
    
    try {
        const result = await apiClient.get(`/api/v1/guestbook/${currentUser.userid}?page=${currentPage}&limit=${itemsPerPage}`);
        
        const { data, pagination } = result;
        totalPages = pagination.totalPages;
        
        if (data.length === 0) {
            showEmpty();
        } else {
            displayGuestbookEntries(data);
            displayPagination(pagination);
        }
    } catch (error) {
        console.error('방명록 로딩 실패:', error);
        showError(error.message || '방명록을 불러올 수 없습니다.');
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('error-container').style.display = 'none';
    document.getElementById('empty-container').style.display = 'none';
    document.getElementById('guestbook-entries').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-container').style.display = 'flex';
    document.getElementById('empty-container').style.display = 'none';
    document.getElementById('guestbook-entries').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('error-message').textContent = message;
}

function showEmpty() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-container').style.display = 'none';
    document.getElementById('empty-container').style.display = 'flex';
    document.getElementById('guestbook-entries').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
}

function displayGuestbookEntries(entries) {
    const container = document.getElementById('guestbook-entries');
    container.innerHTML = '';
    
    entries.forEach(entry => {
        const entryElement = createGuestbookEntryElement(entry);
        container.appendChild(entryElement);
    });
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-container').style.display = 'none';
    document.getElementById('empty-container').style.display = 'none';
    container.style.display = 'flex';
}

function createGuestbookEntryElement(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'guestbook-entry';
    
    const isMyMessage = entry.sender_userid === currentUser.userid;
    const isMyGuestbook = entry.target_userid === currentUser.userid;
    
    entryDiv.innerHTML = `
        <div class="entry-header">
            <div class="entry-author">
                <div class="author-avatar">
                    ${entry.sender_profileImage 
                        ? `<img src="${entry.sender_profileImage}" alt="프로필 이미지" />` 
                        : '<span class="material-symbols-outlined">person</span>'
                    }
                </div>
                <div class="author-info">
                    <div class="author-name">${entry.sender_nickname}</div>
                    <div class="entry-date">${formatDate(entry.createdAt)}</div>
                </div>
            </div>
            ${(isMyMessage || isMyGuestbook) ? `
                <div class="entry-actions">
                    ${isMyMessage ? `
                        <button class="entry-action-btn edit" title="수정" data-entry-id="${entry.id}">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    ` : ''}
                    <button class="entry-action-btn delete" title="삭제" data-entry-id="${entry.id}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            ` : ''}
        </div>
        <div class="entry-content">${entry.message}</div>
        <div class="entry-footer">
            <span class="entry-id">#${entry.id}</span>
            ${entry.updatedAt !== entry.createdAt ? '<span class="edited-badge">수정됨</span>' : ''}
        </div>
    `;
    
    const editBtn = entryDiv.querySelector('.edit');
    const deleteBtn = entryDiv.querySelector('.delete');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => showEditModal(entry));
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => showDeleteModal(entry));
    }
    
    return entryDiv;
}

function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    
    if (pagination.totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '이전';
    prevBtn.disabled = pagination.currentPage <= 1;
    prevBtn.addEventListener('click', () => {
        if (pagination.currentPage > 1) {
            currentPage = pagination.currentPage - 1;
            loadGuestbookData();
        }
    });
    container.appendChild(prevBtn);
    
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === pagination.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            loadGuestbookData();
        });
        container.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '다음';
    nextBtn.disabled = pagination.currentPage >= pagination.totalPages;
    nextBtn.addEventListener('click', () => {
        if (pagination.currentPage < pagination.totalPages) {
            currentPage = pagination.currentPage + 1;
            loadGuestbookData();
        }
    });
    container.appendChild(nextBtn);
    
    const infoSpan = document.createElement('span');
    infoSpan.className = 'pagination-info';
    infoSpan.textContent = `${pagination.currentPage} / ${pagination.totalPages} 페이지`;
    container.appendChild(infoSpan);
    
    container.style.display = 'flex';
}

function showEditModal(entry) {
    const modal = createConfirmCancelModal({
        id: 'edit-guestbook-modal',
        title: '방명록 수정',
        message: `
            <div style="margin-bottom: 1rem;">
                <label for="edit-message" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">메시지</label>
                <textarea 
                    id="edit-message" 
                    rows="4" 
                    style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;"
                    maxlength="1000"
                >${entry.message}</textarea>
                <div style="text-align: right; margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);">
                    <span id="char-count">${entry.message.length}</span>/1000
                </div>
            </div>
        `,
        confirmText: '수정',
        cancelText: '취소',
        variant: 'primary',
        onConfirm: () => handleEditGuestbook(entry.id)
    });
    
    document.body.appendChild(modal);
    
    const textarea = document.getElementById('edit-message');
    const charCount = document.getElementById('char-count');
    
    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });
}

function showDeleteModal(entry) {
    const modal = createConfirmCancelModal({
        id: 'delete-guestbook-modal',
        title: '방명록 삭제',
        message: '정말로 이 방명록을 삭제하시겠습니까?',
        confirmText: '삭제',
        cancelText: '취소',
        variant: 'danger',
        onConfirm: () => handleDeleteGuestbook(entry.id)
    });
    document.body.appendChild(modal);
}

async function handleEditGuestbook(entryId) {
    const message = document.getElementById('edit-message').value.trim();
    
    if (!message) {
        new NoticeBox('메시지를 입력해주세요.', 'error').show();
        return;
    }
    
    try {
        const result = await apiClient.put(`/api/v1/guestbook/entry/${entryId}`, { message });
        
        new NoticeBox('방명록이 수정되었습니다.', 'success').show();
        loadGuestbookData();
    } catch (error) {
        console.error('방명록 수정 실패:', error);
        new NoticeBox('방명록 수정에 실패했습니다.', 'error').show();
    }
}

async function handleDeleteGuestbook(entryId) {
    try {
        const result = await apiClient.delete(`/api/v1/guestbook/entry/${entryId}`);
        
        new NoticeBox('방명록이 삭제되었습니다.', 'success').show();
        loadGuestbookData();
        loadGuestbookStats();
    } catch (error) {
        console.error('방명록 삭제 실패:', error);
        new NoticeBox('방명록 삭제에 실패했습니다.', 'error').show();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return '어제';
    } else if (diffDays <= 7) {
        return `${diffDays}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR');
    }
}

document.addEventListener('DOMContentLoaded', initializePage); 