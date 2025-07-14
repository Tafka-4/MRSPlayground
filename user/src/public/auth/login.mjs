import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';

let isLoggingIn = false;

window.addEventListener('load', async () => {
    console.log('Window loaded, starting initialization...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force_logout') === 'true') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUserId');
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        new NoticeBox('보안을 위해 다시 로그인해주세요.', 'warning').show();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    } else if (urlParams.get('session_expired') === 'true') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUserId');
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        new NoticeBox('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning').show();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    const existingForm = document.getElementById('loginForm');
    const existingInputs = document.querySelector('input[name="id"]') && 
                          document.querySelector('input[name="password"]') && 
                          document.querySelector('#login-button');
    
    if (!existingForm || !existingInputs) {
        console.warn('Login form or inputs not found in HTML');
        return;
    }
    
    try {
        console.log('Using static HTML form');
        setupPasswordToggle();
        setupEventListeners();
        await checkLogin();
        checkRememberMe();
    } catch (error) {
        console.error('Failed to initialize login:', error);
    }
});

function createLoginFormHTML() {
    console.log('Creating login form HTML dynamically...');
    
    console.warn('This should not be called - using existing HTML structure');
}

function initializeLoginComponents(createInput, createButton) {
    console.log('Initializing login components...');
    
    const userIdContainer = document.querySelector('.id-input');
    const passwordContainer = document.querySelector('.password-input');
    const buttonContainer = document.querySelector('.login-button');
    
    if (!userIdContainer || !passwordContainer || !buttonContainer) {
        console.error('Required DOM elements not found!');
        return false;
    }
    
    try {
        userIdContainer.innerHTML = '';
        passwordContainer.innerHTML = '';
        buttonContainer.innerHTML = '';
        
        const userIdInput = createInput({
            id: 'user-id',
            type: 'text',
            name: 'id',
            placeholder: '아이디',
            icon: 'person',
            required: true
        });
        
        if (!userIdInput) {
            console.error('Failed to create userIdInput');
            return false;
        }
        userIdContainer.appendChild(userIdInput);

        const passwordInput = createPasswordInput(createInput);
        if (!passwordInput) {
            console.error('Failed to create passwordInput');
            return false;
        }
        passwordContainer.appendChild(passwordInput);

        const loginButton = createButton({
            id: 'login-button',
            text: '로그인',
            type: 'submit',
            variant: 'primary',
            className: 'auth-btn auth-btn-primary'
        });
        
        if (!loginButton) {
            console.error('Failed to create loginButton');
            return false;
        }
        buttonContainer.appendChild(loginButton);
        
        console.log('Checking created components...');
        
        const createdIdInput = userIdContainer.querySelector('input[name="id"]') || 
                              userIdContainer.querySelector('input[type="text"]') ||
                              userIdContainer.querySelector('input');
        const createdPasswordInput = passwordContainer.querySelector('input[name="password"]') || 
                                    passwordContainer.querySelector('input[type="password"]') ||
                                    passwordContainer.querySelector('input');
        
        console.log('Found inputs:', { createdIdInput: !!createdIdInput, createdPasswordInput: !!createdPasswordInput });
        
        if (!createdIdInput || !createdPasswordInput) {
            console.error('Components created but inputs not found in DOM');
            return false;
        }
        
        console.log('Components initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing components:', error);
        return false;
    }
}

function initializeBasicLoginForm() {
    console.log('Initializing basic login form...');
    
    const userIdContainer = document.querySelector('.id-input');
    const passwordContainer = document.querySelector('.password-input');
    const buttonContainer = document.querySelector('.login-button');
    
    if (!userIdContainer || !passwordContainer || !buttonContainer) {
        console.error('Required DOM elements not found!');
        return false;
    }
    
    try {
        userIdContainer.innerHTML = `
            <div class="input-wrapper">
                <span class="material-symbols-outlined">person</span>
                <input type="text" name="id" placeholder="아이디" required>
            </div>
        `;
        
        passwordContainer.innerHTML = `
            <div class="input-wrapper">
                <span class="material-symbols-outlined">lock</span>
                <input type="password" name="password" placeholder="비밀번호" required>
                <div class="visibility-container">
                    <span class="material-symbols-outlined" id="visibility-on">visibility</span>
                    <span class="material-symbols-outlined" id="visibility-off" style="display: none;">visibility_off</span>
                </div>
            </div>
        `;
        
        buttonContainer.innerHTML = `
            <button type="submit" id="login-button" class="auth-btn auth-btn-primary">
                <span class="material-symbols-outlined">login</span>
                로그인
            </button>
        `;
        
        setupPasswordToggle();
        
        console.log('Basic form initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing basic form:', error);
        return false;
    }
}

function createPasswordInput(createInput) {
    const passwordContainer = document.createElement('div');
    passwordContainer.className = 'input-wrapper';
    
    const passwordInput = createInput({
        id: 'user-password',
        type: 'password',
        name: 'password',
        placeholder: '비밀번호',
        icon: 'lock',
        required: true
    });
    
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'visibility-container';
    
    const visibilityOn = document.createElement('span');
    visibilityOn.className = 'material-symbols-outlined';
    visibilityOn.id = 'visibility-on';
    visibilityOn.textContent = 'visibility';
    
    const visibilityOff = document.createElement('span');
    visibilityOff.className = 'material-symbols-outlined';
    visibilityOff.id = 'visibility-off';
    visibilityOff.textContent = 'visibility_off';
    visibilityOff.style.display = 'none';
    
    toggleContainer.appendChild(visibilityOn);
    toggleContainer.appendChild(visibilityOff);
    
    passwordContainer.appendChild(passwordInput);
    passwordContainer.appendChild(toggleContainer);
    
    toggleContainer.addEventListener('click', () => {
        const input = passwordInput.querySelector('input') || passwordInput;
        togglePasswordVisibility(input);
    });
    
    return passwordContainer;
}

