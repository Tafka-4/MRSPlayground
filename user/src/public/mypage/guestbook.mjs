import api from '../module/api.js';
import escape from '../module/escape.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';
import { setupMypage } from './mypage-common.mjs';

class MyGuestbookManager {
    constructor() {
        this.entries = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.elements = {
            stats: {
                total: document.getElementById('totalMessages'),
                unique: document.getElementById('uniqueSenders'),
                recent: document.getElementById('recentMessages'),
            },
            containers: {
                loading: document.getElementById('loading'),
                error: document.getElementById('error-container'),
                empty: document.getElementById('empty-container'),
                entries: document.getElementById('guestbook-entries'),
                pagination: document.getElementById('pagination'),
            },
            buttons: {
                refresh: document.getElementById('refreshButton'),
                retry: document.getElementById('retryButton'),
            }
        };
    }

    init() {
        this.showLoading();
        this.fetchData();
        this.setupEventListeners();
    }
    
    async fetchData() {
        try {
            await Promise.all([
                this.fetchGuestbookStats(),
                this.fetchGuestbookEntries(this.currentPage)
            ]);
        } catch (error) {
            this.showError();
        }
    }

    async fetchGuestbookStats() {
        try {
            const response = await api.get('/api/v1/guestbook/me/stats');
            if (response.success) {
                this.renderStats(response.stats);
            }
        } catch (error) {
            console.error('Failed to fetch guestbook stats:', error);
        }
    }

    async fetchGuestbookEntries(page = 1) {
        this.showLoading();
        try {
            const response = await api.get('/api/v1/guestbook/me', { query: { page, limit: 5 } });
            if (response.success) {
                this.entries = response.data;
                this.currentPage = response.pagination.page;
                this.totalPages = response.pagination.totalPages;
                this.renderGuestbook();
                this.renderPagination(response.pagination);
                if (this.entries.length === 0) {
                    this.showEmpty();
                } else {
                    this.showContent();
                }
            } else {
                this.showError();
            }
        } catch (error) {
            this.showError();
        }
    }

    renderStats(stats) {
        this.elements.stats.total.textContent = stats.totalMessages;
        this.elements.stats.unique.textContent = stats.uniqueSenders;
        this.elements.stats.recent.textContent = stats.recentMessages;
    }

    renderGuestbook() {
        const list = this.elements.containers.entries;
        list.innerHTML = '';
        this.entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'card guestbook-entry';

            const sender = entry.sender;
            const authorProfile = sender ? `/user/${escape(sender.userid)}` : '#';
            const authorAvatarContainer = sender?.profileImage 
                ? `<img src="${escape(sender.profileImage)}" alt="${escape(sender.nickname)}" class="author-avatar">` 
                : `<div class="author-avatar-placeholder"><span class="material-symbols-outlined">person</span></div>`;
            const authorNickname = sender ? escape(sender.nickname) : '알 수 없는 사용자';
            
            item.innerHTML = `
                <div class="card-header">
                    <a href="${authorProfile}" class="author-link">
                        ${authorAvatarContainer}
                        <strong>${authorNickname}</strong>
                    </a>
                    <span class="entry-date">${new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <div class="card-body">
                    <p>${escape(entry.message)}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-danger delete-btn" data-id="${escape(entry.id)}">
                        <span class="material-symbols-outlined">delete</span> 삭제
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    renderPagination(pagination) {
        const container = this.elements.containers.pagination;
        container.innerHTML = '';
        if (pagination.totalPages <= 1) return;
        
        for (let i = 1; i <= pagination.totalPages; i++) {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = i;
            if (i === this.currentPage) button.classList.add('btn-primary');
            button.addEventListener('click', () => this.fetchGuestbookEntries(i));
            container.appendChild(button);
        }
    }

    async handleDelete(id) {
        const confirmed = await new Promise(resolve => {
            const modal = createConfirmCancelModal({
                title: '방명록 삭제',
                message: '정말로 이 방명록 메시지를 삭제하시겠습니까?',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
            document.body.appendChild(modal);
        });
        
        if (!confirmed) return;

        try {
            await api.delete(`/api/v1/guestbook/${id}`);
            Notice.success('방명록이 삭제되었습니다.');
            this.fetchGuestbookEntries(this.currentPage);
            this.fetchGuestbookStats();
        } catch (error) {
            Notice.error(error.message || '삭제에 실패했습니다.');
        }
    }

    showLoading() {
        Object.values(this.elements.containers).forEach(c => c.style.display = 'none');
        this.elements.containers.loading.style.display = 'flex';
    }
    showError() {
        Object.values(this.elements.containers).forEach(c => c.style.display = 'none');
        this.elements.containers.error.style.display = 'flex';
    }
    showEmpty() {
        Object.values(this.elements.containers).forEach(c => c.style.display = 'none');
        this.elements.containers.empty.style.display = 'flex';
    }
    showContent() {
        Object.values(this.elements.containers).forEach(c => c.style.display = 'none');
        this.elements.containers.entries.style.display = 'grid';
        this.elements.containers.pagination.style.display = 'flex';
    }

    setupEventListeners() {
        this.elements.containers.entries.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                this.handleDelete(deleteButton.dataset.id);
            }
        });
        this.elements.buttons.refresh.addEventListener('click', () => this.fetchData());
        this.elements.buttons.retry.addEventListener('click', () => this.fetchData());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MyGuestbookManager();
    setupMypage();
}); 