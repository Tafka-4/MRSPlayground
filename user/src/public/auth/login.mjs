import api from '../module/api.js';
import Notice from '../module/notice.js';

class LoginManager {
    constructor() {
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.form = document.getElementById('loginForm');
        this.idInput = this.form.querySelector('input[name="id"]');
        this.passwordInput = this.form.querySelector('input[name="password"]');
        this.rememberMeCheckbox = document.getElementById('remember-me');
        this.visibilityOn = document.getElementById('visibility-on');
        this.visibilityOff = document.getElementById('visibility-off');
        this.submitButton = document.getElementById('login-button');
    }

    init() {
        this.checkForcedLogout();
        this.setupEventListeners();
        this.checkRememberMe();
    }

    checkForcedLogout() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('force_logout') === 'true') {
            localStorage.removeItem('accessToken');
            Notice.warn('다른 기기에서의 활동으로 인해 안전하게 로그아웃되었습니다.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    checkRememberMe() {
        const rememberedId = localStorage.getItem('rememberedId');
        if (rememberedId) {
            this.idInput.value = rememberedId;
            this.rememberMeCheckbox.checked = true;
        }
    }

    handleRememberMe() {
        if (this.rememberMeCheckbox.checked) {
            localStorage.setItem('rememberedId', this.idInput.value);
        } else {
            localStorage.removeItem('rememberedId');
        }
    }

    togglePasswordVisibility() {
        if (this.passwordInput.type === 'password') {
            this.passwordInput.type = 'text';
            this.visibilityOn.style.display = 'none';
            this.visibilityOff.style.display = 'block';
        } else {
            this.passwordInput.type = 'password';
            this.visibilityOn.style.display = 'block';
            this.visibilityOff.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.handleRememberMe();

        const originalButtonText = this.submitButton.innerHTML;
        this.submitButton.disabled = true;
        this.submitButton.innerHTML = '<span class="spinner"></span> 로그인 중...';

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await api.post('/api/v1/auth/login', data);
            if (response.success) {
                Notice.success('로그인되었습니다. 잠시 후 이동합니다.');
                localStorage.setItem('accessToken', response.accessToken);
                setTimeout(() => {
                    window.location.href = '/mypage';
                }, 1000);
            }
        } catch (error) {
            Notice.error(error.message || '로그인에 실패했습니다.');
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = originalButtonText;
        }
    }

    setupEventListeners() {
        if(this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.rememberMeCheckbox) {
            this.rememberMeCheckbox.addEventListener('change', () => this.handleRememberMe());
        }
        if (this.visibilityOn) {
            this.visibilityOn.addEventListener('click', () => this.togglePasswordVisibility());
        }
        if (this.visibilityOff) {
            this.visibilityOff.addEventListener('click', () => this.togglePasswordVisibility());
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