function setupPasswordToggle() {
    const toggleContainer = document.querySelector('.visibility-container');
    const visibilityOn = document.getElementById('visibility-on');
    const visibilityOff = document.getElementById('visibility-off');
    const passwordInput = document.querySelector('input[name="password"]');
    
    if (toggleContainer && visibilityOn && visibilityOff && passwordInput) {
        toggleContainer.addEventListener('click', () => {
            togglePasswordVisibility(passwordInput);
        });
    }
}

function togglePasswordVisibility(passwordInput = null) {
    const input = passwordInput || document.querySelector('input[name="password"]');
    const visibilityOn = document.getElementById('visibility-on');
    const visibilityOff = document.getElementById('visibility-off');
    
    if (!input || !visibilityOn || !visibilityOff) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        input.style.fontFamily = 'ONE-Mobile-POP';
        visibilityOn.style.display = 'none';
        visibilityOff.style.display = 'block';
    } else {
        input.type = 'password';
        visibilityOn.style.display = 'block';
        visibilityOff.style.display = 'none';
        if (input.value.length > 0) {
            input.style.fontFamily = 'Courier New';
        }
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const form = document.getElementById('loginForm');
    const loginButton = document.getElementById('login-button') || document.querySelector('.auth-btn');
    const rememberMeCheckbox = document.getElementById('remember-me');
    
    if (!form) {
        console.error('Login form not found!');
        return false;
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
    
    form.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
    });
    
    if (loginButton) {
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
    }
    
    const inputs = document.querySelectorAll('input[name="id"], input[name="password"]');
    inputs.forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                login();
            }
        });
    });
    
    if (rememberMeCheckbox) {
        rememberMeCheckbox.addEventListener('click', rememberMe);
    }
    
    const findPasswordLink = document.querySelector('a[href="/find-password"]');
    if (findPasswordLink) {
        findPasswordLink.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
    
    const registerLink = document.querySelector('a[href="/register"]');
    if (registerLink) {
        registerLink.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
    
    console.log('Event listeners set up successfully');
    return true;
}

function login() {
    if (isLoggingIn) {
        return;
    }

    setTimeout(() => {
        const idInput = document.querySelector('input[name="id"]');
        const passwordInput = document.querySelector('input[name="password"]');
        const loginButton = document.getElementById('login-button') || document.querySelector('.auth-btn') || document.querySelector('button[type="submit"]');
        
        console.log('Found elements:', {
            idInput: !!idInput,
            passwordInput: !!passwordInput,
            loginButton: !!loginButton,
            allInputs: document.querySelectorAll('input').length,
            allButtons: document.querySelectorAll('button').length
        });
        
        if (!idInput || !passwordInput) {
            console.error('Input elements not found');
            NoticeBox.error('폼 요소를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        const id = idInput.value.trim();
        const password = passwordInput.value.trim();

        if (!id || !password) {
            NoticeBox.error('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        isLoggingIn = true;

        if (loginButton) {
            loginButton.disabled = true;
            const originalText = loginButton.textContent;
            loginButton.textContent = '로그인 중...';
            
            setTimeout(() => {
                loginButton.disabled = false;
                loginButton.textContent = originalText;
                isLoggingIn = false;
            }, 10000);
        }

        performLogin(id, password, loginButton);
    }, 100);
}

async function performLogin(id, password, loginButton) {
    try {
        const loginData = {
            id: id,
            password: password
        };

        const response = await apiClient.post('/api/v1/auth/login', loginData);

        if (response && response.user) {
            NoticeBox.success('로그인이 완료되었습니다.');
            
            const rememberMeCheckbox = document.getElementById('remember-me');
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('rememberedUserId', id);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('rememberedUserId');
            }
            
            setTimeout(() => {
                window.location.href = '/mypage';
            }, 1000);
        } else {
            throw new Error('로그인 응답이 올바르지 않습니다.');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = '로그인에 실패했습니다.';
        
        if (error.status === 401) {
            errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
        } else if (error.status === 429) {
            errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        NoticeBox.error(errorMessage);
    } finally {
        isLoggingIn = false;
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = '<span class="material-symbols-outlined">login</span>로그인';
        }
    }
}

async function checkLogin() {
    try {
        const response = await apiClient.get('/api/v1/auth/me');
        if (response && response.user) {
            console.log('User already logged in, redirecting to mypage...');
            window.location.href = '/mypage';
        }
    } catch (error) {
        if (error.status === 401) {
            console.log('User not logged in, staying on login page');
        } else {
            console.error('Login check error:', error);
        }
    }
}

function checkRememberMe() {
    const rememberMe = localStorage.getItem('rememberMe');
    const rememberedUserId = localStorage.getItem('rememberedUserId');
    
    if (rememberMe === 'true' && rememberedUserId) {
        const rememberMeCheckbox = document.getElementById('remember-me');
        const idInput = document.querySelector('input[name="id"]');
        
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
        
        if (idInput) {
            idInput.value = rememberedUserId;
        }
    }
}

function rememberMe() {
    const checkbox = document.getElementById('remember-me');
    const idInput = document.querySelector('input[name="id"]');
    
    if (checkbox && checkbox.checked && idInput && idInput.value.trim()) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedUserId', idInput.value.trim());
    } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUserId');
    }
}
