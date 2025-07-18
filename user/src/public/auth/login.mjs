import api from '../module/api.js';
import Notice from '../module/notice.js';

class LoginManager {
    constructor() {
        this.cacheDOM();
        this.init();
    }
    
    cacheDOM() {
        this.form = document.getElementById('login-form');
        this.useridInput = this.form.querySelector('input[name="userid"]');
        this.rememberMeCheckbox = document.getElementById('remember-me');
    }

    init() {
        this.setupEventListeners();
        this.checkRememberMe();
    }

    checkRememberMe() {
        const rememberedUserid = localStorage.getItem('rememberedUserid');
        if (rememberedUserid) {
            this.useridInput.value = rememberedUserid;
            this.rememberMeCheckbox.checked = true;
        }
    }

    handleRememberMe() {
        if (this.rememberMeCheckbox.checked) {
            localStorage.setItem('rememberedUserid', this.useridInput.value);
        } else {
            localStorage.removeItem('rememberedUserid');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.handleRememberMe();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await api.post('/api/v1/auth/login', data);
            if (response.success) {
                Notice.success('로그인되었습니다. 메인 페이지로 이동합니다.');
                localStorage.setItem('accessToken', response.accessToken);
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } catch (error) {
            Notice.error(error.message);
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.useridInput.addEventListener('change', () => this.handleRememberMe());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
