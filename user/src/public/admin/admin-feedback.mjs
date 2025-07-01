import apiClient from '/module/api.js';

class AdminFeedbackManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFeedbacks();
    }

    bindEvents() {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFeedbacks(1);
            }
        });

        const searchButton = document.querySelector('.nav-button.secondary');
        searchButton.addEventListener('click', () => {
            this.loadFeedbacks(1);
        });

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('feedbackModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadFeedbacks(page = 1) {
        const status = document.getElementById('statusFilter').value;
        const type = document.getElementById('typeFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const search = document.getElementById('searchInput').value;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });

        if (status) params.append('status', status);
        if (type) params.append('type', type);
        if (priority) params.append('priority', priority);
        if (search) params.append('search', search);

        try {
            this.setLoadingState(true);
            
            const response = await apiClient.get(`/api/v1/feedback/admin/all?${params}`);

            if (response.success) {
                this.displayFeedbacks(response.feedback);
                this.updatePagination(response.pagination);
                this.currentPage = page;
                this.totalPages = response.pagination.totalPages;
            } else {
                throw new Error(response.message || '피드백 목록 로딩 실패');
            }
        } catch (error) {
            console.error('Error loading feedbacks:', error);
            this.showError('피드백 목록을 불러오는데 실패했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    displayFeedbacks(feedbacks) {
        const tbody = document.getElementById('feedbackTableBody');
        
        if (feedbacks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        피드백이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = feedbacks.map(feedback => `
            <tr>
                <td>${feedback.id}</td>
                <td>${feedback.title}</td>
                <td><span class="type-badge type-${feedback.type}">${this.getTypeName(feedback.type)}</span></td>
                <td><span class="priority-badge priority-${feedback.priority}">${this.getPriorityName(feedback.priority)}</span></td>
                <td><span class="status-badge status-${feedback.status}">${this.getStatusName(feedback.status)}</span></td>
                <td>${feedback.user_nickname || '익명'}</td>
                <td>${new Date(feedback.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>
                    <button class="nav-button secondary" onclick="adminFeedbackManager.viewFeedback(${feedback.id})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        상세보기
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getTypeName(type) {
        const types = {
            'bug': '버그',
            'vulnerability': '취약점',
            'feature': '기능 요청',
            'improvement': '개선 제안',
            'other': '기타'
        };
        return types[type] || type;
    }

    getPriorityName(priority) {
        const priorities = {
            'low': '낮음',
            'medium': '보통',
            'high': '높음',
            'critical': '긴급'
        };
        return priorities[priority] || priority;
    }

    getStatusName(status) {
        const statuses = {
            'pending': '대기 중',
            'confirmed': '확인됨',
            'in_progress': '진행 중',
            'testing': '테스트 중',
            'resolved': '해결됨',
            'closed': '종료됨',
            'rejected': '거부됨'
        };
        return statuses[status] || status;
    }

    updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        let html = '';

        html += `<button onclick="adminFeedbackManager.loadFeedbacks(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>이전</button>`;

        for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
            html += `<button onclick="adminFeedbackManager.loadFeedbacks(${i})" ${i === pagination.page ? 'class="current-page"' : ''}>${i}</button>`;
        }

        html += `<button onclick="adminFeedbackManager.loadFeedbacks(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>다음</button>`;

        paginationDiv.innerHTML = html;
    }

    async viewFeedback(feedbackId) {
        try {
            const response = await apiClient.get('/api/v1/feedback/admin/all');
            
            if (response.success) {
                const feedback = response.feedback.find(f => f.id === feedbackId);
                
                if (feedback) {
                    this.showFeedbackModal(feedback);
                } else {
                    this.showError('피드백을 찾을 수 없습니다.');
                }
            } else {
                throw new Error('피드백 정보 로딩 실패');
            }
        } catch (error) {
            console.error('Error loading feedback details:', error);
            this.showError('피드백 상세 정보를 불러오는데 실패했습니다.');
        }
    }

    showFeedbackModal(feedback) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="feedback-detail">
                <h4>제목</h4>
                <p>${feedback.title}</p>
            </div>
            <div class="feedback-detail">
                <h4>유형</h4>
                <p><span class="type-badge type-${feedback.type}">${this.getTypeName(feedback.type)}</span></p>
            </div>
            <div class="feedback-detail">
                <h4>우선순위</h4>
                <p><span class="priority-badge priority-${feedback.priority}">${this.getPriorityName(feedback.priority)}</span></p>
            </div>
            <div class="feedback-detail">
                <h4>현재 상태</h4>
                <p><span class="status-badge status-${feedback.status}">${this.getStatusName(feedback.status)}</span></p>
            </div>
            <div class="feedback-detail">
                <h4>작성자</h4>
                <p>
                    ${feedback.user_nickname || '익명 사용자'}
                    ${feedback.user_nickname ? `
                        <button class="nav-button secondary" onclick="adminFeedbackManager.showReplyModal(${feedback.id}, '${feedback.user_nickname}', '${feedback.title}')" style="margin-left: 1rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                            <span class="material-symbols-outlined">mail</span>
                            답변 메일 보내기
                        </button>
                    ` : ''}
                </p>
            </div>
            <div class="feedback-detail">
                <h4>설명</h4>
                <p>${feedback.description}</p>
            </div>
            ${feedback.steps_to_reproduce ? `
                <div class="feedback-detail">
                    <h4>재현 단계</h4>
                    <p>${feedback.steps_to_reproduce}</p>
                </div>
            ` : ''}
            ${feedback.expected_behavior ? `
                <div class="feedback-detail">
                    <h4>예상 동작</h4>
                    <p>${feedback.expected_behavior}</p>
                </div>
            ` : ''}
            ${feedback.actual_behavior ? `
                <div class="feedback-detail">
                    <h4>실제 동작</h4>
                    <p>${feedback.actual_behavior}</p>
                </div>
            ` : ''}
            ${feedback.browser_info ? `
                <div class="feedback-detail">
                    <h4>브라우저 정보</h4>
                    <p>${feedback.browser_info}</p>
                </div>
            ` : ''}
            ${feedback.admin_notes ? `
                <div class="feedback-detail">
                    <h4>관리자 메모</h4>
                    <p>${feedback.admin_notes}</p>
                </div>
            ` : ''}
            <div class="admin-controls">
                <h4>관리자 작업</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="statusUpdate">상태 변경</label>
                        <select id="statusUpdate">
                            <option value="pending" ${feedback.status === 'pending' ? 'selected' : ''}>대기 중</option>
                            <option value="confirmed" ${feedback.status === 'confirmed' ? 'selected' : ''}>확인됨</option>
                            <option value="in_progress" ${feedback.status === 'in_progress' ? 'selected' : ''}>진행 중</option>
                            <option value="testing" ${feedback.status === 'testing' ? 'selected' : ''}>테스트 중</option>
                            <option value="resolved" ${feedback.status === 'resolved' ? 'selected' : ''}>해결됨</option>
                            <option value="closed" ${feedback.status === 'closed' ? 'selected' : ''}>종료됨</option>
                            <option value="rejected" ${feedback.status === 'rejected' ? 'selected' : ''}>거부됨</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="priorityUpdate">우선순위 변경</label>
                        <select id="priorityUpdate">
                            <option value="low" ${feedback.priority === 'low' ? 'selected' : ''}>낮음</option>
                            <option value="medium" ${feedback.priority === 'medium' ? 'selected' : ''}>보통</option>
                            <option value="high" ${feedback.priority === 'high' ? 'selected' : ''}>높음</option>
                            <option value="critical" ${feedback.priority === 'critical' ? 'selected' : ''}>긴급</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="adminNotes">관리자 메모</label>
                    <textarea id="adminNotes" placeholder="처리 내용이나 메모를 입력하세요...">${feedback.admin_notes || ''}</textarea>
                </div>
                <button class="nav-button" onclick="adminFeedbackManager.updateFeedbackStatus(${feedback.id})">
                    <span class="material-symbols-outlined">save</span>
                    업데이트
                </button>
            </div>
        `;

        document.getElementById('feedbackModal').style.display = 'block';
    }

    async updateFeedbackStatus(feedbackId) {
        const status = document.getElementById('statusUpdate').value;
        const priority = document.getElementById('priorityUpdate').value;
        const adminNotes = document.getElementById('adminNotes').value;

        try {
            const response = await apiClient.put(`/api/v1/feedback/admin/${feedbackId}/status`, {
                status,
                priority,
                adminNotes
            });

            if (response.success) {
                this.showSuccessMessage('피드백이 업데이트되었습니다.');
                this.closeModal();
                this.loadFeedbacks(this.currentPage);
            } else {
                throw new Error(response.message || '업데이트 실패');
            }
        } catch (error) {
            console.error('Error updating feedback:', error);
            this.showError('피드백 업데이트에 실패했습니다: ' + error.message);
        }
    }

    closeModal() {
        document.getElementById('feedbackModal').style.display = 'none';
    }

    setLoadingState(isLoading) {
        const tbody = document.getElementById('feedbackTableBody');
        if (isLoading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        로딩 중...
                    </td>
                </tr>
            `;
        }
    }

    showError(message) {
        const tbody = document.getElementById('feedbackTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: red;">
                    ${message}
                </td>
            </tr>
        `;
    }

    showSuccessMessage(message) {
        alert(message);
    }

    showReplyModal(feedbackId, userName, title) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="reply-form">
                <h3>피드백 답변 이메일 작성</h3>
                <div class="form-group">
                    <label>받는 사람</label>
                    <input type="text" value="${userName}" readonly>
                </div>
                <div class="form-group">
                    <label>제목</label>
                    <input type="text" value="Re: [피드백] ${title}" readonly>
                </div>
                <div class="form-group">
                    <label for="replyMessage">답변 내용 *</label>
                    <textarea id="replyMessage" rows="10" placeholder="답변 내용을 입력해주세요..." required></textarea>
                </div>
                <div class="form-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="nav-button secondary" onclick="adminFeedbackManager.closeModal()">
                        취소
                    </button>
                    <button class="nav-button" onclick="adminFeedbackManager.sendReplyEmail(${feedbackId})">
                        <span class="material-symbols-outlined">send</span>
                        답변 전송
                    </button>
                </div>
            </div>
        `;

        document.getElementById('feedbackModal').style.display = 'block';
    }

    async sendReplyEmail(feedbackId) {
        const replyMessage = document.getElementById('replyMessage').value.trim();
        
        if (!replyMessage) {
            alert('답변 내용을 입력해주세요.');
            return;
        }

        try {
            const response = await apiClient.post(`/api/v1/feedback/admin/${feedbackId}/reply`, {
                replyMessage
            });

            if (response.success) {
                this.showSuccessMessage('답변 이메일이 성공적으로 전송되었습니다.');
                this.closeModal();
                this.loadFeedbacks(this.currentPage);
            } else {
                throw new Error(response.message || '이메일 전송 실패');
            }
        } catch (error) {
            console.error('Error sending reply email:', error);
            this.showError('답변 이메일 전송에 실패했습니다: ' + error.message);
        }
    }
}

let adminFeedbackManager;

document.addEventListener('DOMContentLoaded', () => {
    adminFeedbackManager = new AdminFeedbackManager();

    window.adminFeedbackManager = adminFeedbackManager;
});

window.closeModal = () => adminFeedbackManager.closeModal(); 