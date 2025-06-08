import NoticeBox from './module/notice.js';
import apiClient from './module/api.js';
import {
    createInputWrapper,
    createButton,
    createCheckbox,
    createLink,
    createTitle,
    createDivider,
    FormValidators,
    FormManager
} from './component/form-components.js';
import { PageLayoutManager } from './component/page-layout.js';

// Initialize page layout
const layoutManager = new PageLayoutManager();
const container = layoutManager.setupLayout('centered');

// Form state
let isLoggingIn = false;
const formManager = new FormManager();

// Initialize the login page
function initializeLoginPage() {
    // Set body style to match original
    document.body.style.display = 'flex';
    document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'center';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'rgb(240, 240, 240)';

    // Create main container
    const container = document.createElement('div');
    container.className = 'container';

    // Create login form container
    const loginForm = document.createElement('div');
    loginForm.className = 'login-form';

    // Create title
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = '로그인';
    loginForm.appendChild(title);

    // Create ID input wrapper
    const idWrapper = document.createElement('div');
    idWrapper.className = 'input-wrapper';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.name = 'id';
    idInput.placeholder = '아이디';
    idInput.required = true;

    const idIcon = document.createElement('span');
    idIcon.className = 'material-symbols-outlined';
    idIcon.textContent = 'account_circle';

    idWrapper.appendChild(idInput);
    idWrapper.appendChild(idIcon);
    loginForm.appendChild(idWrapper);

    // Create password input wrapper
    const passwordWrapper = document.createElement('div');
    passwordWrapper.className = 'input-wrapper';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.placeholder = '비밀번호';
    passwordInput.required = true;

    const passwordIcon = document.createElement('span');
    passwordIcon.className = 'material-symbols-outlined';
    passwordIcon.textContent = 'lock';

    // Create visibility toggle container
    const visibilityContainer = document.createElement('div');
    visibilityContainer.className = 'visibility-container';

    const visibilityIcon = document.createElement('span');
    visibilityIcon.className = 'material-symbols-outlined';
    visibilityIcon.id = 'visibility';
    visibilityIcon.textContent = 'visibility';

    const visibilityOffIcon = document.createElement('span');
    visibilityOffIcon.className = 'material-symbols-outlined';
    visibilityOffIcon.id = 'visibility-off';
    visibilityOffIcon.textContent = 'visibility_off';
    visibilityOffIcon.style.display = 'none';

    visibilityContainer.appendChild(visibilityIcon);
    visibilityContainer.appendChild(visibilityOffIcon);

    passwordWrapper.appendChild(passwordInput);
    passwordWrapper.appendChild(passwordIcon);
    passwordWrapper.appendChild(visibilityContainer);
    loginForm.appendChild(passwordWrapper);

    // Create login button (original structure: button + label)
    const loginButton = document.createElement('button');
    loginButton.id = 'login-button';
    loginButton.type = 'submit';

    const loginLabel = document.createElement('label');
    loginLabel.htmlFor = 'login-button';
    loginLabel.textContent = '로그인';

    loginForm.appendChild(loginButton);
    loginForm.appendChild(loginLabel);

    container.appendChild(loginForm);

    // Create utility container
    const utilContainer = document.createElement('div');
    utilContainer.className = 'util-container';

    // Create remember me container (exact original structure)
    const rememberMeContainer = document.createElement('div');
    rememberMeContainer.className = 'remember-me-container';

    const rememberMeCheckbox = document.createElement('input');
    rememberMeCheckbox.type = 'checkbox';
    rememberMeCheckbox.id = 'remember-me';

    const rememberMeLabel1 = document.createElement('label');
    rememberMeLabel1.htmlFor = 'remember-me';

    const rememberMeLabel2 = document.createElement('label');
    rememberMeLabel2.htmlFor = 'remember-me';
    const rememberMeSpan = document.createElement('span');
    rememberMeSpan.textContent = '나를 기억하기';
    rememberMeLabel2.appendChild(rememberMeSpan);

    rememberMeContainer.appendChild(rememberMeCheckbox);
    rememberMeContainer.appendChild(rememberMeLabel1);
    rememberMeContainer.appendChild(rememberMeLabel2);

    // Create find password container
    const findPasswordContainer = document.createElement('div');
    findPasswordContainer.className = 'find-password-container';

    const findPasswordLink = document.createElement('a');
    findPasswordLink.className = 'find-password';
    findPasswordLink.href = '/find-password';
    findPasswordLink.textContent = '비밀번호 찾기';

    findPasswordContainer.appendChild(findPasswordLink);

    utilContainer.appendChild(rememberMeContainer);
    utilContainer.appendChild(findPasswordContainer);
    container.appendChild(utilContainer);

    // Create divider
    const divider = document.createElement('hr');
    divider.className = 'divider';
    container.appendChild(divider);

    // Create register container
    const registerContainer = document.createElement('div');
    registerContainer.className = 'register-container';

    const registerLinkText = document.createElement('span');
    registerLinkText.className = 'register-link-text';
    registerLinkText.innerHTML =
        '아직 계정이 없으십니까? | <a class="register-link" href="/register">회원가입</a>';

    registerContainer.appendChild(registerLinkText);
    container.appendChild(registerContainer);

    // Create notice container
    const noticeContainer = document.createElement('div');
    noticeContainer.className = 'notice-container';

    // Append to body
    document.body.appendChild(container);
    document.body.appendChild(noticeContainer);

    // Add event listeners
    setupEventListeners(
        idInput,
        passwordInput,
        loginButton,
        rememberMeCheckbox,
        visibilityIcon,
        visibilityOffIcon
    );

    // Check for existing login and remember me
    //checkLogin();
    checkRememberMe(idInput, rememberMeCheckbox);
}

