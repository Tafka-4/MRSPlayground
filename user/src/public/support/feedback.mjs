import api from '/module/api.js';
import escape from '/module/escape.js';
import Notice from '/module/notice.js';

class FeedbackManager {
    constructor() {
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.form = document.getElementById('feedbackForm');
        this.typeSelect = document.getElementById('type');
        this.browserField = document.getElementById('browser');
        this.additionalFields = document.getElementById('additionalFields');
        this.typeWarningContainer = document.getElementById('typeWarning');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.resetButton = this.form.querySelector('button[type="button"]');
        this.emailInput = document.getElementById('email');
    }

    init() {
        if (!localStorage.getItem('accessToken')) {
            Notice.error('피드백을 제출하려면 로그인이 필요합니다.');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
            return;
        }
        this.setBrowserInfo();
        this.setupEventListeners();
        this.fetchUserEmail();
    }

    async fetchUserEmail() {
        try {
            const response = await api.get('/api/v1/auth/me');
            if (response.success && response.user) {
                this.emailInput.value = response.user.email;
                this.emailInput.disabled = true;
            }
        } catch (error) {
            console.warn('Could not fetch user email.', error);
        }
    }

    setBrowserInfo() {
        if (this.browserField) {
            this.browserField.value = escape(navigator.userAgent);
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = '<span class="spinner"></span> 제출 중...';
        } else {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = '<span class="material-symbols-outlined">send</span> 제출하기';
        }
    }

    handleTypeChange() {
        const value = this.typeSelect.value;
        this.typeWarningContainer.innerHTML = '';
        this.additionalFields.style.display = 'none';

        if (value === 'bug' || value === 'vulnerability') {
            this.additionalFields.style.display = 'block';
            
            const isBug = value === 'bug';
            const icon = isBug ? 'info' : 'warning';
            const title = isBug ? '버그 신고 안내' : '보안 취약점 신고 안내';
            const message = isBug 
                ? '버그를 발견해주셔서 감사합니다. 정확한 재현을 위해 재현 단계, 기대한 결과, 실제 결과를 모두 상세히 적어주시기 바랍니다.'
                : '보안 취약점을 발견해주셔서 감사합니다. 취약점 정보는 안전하게 처리되며, 수정 완료 후 공개됩니다. 가능한 한 자세한 정보를 제공해주세요.';

            this.typeWarningContainer.innerHTML = `
                <div class="vulnerability-warning">
                    <div class="warning-icon"><span class="material-symbols-outlined">${icon}</span></div>
                    <div class="warning-content">
                        <strong>${title}</strong><p>${message}</p>
                    </div>
                </div>`;
        }
    }
    
    resetForm() {
        this.form.reset();
        this.handleTypeChange();
        this.fetchUserEmail();
        this.setBrowserInfo();
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        data.browser = escape(navigator.userAgent);

        this.setLoadingState(true);

        try {
            await api.post('/api/v1/feedback', data);
            Notice.success('피드백이 성공적으로 접수되었습니다. 소중한 의견 감사합니다!');
            this.resetForm();
        } catch (error) {
            Notice.error(error.message || '피드백 접수 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', this.handleTypeChange.bind(this));
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', this.resetForm.bind(this));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FeedbackManager();
}); 