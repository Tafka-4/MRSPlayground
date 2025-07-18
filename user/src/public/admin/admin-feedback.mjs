import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';
import { createConfirmCancelModal } from '../component/modals/index.js';

class AdminFeedbackManager {
    constructor() {
        this.feedback = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentFeedback = null;
        
        this.init();
    }

    init() {
        initializeComponents();
        loadSavedTheme();
        this.setupEventListeners();
        this.fetchFeedback();
    }

    async fetchFeedback(page = 1) {
        const query = {
            page,
            limit: 10,
            status: document.getElementById('statusFilter').value || undefined,
            type: document.getElementById('typeFilter').value || undefined,
            priority: document.getElementById('priorityFilter').value || undefined,
            search: document.getElementById('searchInput').value || undefined,
        };
        
        try {
            const response = await api.get('/api/v1/feedback', { query });
            if (response && response.success) {
                this.feedback = response.data;
                this.currentPage = response.pagination.page;
                this.totalPages = response.pagination.totalPages;
                this.renderFeedback();
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            Notice.error('피드백 목록을 불러오는 데 실패했습니다.');
        }
    }

    renderFeedback() {
        const tbody = document.getElementById('feedback-tbody');
        tbody.innerHTML = '';
        if (this.feedback.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">표시할 피드백이 없습니다.</td></tr>';
            return;
        }

        this.feedback.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.title}</td>
                <td>${this.getTypeName(item.type)}</td>
                <td><span class="priority-badge priority-${item.priority}">${this.getPriorityName(item.priority)}</span></td>
                <td><span class="status-badge status-${item.status}">${this.getStatusName(item.status)}</span></td>
                <td><button class="view-btn" data-id="${item.id}">보기</button></td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        container.innerHTML = '';
        if (pagination.totalPages <= 1) return;

        for (let i = 1; i <= pagination.totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.disabled = (i === this.currentPage);
            button.addEventListener('click', () => this.fetchFeedback(i));
            container.appendChild(button);
        }
    }

    async viewFeedback(id) {
        try {
            const response = await api.get(`/api/v1/feedback/${id}`);
            if (response && response.success) {
                this.currentFeedback = response.data;
                this.showFeedbackModal();
            }
        } catch (error) {
            Notice.error('피드백 상세 정보를 불러오는 데 실패했습니다.');
        }
    }

    showFeedbackModal() {
        if (!this.currentFeedback) return;
        const item = this.currentFeedback;
        
        const modal = createConfirmCancelModal({
            title: `피드백 상세 (ID: ${item.id})`,
            message: `
                <div class="feedback-modal-content">
                    <p><strong>제목:</strong> ${item.title}</p>
                    <p><strong>설명:</strong><br>${item.description}</p>
                    <hr>
                    <div class="form-group">
                        <label for="status-select">상태 변경</label>
                        <select id="status-select">
                            <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>대기중</option>
                            <option value="confirmed" ${item.status === 'confirmed' ? 'selected' : ''}>확인됨</option>
                            <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>처리중</option>
                            <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>해결됨</option>
                            <option value="closed" ${item.status === 'closed' ? 'selected' : ''}>종결</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="admin-notes">관리자 메모</label>
                        <textarea id="admin-notes">${item.admin_notes || ''}</textarea>
                    </div>
                </div>
            `,
            confirmText: '업데이트',
            onConfirm: () => this.handleUpdate(item.id),
        });
        document.body.appendChild(modal);
    }
    
    async handleUpdate(id) {
        const status = document.getElementById('status-select').value;
        const admin_notes = document.getElementById('admin-notes').value;

        try {
            const response = await api.put(`/api/v1/feedback/${id}`, { status, admin_notes });
            if (response && response.success) {
                Notice.success('상태가 업데이트되었습니다.');
                this.fetchFeedback(this.currentPage);
                return true;
            }
        } catch (error) {
            Notice.error('업데이트에 실패했습니다.');
        }
        return false;
    }

    setupEventListeners() {
        document.getElementById('feedback-tbody').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-btn')) {
                this.viewFeedback(e.target.dataset.id);
            }
        });
        document.getElementById('statusFilter').addEventListener('change', () => this.fetchFeedback(1));
        document.getElementById('typeFilter').addEventListener('change', () => this.fetchFeedback(1));
        document.getElementById('priorityFilter').addEventListener('change', () => this.fetchFeedback(1));
        document.getElementById('searchButton').addEventListener('click', () => this.fetchFeedback(1));
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchFeedback(1);
        });
    }
    
    getTypeName(type) {
        const names = { bug: '버그', vulnerability: '취약점', feature: '기능 제안', improvement: '개선 제안', other: '기타' };
        return names[type] || type;
    }
    
    getPriorityName(priority) {
        const names = { low: '낮음', medium: '보통', high: '높음', critical: '긴급' };
        return names[priority] || priority;
    }

    getStatusName(status) {
        const names = { pending: '대기중', confirmed: '확인됨', in_progress: '처리중', resolved: '해결됨', closed: '종결' };
        return names[status] || status;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminFeedbackManager();
}); 