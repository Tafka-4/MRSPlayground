import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';
import { createConfirmCancelModal } from '../component/modals/index.js';

class AdminContactManager {
    constructor() {
        this.contacts = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentContact = null;

        this.init();
    }

    init() {
        initializeComponents();
        loadSavedTheme();
        this.setupEventListeners();
        this.fetchContacts();
    }

    async fetchContacts(page = 1, queryOptions = {}) {
        const query = {
            page,
            limit: 10,
            status: queryOptions.status || document.getElementById('statusFilter').value || undefined,
            category: queryOptions.category || document.getElementById('categoryFilter').value || undefined,
            search: queryOptions.search || document.getElementById('searchInput').value || undefined,
        };

        try {
            const response = await api.get('/api/v1/contacts', { query });
            if (response && response.success) {
                this.contacts = response.data;
                this.currentPage = response.pagination.page;
                this.totalPages = response.pagination.totalPages;
                this.renderContacts();
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            Notice.error('문의 목록을 불러오는 데 실패했습니다.');
            this.renderErrorState();
        }
    }

    renderContacts() {
        const tbody = document.getElementById('contacts-tbody');
        tbody.innerHTML = '';
        if (this.contacts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">표시할 문의가 없습니다.</td></tr>';
            return;
        }

        this.contacts.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contact.id}</td>
                <td>${contact.subject}</td>
                <td>${contact.email}</td>
                <td>${this.getCategoryName(contact.category)}</td>
                <td><span class="status-badge status-${contact.status}">${this.getStatusName(contact.status)}</span></td>
                <td><button class="view-btn" data-id="${contact.id}">보기</button></td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        container.innerHTML = '';
        if (pagination.totalPages <= 1) return;

        const { page, totalPages } = pagination;
        const groupSize = 5;
        const currentGroup = Math.ceil(page / groupSize);

        const startPage = (currentGroup - 1) * groupSize + 1;
        const endPage = Math.min(startPage + groupSize - 1, totalPages);
        
        if (startPage > 1) {
            container.appendChild(this.createPageButton('<<', 1));
        }
        if (page > 1) {
            container.appendChild(this.createPageButton('<', page - 1));
        }

        for (let i = startPage; i <= endPage; i++) {
            container.appendChild(this.createPageButton(i, i, page === i));
        }

        if (page < totalPages) {
            container.appendChild(this.createPageButton('>', page + 1));
        }
        if (endPage < totalPages) {
             container.appendChild(this.createPageButton('>>', totalPages));
        }
    }
    
    createPageButton(text, page, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = isActive;
        button.addEventListener('click', () => this.fetchContacts(page));
        return button;
    }

    renderErrorState() {
        const tbody = document.getElementById('contacts-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center error">데이터를 불러오지 못했습니다.</td></tr>';
    }

    async viewContact(id) {
        try {
            const response = await api.get(`/api/v1/contacts/${id}`);
            if (response && response.success) {
                this.currentContact = response.data;
                this.showContactModal();
            }
        } catch (error) {
            Notice.error('문의 상세 정보를 불러오는 데 실패했습니다.');
        }
    }

    showContactModal() {
        if (!this.currentContact) return;
        const contact = this.currentContact;
        const modal = createConfirmCancelModal({
            title: `문의 상세 (ID: ${contact.id})`,
            message: `
                <div class="contact-modal-content">
                    <p><strong>제목:</strong> ${contact.subject}</p>
                    <p><strong>이메일:</strong> ${contact.email}</p>
                    <p><strong>카테고리:</strong> ${this.getCategoryName(contact.category)}</p>
                    <p><strong>내용:</strong><br>${contact.message}</p>
                    <hr>
                    <div class="form-group">
                        <label for="status-select">상태 변경</label>
                        <select id="status-select">
                            <option value="pending" ${contact.status === 'pending' ? 'selected' : ''}>대기중</option>
                            <option value="in_progress" ${contact.status === 'in_progress' ? 'selected' : ''}>처리중</option>
                            <option value="resolved" ${contact.status === 'resolved' ? 'selected' : ''}>해결됨</option>
                            <option value="closed" ${contact.status === 'closed' ? 'selected' : ''}>종결</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="admin-notes">관리자 메모</label>
                        <textarea id="admin-notes" placeholder="관리자 메모">${contact.admin_notes || ''}</textarea>
                    </div>
                </div>
            `,
            confirmText: '업데이트',
            cancelText: '닫기',
            onConfirm: () => this.handleUpdate(contact.id),
        });
        document.body.appendChild(modal);
    }
    
    async handleUpdate(id) {
        const status = document.getElementById('status-select').value;
        const admin_notes = document.getElementById('admin-notes').value;
        
        try {
            const response = await api.put(`/api/v1/contacts/${id}/status`, { status, admin_notes });
            if (response && response.success) {
                Notice.success('상태가 업데이트되었습니다.');
                this.fetchContacts(this.currentPage);
                return true; 
            }
        } catch (error) {
            Notice.error('업데이트에 실패했습니다.');
        }
        return false;
    }

    getCategoryName(category) {
        const names = { general: '일반', technical: '기술', feature: '기능 제안', account: '계정', other: '기타' };
        return names[category] || category;
    }

    getStatusName(status) {
        const names = { pending: '대기중', in_progress: '처리중', resolved: '해결됨', closed: '종결' };
        return names[status] || status;
    }

    setupEventListeners() {
        document.getElementById('contacts-tbody').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-btn')) {
                const id = e.target.dataset.id;
                this.viewContact(id);
            }
        });
        
        document.getElementById('statusFilter').addEventListener('change', () => this.fetchContacts(1));
        document.getElementById('categoryFilter').addEventListener('change', () => this.fetchContacts(1));
        document.getElementById('searchButton').addEventListener('click', () => this.fetchContacts(1));
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchContacts(1);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const manager = new AdminContactManager();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                manager.fetchContacts(1);
            }
        });
    }
}); 