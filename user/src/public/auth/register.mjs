import api from '../module/api.js';
import Notice from '../module/notice.js';

class RegisterManager {
    constructor() {
        this.isEmailVerified = false;
        this.pinTimer = null;
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.form = document.getElementById('registerForm');
        this.inputs = {
            id: this.form.querySelector('input[name="id"]'),
            nickname: this.form.querySelector('input[name="nickname"]'),
            email: this.form.querySelector('input[name="email"]'),
            pin: this.form.querySelector('input[name="pin"]'),
            password: this.form.querySelector('input[name="password"]'),
            passwordConfirm: this.form.querySelector('input[name="passwordConfirm"]'),
        };
        this.buttons = {
            sendPin: document.getElementById('send-pin-button'),
            verifyPin: document.getElementById('verify-pin-button'),
            submit: document.getElementById('register-form-body-button'),
        };
        this.visibility = {
            passOn: document.getElementById('visibility-on'),
            passOff: document.getElementById('visibility-off'),
            passConfirmOn: document.getElementById('visibility-on-confirm'),
            passConfirmOff: document.getElementById('visibility-off-confirm'),
        };
        this.containers = {
            pinInput: document.getElementById('pin-input-container'),
            passwordMessage: this.form.querySelector('.password-message-container-message'),
        };
        this.messages = {
            pinTimer: document.getElementById('pin-timer-message'),
        };
    }

    init() {
        this.setupEventListeners();
    }

    validatePassword() {
        const { password, passwordConfirm } = this.inputs;
        const messageContainer = this.containers.passwordMessage;
        
        messageContainer.textContent = '';
        messageContainer.classList.remove('success', 'error');

        if (!password.value && !passwordConfirm.value) return;

        if (password.value.length < 8) {
            messageContainer.textContent = '비밀번호는 8자 이상이어야 합니다.';
            messageContainer.classList.add('error');
            return false;
        }
        
        if (password.value !== passwordConfirm.value) {
            messageContainer.textContent = '비밀번호가 일치하지 않습니다.';
            messageContainer.classList.add('error');
            return false;
        }
        
        messageContainer.textContent = '비밀번호가 일치합니다.';
        messageContainer.classList.add('success');
        return true;
    }

    startPinTimer() {
        clearInterval(this.pinTimer);
        let timeLeft = 180;
        this.messages.pinTimer.textContent = `유효 시간 3:00`;
        this.buttons.sendPin.disabled = true;

        this.pinTimer = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            this.messages.pinTimer.textContent = `유효 시간 ${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (timeLeft <= 0) {
                clearInterval(this.pinTimer);
                this.messages.pinTimer.textContent = '인증번호 유효 시간이 만료되었습니다.';
                this.buttons.sendPin.disabled = false;
                this.buttons.sendPin.textContent = '재전송';
            }
        }, 1000);
    }

    async sendVerification() {
        if (!this.inputs.email.value) {
            new Notice('이메일을 입력해주세요.', 'warning').show();
            return;
        }
        const originalButtonText = this.buttons.sendPin.innerHTML;
        this.buttons.sendPin.disabled = true;
        this.buttons.sendPin.innerHTML = '<span class="spinner"></span>';
        
        try {
            await api.post('/api/v1/auth/send-pin', { email: this.inputs.email.value });
            new Notice('인증번호를 발송했습니다. 이메일을 확인해주세요.', 'success').show();
            this.containers.pinInput.style.display = 'block';
            this.startPinTimer();
        } catch (error) {
            new Notice(error.message, 'error').show();
            this.buttons.sendPin.disabled = false;
        } finally {
            this.buttons.sendPin.innerHTML = originalButtonText;
        }
    }

    async verifyPin() {
        if (!this.inputs.pin.value) {
            new Notice('인증번호를 입력해주세요.', 'warning').show();
            return;
        }
        try {
            const response = await api.post('/api/v1/auth/verify-pin', { email: this.inputs.email.value, code: this.inputs.pin.value });
            if (response.success) {
                new Notice('이메일 인증이 완료되었습니다.', 'success').show();
                this.isEmailVerified = true;
                this.inputs.email.disabled = true;
                this.inputs.pin.disabled = true;
                this.buttons.sendPin.disabled = true;
                this.buttons.verifyPin.disabled = true;
                this.buttons.verifyPin.textContent = '인증 완료';
                clearInterval(this.pinTimer);
                this.messages.pinTimer.textContent = '';
            }
        } catch (error) {
            new Notice(error.message, 'error').show();
        }
    }

    togglePasswordVisibility(input, onIcon, offIcon) {
        if (input.type === 'password') {
            input.type = 'text';
            onIcon.style.display = 'none';
            offIcon.style.display = 'inline';
        } else {
            input.type = 'password';
            onIcon.style.display = 'inline';
            offIcon.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.isEmailVerified) {
            new Notice('이메일 인증을 먼저 완료해주세요.', 'error').show();
            return;
        }
        if (!this.validatePassword()) {
            new Notice('비밀번호를 확인해주세요.', 'error').show();
            return;
        }

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        const originalButtonText = this.buttons.submit.innerHTML;
        this.buttons.submit.disabled = true;
        this.buttons.submit.innerHTML = '<span class="spinner"></span> 가입 진행 중...';

        try {
            await api.post('/api/v1/auth/register', data);
            new Notice('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.', 'success').show();
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (error) {
            new Notice(error.message, 'error').show();
            this.buttons.submit.disabled = false;
            this.buttons.submit.innerHTML = originalButtonText;
        }
    }

    setupEventListeners() {
        this.buttons.sendPin.addEventListener('click', () => this.sendVerification());
        this.buttons.verifyPin.addEventListener('click', () => this.verifyPin());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.inputs.password.addEventListener('input', () => this.validatePassword());
        this.inputs.passwordConfirm.addEventListener('input', () => this.validatePassword());
        
        this.visibility.passOn.addEventListener('click', () => this.togglePasswordVisibility(this.inputs.password, this.visibility.passOn, this.visibility.passOff));
        this.visibility.passOff.addEventListener('click', () => this.togglePasswordVisibility(this.inputs.password, this.visibility.passOn, this.visibility.passOff));
        this.visibility.passConfirmOn.addEventListener('click', () => this.togglePasswordVisibility(this.inputs.passwordConfirm, this.visibility.passConfirmOn, this.visibility.passConfirmOff));
        this.visibility.passConfirmOff.addEventListener('click', () => this.togglePasswordVisibility(this.inputs.passwordConfirm, this.visibility.passConfirmOn, this.visibility.passConfirmOff));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});
