import NoticeBox from '../module/notice.js';
import apiClient from '../module/api.js';

const registerInput = {
    id: document.querySelector('input[name="id"]'),
    password: document.querySelector('input[name="password"]'),
    passwordConfirm: document.querySelector('input[name="passwordConfirm"]'),
    nickname: document.querySelector('input[name="nickname"]'),
    email: document.querySelector('input[name="email"]'),
    pin: document.querySelector('input[name="pin"]')
};

const registerButton = document.querySelector('#register-form-body-button');
const sendPinButton = document.querySelector('#send-pin-button');
const verifyPinButton = document.querySelector('#verify-pin-button');
const pinInputContainer = document.querySelector('#pin-input-container');
const pinTimerMessage = document.querySelector('#pin-timer-message');

let isEmailVerified = false;
let pinTimerInterval;
let timeLeft = 300;
let isRegistering = false;
let isSendingPin = false;
let isVerifyingPin = false;

registerButton.addEventListener('click', (event) => {
    event.preventDefault();
    register();
});

registerButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        register();
    }
});

for (const input of Object.values(registerInput)) {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            register();
        }
    });
}

document
    .querySelector('input[name="password"]')
    .addEventListener('input', checkPassword);
document
    .querySelector('input[name="passwordConfirm"]')
    .addEventListener('input', checkPassword);
registerInput.email.addEventListener('input', () => {
    if (registerInput.email.disabled) return;

    isEmailVerified = false;
    pinInputContainer.classList.remove('show');
    clearInterval(pinTimerInterval);
    pinTimerMessage.textContent = '';
    checkEmail();
});

registerInput.id.addEventListener('input', checkId);

function checkId() {
    const id = registerInput.id.value;
    let messageElement = document.querySelector(
        '.password-message-container-message'
    );

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.classList.add('password-message-container-message');
        const container = document.querySelector('.password-message-container');
        if (container) {
            container.appendChild(messageElement);
        } else {
            console.error("'.password-message-container' not found.");
            return;
        }
    }

    if (id === '') {
        messageElement.textContent = '';
        return;
    }

    const idRegex = /^[a-zA-Z0-9!@#$%^&*()_]+$/;

    if (idRegex.test(id)) {
        messageElement.textContent = '사용 가능한 아이디입니다.';
        messageElement.style.color = '#4bb92c';
    } else {
        messageElement.textContent = '영문, 숫자, 특수문자만 사용 가능합니다.';
        messageElement.style.color = '#f47c7c';
    }
}

function checkEmail() {
    const email = registerInput.email.value;
    let messageElement = document.querySelector(
        '.password-message-container-message'
    );

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.classList.add('password-message-container-message');
        const container = document.querySelector('.password-message-container');
        if (container) {
            container.appendChild(messageElement);
        } else {
            console.error("'.password-message-container' not found.");
            return;
        }
    }

    if (email === '') {
        messageElement.textContent = '';
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(email)) {
        messageElement.textContent = '올바른 이메일 형식입니다.';
        messageElement.style.color = '#4bb92c';
    } else {
        messageElement.textContent = '이메일 형식이 올바르지 않습니다.';
        messageElement.style.color = '#f47c7c';
    }
}

