import api from '../module/api.js';
import Notice from '../module/notice.js';
import { initializeComponents, loadSavedTheme } from '../component/index.js';

class RegisterManager {
    constructor() {
        this.isEmailVerified = false;
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.form = document.getElementById('register-form');
        this.inputs = {
            userid: this.form.querySelector('input[name="userid"]'),
            password: this.form.querySelector('input[name="password"]'),
            password_check: this.form.querySelector('input[name="password_check"]'),
            nickname: this.form.querySelector('input[name="nickname"]'),
            email: this.form.querySelector('input[name="email"]'),
            email_verify_pin: this.form.querySelector('input[name="email_verify_pin"]'),
        };
        this.buttons = {
            emailVerify: document.getElementById('email-verify-btn'),
            emailVerifyPin: document.getElementById('email-verify-pin-btn'),
            submit: this.form.querySelector('button[type="submit"]'),
        };
        this.messages = {
            password: document.getElementById('password-message'),
        };
    }

    init() {
        initializeComponents();
        loadSavedTheme();
        this.setupEventListeners();
    }
    
    validatePassword() {
        const { password, password_check } = this.inputs;
        const message = this.messages.password;
        
        if (password.value.length > 0 && password.value.length < 8) {
             message.textContent = '비밀번호는 8자 이상이어야 합니다.';
             return false;
        }
        
        if (password.value !== password_check.value) {
            message.textContent = '비밀번호가 일치하지 않습니다.';
            return false;
        }
        
        message.textContent = '비밀번호가 일치합니다.';
        return true;
    }

    async sendVerification() {
        const { email } = this.inputs;
        if (!email.value) {
            Notice.warning('이메일을 입력해주세요.');
            return;
        }
        try {
            await api.post('/api/v1/auth/send-verification', { email: email.value });
            Notice.success('인증 코드를 발송했습니다. 이메일을 확인해주세요.');
        } catch (error) {
            Notice.error(error.message);
        }
    }

    async verifyPin() {
        const { email, email_verify_pin } = this.inputs;
        if (!email.value || !email_verify_pin.value) {
            Notice.warning('이메일과 인증 코드를 입력해주세요.');
            return;
        }
        try {
            const response = await api.post('/api/v1/auth/verify-email', { email: email.value, code: email_verify_pin.value });
            if (response.success) {
                Notice.success('이메일 인증이 완료되었습니다.');
                this.isEmailVerified = true;
                email.disabled = true;
                email_verify_pin.disabled = true;
                this.buttons.emailVerify.disabled = true;
                this.buttons.emailVerifyPin.disabled = true;
            }
        } catch (error) {
            Notice.error(error.message);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.isEmailVerified) {
            Notice.error('이메일 인증을 먼저 완료해주세요.');
            return;
        }
        if (!this.validatePassword()) {
            Notice.error('비밀번호를 확인해주세요.');
            return;
        }

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        this.buttons.submit.disabled = true;
        this.buttons.submit.textContent = '가입하는 중...';

        try {
            const response = await api.post('/api/v1/auth/register', data);
            if (response.success) {
                Notice.success('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
                setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
        } catch (error) {
            Notice.error(error.message);
        } finally {
            this.buttons.submit.disabled = false;
            this.buttons.submit.textContent = '가입하기';
        }
    }

    setupEventListeners() {
        this.buttons.emailVerify.addEventListener('click', () => this.sendVerification());
        this.buttons.emailVerifyPin.addEventListener('click', () => this.verifyPin());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.inputs.password.addEventListener('input', () => this.validatePassword());
        this.inputs.password_check.addEventListener('input', () => this.validatePassword());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});
