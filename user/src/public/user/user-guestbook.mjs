import { get, post, put, del } from '/module/api.js';
import { setupMobileHeaderScroll } from '/module/animation.js';
import { showNotice } from '/module/notice.js';
import escape from '/module/escape.js';

let targetUserId = null;
let currentUser = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 5;
let totalPages = 1;
let editingEntryId = null;

document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    targetUserId = pathParts[2];
    
    if (!targetUserId) {
        window.location.href = '/';
        return;
    }

    initializePage();
});

async function initializePage() {
    const loadingEl = document.getElementById('loading');
    const errorContainerEl = document.getElementById('error-container');
    const errorMessageEl = document.getElementById('error-message');

    try {
        const [user, targetUser] = await Promise.all([
            get('/api/user').catch(() => null),
            get(`/api/user/${targetUserId}`)
        ]);

        currentUser = user;

        if (!targetUser) throw new Error('사용자를 찾을 수 없습니다.');

        if (currentUser && currentUser.userId === targetUser.userId) {
            window.location.href = '/mypage/guestbook';
            return;
        }

        renderPage(targetUser);
        setupEventListeners();
        loadGuestbook(1);

    } catch (error) {
        loadingEl.style.display = 'none';
        errorMessageEl.textContent = error.message || '정보를 불러오는 데 실패했습니다.';
        errorContainerEl.style.display = 'block';
    }
}

function renderPage(targetUser) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    document.getElementById('mobile-title').textContent = `${targetUser.nickname}님의 방명록`;
    document.getElementById('user-nickname').textContent = `${targetUser.nickname}`;
    document.title = `${targetUser.nickname}님의 방명록 - 마법연구회`;
    
    updateNavigationLinks();
    setupMobileHeaderScroll();
}

function updateNavigationLinks() {
    document.getElementById('profile-nav-link').href = `/user/${targetUserId}`;
    document.getElementById('activity-nav-link').href = `/user/${targetUserId}/activity`;
    document.getElementById('guestbook-nav-link').href = `/user/${targetUserId}/guestbook`;
}

function setupEventListeners() {
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNavClose = document.getElementById('profileNavClose');
    const profileNavOverlay = document.getElementById('profileNavOverlay');
    const profileNavigation = document.getElementById('profileNavigation');

    const openNav = () => {
        profileNavigation.classList.add('active');
        profileNavOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    const closeNav = () => {
        profileNavigation.classList.remove('active');
        profileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    profileMenuToggle.addEventListener('click', openNav);
    profileNavClose.addEventListener('click', closeNav);
    profileNavOverlay.addEventListener('click', closeNav);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileNavigation.classList.contains('active')) {
            closeNav();
        }
    });

    document.getElementById('submit-guestbook').addEventListener('click', submitGuestbook);
    document.getElementById('guestbook-message').addEventListener('input', updateCharCounter);
}

function updateCharCounter() {
    const textarea = document.getElementById('guestbook-message');
    const counter = document.getElementById('guestbook-char-counter');
    const maxLength = textarea.maxLength;
    const currentLength = textarea.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.classList.toggle('warning', currentLength > maxLength * 0.9);
}