function checkPassword() {
    const password = registerInput.password.value;
    const passwordConfirm = registerInput.passwordConfirm.value;

    let messageElement = document.querySelector(
        '.password-message-container-message'
    );

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.classList.add('password-message-container-message');
        document
            .querySelector('.password-message-container')
            .appendChild(messageElement);
    }

    if (password === '' && passwordConfirm === '') {
        messageElement.textContent = '';
        return;
    }

    if (password !== passwordConfirm) {
        messageElement.textContent = '비밀번호가 일치하지 않습니다.';
        messageElement.style.color = '#f47c7c';
    } else {
        if (password.length > 0 && password.length < 8) {
            messageElement.textContent = '비밀번호는 8자 이상이어야 합니다.';
            messageElement.style.color = '#f47c7c';
        } else if (password.length > 16) {
            messageElement.textContent = '비밀번호는 16자 이하여야 합니다.';
            messageElement.style.color = '#f47c7c';
        } else if (
            password.length > 0 &&
            (!password.match(/[a-zA-Z]/g) ||
                !password.match(/[0-9]/g) ||
                !password.match(/[!@#$%^&*()_]/g))
        ) {
            messageElement.textContent =
                '영문, 숫자, 특수문자를 모두 포함해야 합니다.';
            messageElement.style.color = '#f47c7c';
        } else if (password.length > 0) {
            messageElement.textContent = '비밀번호가 일치합니다!!!';
            messageElement.style.color = '#4bb92c';
        } else {
            messageElement.textContent = '';
        }
    }
}

function register() {
    if (isRegistering) {
        console.log('회원가입이 이미 진행 중입니다.');
        return;
    }

    const id = registerInput.id.value;
    const password = registerInput.password.value;
    const passwordConfirm = registerInput.passwordConfirm.value;
    const nickname = registerInput.nickname.value;
    const email = registerInput.email.value;

    if (
        id === '' ||
        password === '' ||
        passwordConfirm === '' ||
        nickname === '' ||
        email === ''
    ) {
        let notice = new NoticeBox('모든 필드를 입력해주세요.', 'error');
        notice.show();
        return;
    }

    if (password !== passwordConfirm) {
        let notice = new NoticeBox('비밀번호가 일치하지 않습니다.', 'error');
        notice.show();
        return;
    }

    if (password.length < 8) {
        let notice = new NoticeBox(
            '비밀번호는 8자 이상이어야 합니다.',
            'error'
        );
        notice.show();
        return;
    }
    if (password.length > 16) {
        let notice = new NoticeBox('비밀번호는 16자 이하여야 합니다.', 'error');
        notice.show();
        return;
    }
    const idRegex = /^[a-zA-Z0-9!@#$%^&*()_]+$/;
    if (!idRegex.test(id)) {
        let notice = new NoticeBox(
            '영문, 숫자, 특수문자만 사용 가능합니다.',
            'error'
        );
        notice.show();
        return;
    }
    if (
        !password.match(/[a-zA-Z]/g) ||
        !password.match(/[0-9]/g) ||
        !password.match(/[!@#$%^&*()_]/g)
    ) {
        let notice = new NoticeBox(
            '영문, 숫자, 특수문자를 모두 포함해야 합니다.',
            'error'
        );
        notice.show();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        let notice = new NoticeBox('이메일 형식이 올바르지 않습니다.', 'error');
        notice.show();
        return;
    }

    if (!isEmailVerified) {
        let notice = new NoticeBox('이메일 인증을 완료해주세요.', 'error');
        notice.show();
        return;
    }

    isRegistering = true;
    registerButton.disabled = true;

    const originalButtonText = document.querySelector(
        'label[for="register-form-body-button"]'
    ).textContent;
    document.querySelector(
        'label[for="register-form-body-button"]'
    ).textContent = '처리 중...';

    apiClient
        .post('/api/v1/auth/register', {
            id,
            password,
            nickname,
            email
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                new NoticeBox('회원가입 성공!', 'success').show();
                location.href = '/login';
            } else {
                new NoticeBox(data.message || '회원가입 실패', 'error').show();
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            new NoticeBox('요청 처리 중 오류 발생', 'error').show();
        })
        .finally(() => {
            isRegistering = false;
            registerButton.disabled = false;
            document.querySelector(
                'label[for="register-form-body-button"]'
            ).textContent = originalButtonText;
        });
}

sendPinButton.addEventListener('click', async () => {
    if (isSendingPin) {
        console.log('PIN 전송이 이미 진행 중입니다.');
        return;
    }

    const email = registerInput.email.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        let notice = new NoticeBox('이메일 형식이 올바르지 않습니다.', 'error');
        notice.show();
        return;
    }

    isSendingPin = true;
    sendPinButton.disabled = true;
    sendPinButton.textContent = '전송 중...';
    pinTimerMessage.textContent = '';

    try {
        const response = await apiClient.post('/api/v1/auth/send-pin', {
            email
        });
        const data = await response.json();

        if (data.success) {
            pinInputContainer.classList.add('show');
            registerInput.pin.value = '';
            startPinTimer();
            sendPinButton.textContent = '재전송';
            let notice = new NoticeBox(
                data.message ||
                    '인증번호가 발송되었습니다. 이메일을 확인해주세요.',
                'info'
            );
            notice.show();
        } else {
            let notice = new NoticeBox(
                data.message || '인증번호 발송에 실패했습니다.',
                'error'
            );
            notice.show();
            sendPinButton.textContent = '인증번호 받기';
        }
    } catch (error) {
        console.error('인증번호 발송 실패:', error);
        let notice = new NoticeBox(
            '인증번호 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            'error'
        );
        notice.show();
        sendPinButton.textContent = '인증번호 받기';
    } finally {
        isSendingPin = false;
        sendPinButton.disabled = false;
    }
});

verifyPinButton.addEventListener('click', async () => {
    if (isVerifyingPin) {
        console.log('PIN 검증이 이미 진행 중입니다.');
        return;
    }

    const email = registerInput.email.value;
    const pin = registerInput.pin.value;

    if (!pin || pin.length !== 6) {
        let notice = new NoticeBox(
            '인증번호 6자리를 정확히 입력해주세요.',
            'error'
        );
        notice.show();
        pinTimerMessage.textContent = '인증번호 6자리를 정확히 입력해주세요.';
        pinTimerMessage.style.color = '#f47c7c';
        return;
    }

    isVerifyingPin = true;
    verifyPinButton.disabled = true;
    verifyPinButton.textContent = '확인 중...';

    try {
        const response = await apiClient.post('/api/v1/auth/verify-pin', {
            email,
            pin
        });
        const data = await response.json();

        console.log(`PIN 검증 요청: ${email}, PIN: ${pin}`);
        if (data.success) {
            isEmailVerified = true;
            clearInterval(pinTimerInterval);
            pinTimerMessage.textContent =
                data.message || '이메일 인증이 완료되었습니다.';
            pinTimerMessage.style.color = '#4bb92c';
            pinInputContainer.classList.remove('show');
            registerInput.email.disabled = true;
            sendPinButton.disabled = true;
            sendPinButton.textContent = '인증 완료';
            let notice = new NoticeBox(
                data.message || '이메일 인증이 완료되었습니다.',
                'success'
            );
            notice.show();
        } else {
            isEmailVerified = false;
            pinTimerMessage.textContent =
                data.message || '인증번호가 올바르지 않습니다.';
            pinTimerMessage.style.color = '#f47c7c';
            let notice = new NoticeBox(
                data.message || '인증번호가 올바르지 않습니다.',
                'error'
            );
            notice.show();
        }
    } catch (error) {
        console.error('PIN 검증 실패:', error);
        pinTimerMessage.textContent =
            '인증번호 확인 중 오류가 발생했습니다. 다시 시도해주세요.';
        pinTimerMessage.style.color = '#f47c7c';
        let notice = new NoticeBox(
            '인증번호 확인 중 오류가 발생했습니다.',
            'error'
        );
        notice.show();
    } finally {
        isVerifyingPin = false;
        verifyPinButton.disabled = false;
        verifyPinButton.textContent = '인증 확인';
    }
});

function startPinTimer() {
    clearInterval(pinTimerInterval);
    timeLeft = 300;
    pinTimerMessage.style.color = 'rgb(100,100,100)';

    pinTimerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        pinTimerMessage.textContent = `남은 시간: ${minutes}:${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(pinTimerInterval);
            pinTimerMessage.textContent =
                '인증 시간이 만료되었습니다. 다시 시도해주세요.';
            pinTimerMessage.style.color = '#f47c7c';
            sendPinButton.textContent = '인증번호 받기';
        }
        timeLeft--;
    }, 1000);
}
