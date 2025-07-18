import api from '../module/api.js';
import Notice from '../module/notice.js';
import { createConfirmCancelModal } from '../component/modals/index.js';

class UserGuestbookManager {
    constructor(targetUserid) {
        this.targetUserid = targetUserid;
        this.entries = [];
        this.currentPage = 1;
        this.totalPages = 1;
        
        this.fetchGuestbookEntries();
        this.setupEventListeners();
    }

    async fetchGuestbookEntries(page = 1) {
        try {
            const response = await api.get(`/api/v1/guestbook/${this.targetUserid}`, { query: { page, limit: 10 } });
            if (response && response.success) {
                this.entries = response.data;
                this.currentPage = response.pagination.page;
                this.totalPages = response.pagination.totalPages;
                this.renderGuestbook();
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            Notice.error('방명록을 불러오는 데 실패했습니다.');
        }
    }

    renderGuestbook() {
        const list = document.getElementById('guestbook-list');
        list.innerHTML = '';
        if (this.entries.length === 0) {
            list.innerHTML = '<li>작성된 방명록이 없습니다.</li>';
            return;
        }
        this.entries.forEach(entry => {
            const item = document.createElement('li');
            item.innerHTML = `
                <p><strong>${entry.sender.nickname}</strong>: ${entry.message}</p>
                <div>
                    <button class="edit-btn" data-id="${entry.id}" data-message="${entry.message}">수정</button>
                    <button class="delete-btn" data-id="${entry.id}">삭제</button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        container.innerHTML = '';
        if(pagination.totalPages <= 1) return;
        
        for (let i = 1; i <= pagination.totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.disabled = (i === this.currentPage);
            button.addEventListener('click', () => this.fetchGuestbookEntries(i));
            container.appendChild(button);
        }
    }
    
    showEditModal(id, currentMessage) {
        const modal = createConfirmCancelModal({
            title: '방명록 수정',
            message: `<textarea id="guestbook-edit-message" rows="4">${currentMessage}</textarea>`,
            confirmText: '수정',
            onConfirm: async () => {
                const newMessage = document.getElementById('guestbook-edit-message').value;
                if (!newMessage.trim()) {
                    Notice.warning('메시지를 입력해주세요.');
                    return false;
                }
                return this.handleUpdate(id, newMessage);
            }
        });
        document.body.appendChild(modal);
    }
    
    async handleUpdate(id, message) {
        try {
            const response = await api.put(`/api/v1/guestbook/${id}`, { message });
            if(response && response.success) {
                Notice.success('방명록이 수정되었습니다.');
                this.fetchGuestbookEntries(this.currentPage);
                return true;
            }
        } catch (error) {
            Notice.error(error.message);
        }
        return false;
    }
    
    async handleDelete(id) {
        const confirmed = await new Promise(resolve => {
            const modal = createConfirmCancelModal({
                title: '삭제 확인',
                message: '정말로 이 방명록을 삭제하시겠습니까?',
                variant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
            document.body.appendChild(modal);
        });
        
        if (!confirmed) return;

        try {
            const response = await api.delete(`/api/v1/guestbook/${id}`);
            if(response && response.success) {
                Notice.success('방명록이 삭제되었습니다.');
                this.fetchGuestbookEntries(this.currentPage);
            }
        } catch (error) {
            Notice.error(error.message);
        }
    }

    setupEventListeners() {
        document.getElementById('guestbook-list').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('edit-btn')) {
                this.showEditModal(id, e.target.dataset.message);
            }
            if (e.target.classList.contains('delete-btn')) {
                this.handleDelete(id);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const guestbookElement = document.getElementById('guestbook-list');
    if (guestbookElement) {
        const targetUserid = guestbookElement.dataset.userid;
        new UserGuestbookManager(targetUserid);
    }
}); 