import NoticeBox from './module/notice.js';
import apiClient from './module/api.js';

const loginInputs = {
    id: document.querySelector('input[name="id"]'),
    password: document.querySelector('input[name="password"]')
};

const loginButton = document.querySelector('#login-button');
const rememberMeCheckbox = document.querySelector('#remember-me');
const visibilityIcon = document.querySelector('#visibility');
const visibilityOffIcon = document.querySelector('#visibility-off');

let isLoggingIn = false;

rememberMeCheckbox.addEventListener('click', rememberMe);
visibilityIcon.addEventListener('click', togglePasswordVisibility);
visibilityOffIcon.addEventListener('click', togglePasswordVisibility);

visibilityOffIcon.style.display = 'none';

function togglePasswordVisibility() {
    const passwordInput = loginInputs.password;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        visibilityIcon.style.display = 'none';
        visibilityOffIcon.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        visibilityIcon.style.display = 'block';
        visibilityOffIcon.style.display = 'none';
    }
}

loginButton.addEventListener('click', (event) => {
    event.preventDefault();
    login();
});
loginButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        login();
    }
});

for (const loginInput of Object.values(loginInputs)) {
    loginInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            login();
        }
    });
}

function login() {
    if (isLoggingIn) {
        console.log('로그인이 이미 진행 중입니다.');
        return;
    }

    const id = loginInputs.id.value;
    const password = loginInputs.password.value;

    if (id === '' || password === '') {
        let notice = new NoticeBox(
            '아이디와 비밀번호를 입력해주세요.',
            'error'
        );
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

    if (/[^a-zA-Z0-9!@#$%^&*()_{}]/g.test(id)) {
        let notice = new NoticeBox(
            '아이디는 영문자, 숫자, 특수문자만 사용할 수 있습니다.',
            'error'
        );
        notice.show();
        return;
    }
    if (
        !password.match(/[a-zA-Z]/g) ||
        !password.match(/[0-9]/g) ||
        !password.match(/[!@#$%^&*()_{}]/g)
    ) {
        let notice = new NoticeBox(
            '비밀번호는 영문자, 숫자, 특수문자를 포함해야 합니다.',
            'error'
        );
        notice.show();
        return;
    }

    isLoggingIn = true;
    loginButton.disabled = true;

    const originalButtonText = document.querySelector(
        'label[for="login-button"]'
    ).textContent;
    document.querySelector('label[for="login-button"]').textContent =
        '로그인 중...';

    apiClient
        .post('/api/v1/auth/login', { id, password })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                localStorage.setItem('accessToken', data.accessToken);
                let notice = new NoticeBox(
                    data.message || '로그인 성공',
                    'success'
                );
                notice.show();
                setTimeout(() => {
                    const redirectUrl = new URLSearchParams(
                        window.location.search
                    ).get('redirect');
                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = '/';
                    }
                }, 1000);
            } else {
                let notice = new NoticeBox(data.message, 'error');
                notice.show();
                document.querySelector('input[name="password"]').value = '';
            }
        })
        .catch((error) => {
            let notice = new NoticeBox(
                '로그인 중 오류가 발생했습니다.',
                'error'
            );
            notice.show();
        })
        .finally(() => {
            isLoggingIn = false;
            loginButton.disabled = false;
            document.querySelector('label[for="login-button"]').textContent =
                originalButtonText;
        });
}

function rememberMe() {
    if (rememberMeCheckbox.checked) {
        localStorage.setItem('username', loginInputs.id.value);
    } else {
        localStorage.removeItem('username');
    }
}

async function checkLogin() {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        return;
    }

    try {
        const response = await apiClient.post('/api/v1/auth/check-token');

        const data = await response.json();

        if (data.success) {
            const redirectUrl = new URLSearchParams(window.location.search).get(
                'redirect'
            );
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                window.location.href = '/';
            }
        } else {
            localStorage.removeItem('accessToken');
            document.cookie =
                'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    } catch (error) {
        localStorage.removeItem('accessToken');
        document.cookie =
            'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        console.error('토큰 검증 중 오류:', error);
    }
}

function checkRememberMe() {
    const rememberUsername = localStorage.getItem('username');
    if (rememberUsername) {
        loginInputs.id.value = rememberUsername;
        rememberMeCheckbox.checked = true;
    }
}

checkLogin();
checkRememberMe();
