import apiClient from '/module/api.js';

class AdminContactManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadContacts();
    }

    bindEvents() {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadContacts(1);
            }
        });

        const searchButton = document.querySelector('.nav-button.secondary');
        searchButton.addEventListener('click', () => {
            this.loadContacts(1);
        });

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('contactModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadContacts(page = 1) {
        const status = document.getElementById('statusFilter').value;
        const category = document.getElementById('categoryFilter').value;
        const search = document.getElementById('searchInput').value;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });

        if (status) params.append('status', status);
        if (category) params.append('category', category);
        if (search) params.append('search', search);

        try {
            this.setLoadingState(true);
            
            const response = await apiClient.get(`/api/v1/contact/admin/all?${params}`);

            if (response.success) {
                this.displayContacts(response.contacts);
                this.updatePagination(response.pagination);
                this.currentPage = page;
                this.totalPages = response.pagination.totalPages;
            } else {
                throw new Error(response.message || '문의 목록 로딩 실패');
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.showError('문의 목록을 불러오는데 실패했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    displayContacts(contacts) {
        const tbody = document.getElementById('contactTableBody');
        
        if (contacts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        문의가 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = contacts.map(contact => `
            <tr>
                <td>${contact.id}</td>
                <td>${contact.subject}</td>
                <td><span class="category-badge">${this.getCategoryName(contact.category)}</span></td>
                <td>${contact.email}</td>
                <td><span class="status-badge status-${contact.status}">${this.getStatusName(contact.status)}</span></td>
                <td>${new Date(contact.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>
                    <button class="nav-button secondary" onclick="adminContactManager.viewContact(${contact.id})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        상세보기
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getCategoryName(category) {
        const categories = {
            'general': '일반 문의',
            'technical': '기술적 문제',
            'feature': '기능 요청',
            'account': '계정 관련',
            'other': '기타'
        };
        return categories[category] || category;
    }

    getStatusName(status) {
        const statuses = {
            'pending': '대기 중',
            'in_progress': '처리 중',
            'resolved': '해결됨',
            'closed': '종료됨'
        };
        return statuses[status] || status;
    }

    updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        let html = '';

        html += `<button onclick="adminContactManager.loadContacts(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>이전</button>`;

        for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
            html += `<button onclick="adminContactManager.loadContacts(${i})" ${i === pagination.page ? 'class="current-page"' : ''}>${i}</button>`;
        }

        html += `<button onclick="adminContactManager.loadContacts(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>다음</button>`;

        paginationDiv.innerHTML = html;
    }

    async viewContact(contactId) {
        try {
            const response = await apiClient.get('/api/v1/contact/admin/all');
            
            if (response.success) {
                const contact = response.contacts.find(c => c.id === contactId);
                
                if (contact) {
                    this.showContactModal(contact);
                } else {
                    this.showError('문의를 찾을 수 없습니다.');
                }
            } else {
                throw new Error('문의 정보 로딩 실패');
            }
        } catch (error) {
            console.error('Error loading contact details:', error);
            this.showError('문의 상세 정보를 불러오는데 실패했습니다.');
        }
    }

    showContactModal(contact) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="contact-detail">
                <h4>제목</h4>
                <p>${contact.subject}</p>
            </div>
            <div class="contact-detail">
                <h4>카테고리</h4>
                <p>${this.getCategoryName(contact.category)}</p>
            </div>
            <div class="contact-detail">
                <h4>이메일</h4>
                <p>
                    ${contact.email}
                    <button class="nav-button secondary" onclick="adminContactManager.showReplyModal(${contact.id}, '${contact.email}', '${contact.subject}')" style="margin-left: 1rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        <span class="material-symbols-outlined">mail</span>
                        답변 메일 보내기
                    </button>
                </p>
            </div>
            <div class="contact-detail">
                <h4>작성자</h4>
                <p>${contact.user_nickname || '비회원'}</p>
            </div>
            <div class="contact-detail">
                <h4>문의 내용</h4>
                <p>${contact.message}</p>
            </div>
            <div class="contact-detail">
                <h4>현재 상태</h4>
                <p><span class="status-badge status-${contact.status}">${this.getStatusName(contact.status)}</span></p>
            </div>
            ${contact.admin_notes ? `
                <div class="contact-detail">
                    <h4>관리자 메모</h4>
                    <p>${contact.admin_notes}</p>
                </div>
            ` : ''}
            <div class="admin-controls">
                <h4>관리자 작업</h4>
                <div class="form-group">
                    <label for="statusUpdate">상태 변경</label>
                    <select id="statusUpdate">
                        <option value="pending" ${contact.status === 'pending' ? 'selected' : ''}>대기 중</option>
                        <option value="in_progress" ${contact.status === 'in_progress' ? 'selected' : ''}>처리 중</option>
                        <option value="resolved" ${contact.status === 'resolved' ? 'selected' : ''}>해결됨</option>
                        <option value="closed" ${contact.status === 'closed' ? 'selected' : ''}>종료됨</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="adminNotes">관리자 메모</label>
                    <textarea id="adminNotes" placeholder="처리 내용이나 메모를 입력하세요...">${contact.admin_notes || ''}</textarea>
                </div>
                <button class="nav-button" onclick="adminContactManager.updateContactStatus(${contact.id})">
                    <span class="material-symbols-outlined">save</span>
                    업데이트
                </button>
            </div>
        `;

        document.getElementById('contactModal').style.display = 'block';
    }

    async updateContactStatus(contactId) {
        const status = document.getElementById('statusUpdate').value;
        const adminNotes = document.getElementById('adminNotes').value;

        try {
            const response = await apiClient.put(`/api/v1/contact/admin/${contactId}/status`, {
                status,
                adminNotes
            });

            if (response.success) {
                this.showSuccessMessage('문의 상태가 업데이트되었습니다.');
                this.closeModal();
                this.loadContacts(this.currentPage);
            } else {
                throw new Error(response.message || '업데이트 실패');
            }
        } catch (error) {
            console.error('Error updating contact:', error);
            this.showError('문의 상태 업데이트에 실패했습니다: ' + error.message);
        }
    }

    closeModal() {
        document.getElementById('contactModal').style.display = 'none';
    }

    setLoadingState(isLoading) {
        const tbody = document.getElementById('contactTableBody');
        if (isLoading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        로딩 중...
                    </td>
                </tr>
            `;
        }
    }

    showError(message) {
        const tbody = document.getElementById('contactTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: red;">
                    ${message}
                </td>
            </tr>
        `;
    }

    showSuccessMessage(message) {
        alert(message);
    }

    showReplyModal(contactId, email, subject) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="reply-form">
                <h2>답변 이메일 작성</h2>
                <div class="form-group">
                    <label>받는 사람</label>
                    <input type="text" value="${email}" readonly>
                </div>
                <div class="form-group">
                    <label>제목</label>
                    <input type="text" value="Re: ${subject}" readonly>
                </div>
                <div class="form-group">
                    <label for="replyMessage">답변 내용 *</label>
                    <textarea id="replyMessage" rows="10" placeholder="답변 내용을 입력해주세요..." required></textarea>
                </div>
                <div class="form-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="nav-button secondary" onclick="adminContactManager.closeModal()">
                        취소
                    </button>
                    <button class="nav-button" onclick="adminContactManager.sendReplyEmail(${contactId})">
                        <span class="material-symbols-outlined">send</span>
                        답변 전송
                    </button>
                </div>
            </div>
        `;

        document.getElementById('contactModal').style.display = 'block';
    }

    async sendReplyEmail(contactId) {
        const replyMessage = document.getElementById('replyMessage').value.trim();
        
        if (!replyMessage) {
            alert('답변 내용을 입력해주세요.');
            return;
        }

        try {
            const response = await apiClient.post(`/api/v1/contact/admin/${contactId}/reply`, {
                replyMessage
            });

            if (response.success) {
                this.showSuccessMessage('답변 이메일이 성공적으로 전송되었습니다.');
                this.closeModal();
                this.loadContacts(this.currentPage);
            } else {
                throw new Error(response.message || '이메일 전송 실패');
            }
        } catch (error) {
            console.error('Error sending reply email:', error);
            this.showError('답변 이메일 전송에 실패했습니다: ' + error.message);
        }
    }
}

let adminContactManager;

document.addEventListener('DOMContentLoaded', () => {
    adminContactManager = new AdminContactManager();
    window.adminContactManager = adminContactManager;
});

window.closeModal = () => adminContactManager.closeModal(); 