function setupEventListeners(
    idInput,
    passwordInput,
    loginButton,
    rememberMeCheckbox,
    visibilityIcon,
    visibilityOffIcon
) {
    // Password visibility toggle
    const toggleVisibility = () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            visibilityIcon.style.display = 'none';
            visibilityOffIcon.style.display = 'block';
        } else {
            passwordInput.type = 'password';
            visibilityIcon.style.display = 'block';
            visibilityOffIcon.style.display = 'none';
        }
    };

    visibilityIcon.addEventListener('click', toggleVisibility);
    visibilityOffIcon.addEventListener('click', toggleVisibility);

    // Remember me functionality
    rememberMeCheckbox.addEventListener('click', () => {
        if (rememberMeCheckbox.checked && idInput.value) {
            localStorage.setItem('username', idInput.value);
        } else {
            localStorage.removeItem('username');
        }
    });

    // Login button click
    loginButton.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogin(idInput, passwordInput, loginButton);
    });

    // Also add click event to label since it's visible
    const loginLabel = document.querySelector('label[for="login-button"]');
    if (loginLabel) {
        loginLabel.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogin(idInput, passwordInput, loginButton);
        });
    }

    // Enter key support
    [idInput, passwordInput].forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleLogin(idInput, passwordInput, loginButton);
            }
        });
    });
}

async function handleLogin(idInput, passwordInput, loginButton) {
    if (isLoggingIn) {
        console.log('로그인이 이미 진행 중입니다.');
        return;
    }

    const id = idInput.value;
    const password = passwordInput.value;

    // Validation
    if (id === '' || password === '') {
        new NoticeBox('아이디와 비밀번호를 입력해주세요.', 'error').show();
        return;
    }

    if (password.length < 8) {
        new NoticeBox('비밀번호는 8자 이상이어야 합니다.', 'error').show();
        return;
    }

    if (/[^a-zA-Z0-9!@#$%^&*()_{}]/g.test(id)) {
        new NoticeBox(
            '아이디는 영문자, 숫자, 특수문자만 사용할 수 있습니다.',
            'error'
        ).show();
        return;
    }

    if (
        !password.match(/[a-zA-Z]/g) ||
        !password.match(/[0-9]/g) ||
        !password.match(/[!@#$%^&*()_{}]/g)
    ) {
        new NoticeBox(
            '비밀번호는 영문자, 숫자, 특수문자를 포함해야 합니다.',
            'error'
        ).show();
        return;
    }

    isLoggingIn = true;
    loginButton.disabled = true;

    const loginLabel = document.querySelector('label[for="login-button"]');
    const originalButtonText = loginLabel.textContent;
    loginLabel.textContent = '로그인 중...';

    try {
        const response = await apiClient.post('/api/v1/auth/login', {
            id,
            password
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('accessToken', data.accessToken);
            new NoticeBox(data.message || '로그인 성공', 'success').show();

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
            new NoticeBox(data.message, 'error').show();
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        new NoticeBox('로그인 중 오류가 발생했습니다.', 'error').show();
    } finally {
        isLoggingIn = false;
        loginButton.disabled = false;
        loginLabel.textContent = originalButtonText;
    }
}

/*
async function checkLogin() {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        return;
    }

    try {
        const response = await apiClient.post('/api/v1/auth/check-token');
        const data = await response.json();

        if (data.success) {
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                window.location.href = '/';
            }
        } else {
            localStorage.removeItem('accessToken');
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    } catch (error) {
        localStorage.removeItem('accessToken');
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        console.error('토큰 검증 중 오류:', error);
    }
}
*/

function checkRememberMe(idInput, rememberMeCheckbox) {
    const rememberUsername = localStorage.getItem('username');
    if (rememberUsername) {
        idInput.value = rememberUsername;
        rememberMeCheckbox.checked = true;
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLoginPage);
