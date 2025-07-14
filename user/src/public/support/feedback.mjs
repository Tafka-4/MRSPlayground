import apiClient from '/module/api.js';

class FeedbackManager {
    constructor() {
        this.init();
    }

    init() {
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            typeSelect.addEventListener('change', this.handleTypeChange.bind(this));
        }

        this.setBrowserInfo();
    }

    setBrowserInfo() {
        const browserField = document.getElementById('browser');
        if (browserField) {
            browserField.value = this.getBrowserInfo();
        }
    }

    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browserInfo = '';

        if (userAgent.includes('Chrome')) {
            const chromeVersion = userAgent.match(/Chrome\/([0-9]+)/);
            browserInfo = `Chrome ${chromeVersion ? chromeVersion[1] : 'Unknown'}`;
        } else if (userAgent.includes('Firefox')) {
            const firefoxVersion = userAgent.match(/Firefox\/([0-9]+)/);
            browserInfo = `Firefox ${firefoxVersion ? firefoxVersion[1] : 'Unknown'}`;
        } else if (userAgent.includes('Safari')) {
            const safariVersion = userAgent.match(/Version\/([0-9]+)/);
            browserInfo = `Safari ${safariVersion ? safariVersion[1] : 'Unknown'}`;
        } else if (userAgent.includes('Edge')) {
            const edgeVersion = userAgent.match(/Edge\/([0-9]+)/);
            browserInfo = `Edge ${edgeVersion ? edgeVersion[1] : 'Unknown'}`;
        } else {
            browserInfo = 'Unknown Browser';
        }

        return `${browserInfo} on ${navigator.platform}`;
    }

    showMessage(message, type = 'success') {
        this.hideMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        const form = document.getElementById('feedbackForm');
        form.insertBefore(messageDiv, form.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    hideMessages() {
        const messages = document.querySelectorAll('.success-message, .error-message');
        messages.forEach(msg => msg.remove());
    }

    setLoadingState(loading) {
        const form = document.getElementById('feedbackForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> 제출 중...';
        } else {
            form.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> 피드백 보내기';
        }
    }

    handleTypeChange(e) {
        const value = e.target.value;
        const warningMessage = document.getElementById('typeWarning');
        const additionalFields = document.getElementById('additionalFields');

        const existingWarning = document.getElementById('type-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        if (warningMessage) {
            warningMessage.style.display = 'none';
        }

        if (additionalFields) {
            additionalFields.classList.remove('show');
        }

        if (value === 'bug' || value === 'vulnerability') {
            if (additionalFields) {
                additionalFields.classList.add('show');
            }

            const warning = document.createElement('div');
            warning.id = 'type-warning';
            warning.className = 'vulnerability-warning';

            if (value === 'bug') {
                warning.innerHTML = `
                    <div class="warning-icon">
                        <span class="material-symbols-outlined">info</span>
                    </div>
                    <div class="warning-content">
                        <strong>버그 신고 안내</strong>
                        <p>버그를 발견해주셔서 감사합니다. 정확한 재현을 위해 재현 단계, 기대한 결과, 
                        실제 결과를 모두 상세히 적어주시기 바랍니다.</p>
                    </div>
                `;
            } else if (value === 'vulnerability') {
                warning.innerHTML = `
                    <div class="warning-icon">
                        <span class="material-symbols-outlined">warning</span>
                    </div>
                    <div class="warning-content">
                        <strong>보안 취약점 신고 안내</strong>
                        <p>보안 취약점을 발견해주셔서 감사합니다. 취약점 정보는 안전하게 처리되며, 
                        수정 완료 후 공개됩니다. 가능한 한 자세한 정보를 제공해주세요.</p>
                    </div>
                `;
            }

            e.target.parentElement.insertAdjacentElement('afterend', warning);
        }
    }

    validateForm(formData) {
        const { title, type, priority, description } = formData;

        if (!title || !type || !priority || !description) {
            throw new Error('모든 필수 필드를 입력해주세요.');
        }

        if (title.length > 500) {
            throw new Error('제목은 500자를 초과할 수 없습니다.');
        }

        if (description.length > 5000) {
            throw new Error('설명은 5000자를 초과할 수 없습니다.');
        }

        const validTypes = ['bug', 'feature', 'improvement', 'vulnerability', 'other'];
        if (!validTypes.includes(type)) {
            throw new Error('올바른 유형을 선택해주세요.');
        }

        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(priority)) {
            throw new Error('올바른 우선순위를 선택해주세요.');
        }

        if (type === 'bug' || type === 'vulnerability') {
            if (formData.steps_to_reproduce && formData.steps_to_reproduce.length > 3000) {
                throw new Error('재현 단계는 3000자를 초과할 수 없습니다.');
            }
            if (formData.expected_behavior && formData.expected_behavior.length > 1000) {
                throw new Error('예상 동작은 1000자를 초과할 수 없습니다.');
            }
            if (formData.actual_behavior && formData.actual_behavior.length > 1000) {
                throw new Error('실제 동작은 1000자를 초과할 수 없습니다.');
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const feedbackData = {
            title: formData.get('title'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            description: formData.get('description'),
            steps_to_reproduce: formData.get('steps_to_reproduce'),
            expected_behavior: formData.get('expected_behavior'),
            actual_behavior: formData.get('actual_behavior'),
            browser_info: navigator.userAgent
        };

        try {
            this.hideMessages();
            this.validateForm(feedbackData);
            this.setLoadingState(true);

            const result = await apiClient.post(
                '/api/v1/feedback/submit',
                feedbackData
            );

            this.showMessage('피드백이 성공적으로 접수되었습니다. 소중한 의견 감사합니다!', 'success');
            e.target.reset();
            
            this.setBrowserInfo();
            
            const additionalFields = document.getElementById('additionalFields');
            const warningMessage = document.getElementById('typeWarning');
            const existingWarning = document.getElementById('type-warning');
            
            if (additionalFields) {
                additionalFields.classList.remove('show');
            }
            if (warningMessage) {
                warningMessage.style.display = 'none';
            }
            if (existingWarning) {
                existingWarning.remove();
            }
        } catch (error) {
            console.error('Feedback submission error:', error);
            this.showMessage(`피드백 접수 중 오류가 발생했습니다: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FeedbackManager();
}); 