async function loadGuestbook(page) {
    currentPage = page;
    const listEl = document.getElementById('guestbook-list');
    listEl.innerHTML = '<div class="loading">방명록을 불러오는 중...</div>';

    try {
        const data = await get(`/api/user/${targetUserId}/guestbook?page=${page}&limit=${ITEMS_PER_PAGE}`);
        
        if (!data || data.entries.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">book</span>
                    <p>아직 방명록이 없습니다.</p>
                </div>`;
            updatePagination(null);
            return;
        }

        renderGuestbookEntries(data.entries);
        totalPages = data.totalPages;
        updatePagination(data);

    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>방명록을 불러올 수 없습니다.</p>
            </div>`;
    }
}

function renderGuestbookEntries(entries) {
    const listEl = document.getElementById('guestbook-list');
    listEl.innerHTML = entries.map(entry => {
        const canEdit = currentUser && currentUser.userId === entry.senderId;
        return `
        <div class="guestbook-item" data-entry-id="${entry.id}">
            <div class="guestbook-author">
                <div>
                    <strong>${escape(entry.senderNickname || '익명')}</strong>
                    <small>${new Date(entry.createdAt).toLocaleDateString()}</small>
                    ${entry.isEdited ? '<small class="edited-indicator">(수정됨)</small>' : ''}
                </div>
                ${canEdit ? `
                <div class="guestbook-actions">
                    <button class="action-btn edit-btn" onclick="window.startEditEntry(${entry.id}, \`${escape(entry.message)}\`)">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="action-btn delete-btn" onclick="window.deleteEntry(${entry.id})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>` : ''}
            </div>
            <div class="guestbook-message" id="message-${entry.id}">${escape(entry.message)}</div>
            <div class="edit-form" id="edit-form-${entry.id}" style="display:none;"></div>
        </div>
    `}).join('');
}

function updatePagination(data) {
    const paginationContainer = document.querySelector('.pagination-container') || createPaginationContainer();
    if (!data || data.totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    let paginationHTML = '';

    if (data.currentPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="window.loadGuestbook(${data.currentPage - 1})">&lt;</button>`;
    }

    for (let i = 1; i <= data.totalPages; i++) {
        paginationHTML += `<button class="pagination-btn ${i === data.currentPage ? 'active' : ''}" onclick="window.loadGuestbook(${i})">${i}</button>`;
    }

    if (data.currentPage < data.totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="window.loadGuestbook(${data.currentPage + 1})">&gt;</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;
}

function createPaginationContainer() {
    const container = document.createElement('div');
    container.className = 'pagination-container';
    document.querySelector('.guestbook-content').appendChild(container);
    return container;
}


async function submitGuestbook() {
    const textarea = document.getElementById('guestbook-message');
    const message = textarea.value.trim();

    if (!message) {
        showNotice('메시지를 입력해주세요.', 'warning');
        return;
    }
    
    try {
        await post(`/api/user/${targetUserId}/guestbook`, { message });
        textarea.value = '';
        updateCharCounter();
        showNotice('방명록이 성공적으로 작성되었습니다.', 'success');
        loadGuestbook(1);
    } catch (error) {
        showNotice(error.message || '방명록 작성에 실패했습니다.', 'error');
    }
}

window.startEditEntry = (entryId, currentMessage) => {
    if (editingEntryId) cancelEdit(editingEntryId);
    
    editingEntryId = entryId;
    document.getElementById(`message-${entryId}`).style.display = 'none';
    const formEl = document.getElementById(`edit-form-${entryId}`);
    formEl.style.display = 'block';
    formEl.innerHTML = `
        <textarea class="edit-textarea" maxlength="150">${currentMessage}</textarea>
        <div class="edit-actions">
            <button class="btn btn-sm btn-primary" onclick="saveEdit(${entryId})">저장</button>
            <button class="btn btn-sm btn-secondary" onclick="cancelEdit(${entryId})">취소</button>
        </div>
    `;
    formEl.querySelector('textarea').focus();
};

window.saveEdit = async (entryId) => {
    const textarea = document.querySelector(`#edit-form-${entryId} .edit-textarea`);
    const message = textarea.value.trim();

    if (!message) {
        showNotice('메시지를 입력해주세요.', 'warning');
        return;
    }

    try {
        await put(`/api/user/guestbook/${entryId}`, { message });
        showNotice('방명록이 수정되었습니다.', 'success');
        editingEntryId = null;
        loadGuestbook(currentPage);
    } catch (error) {
        showNotice(error.message || '수정에 실패했습니다.', 'error');
    }
};

window.cancelEdit = (entryId) => {
    document.getElementById(`message-${entryId}`).style.display = 'block';
    document.getElementById(`edit-form-${entryId}`).style.display = 'none';
    editingEntryId = null;
};

window.deleteEntry = async (entryId) => {
    if (confirm('정말로 이 방명록을 삭제하시겠습니까?')) {
        try {
            await del(`/api/user/guestbook/${entryId}`);
            showNotice('방명록이 삭제되었습니다.', 'success');
            loadGuestbook(currentPage);
        } catch (error) {
            showNotice(error.message || '삭제에 실패했습니다.', 'error');
        }
    }
};

window.loadGuestbook = loadGuestbook; 