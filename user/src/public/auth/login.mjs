import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';

let isLoggingIn = false;

window.addEventListener('load', async () => {
    console.log('Window loaded, starting initialization...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we need to create HTML dynamically or if it already exists
    const existingForm = document.getElementById('loginForm');
    const existingContainers = document.querySelector('.id-input') && 
                              document.querySelector('.password-input') && 
                              document.querySelector('.login-button');
    
    if (!existingForm || !existingContainers) {
        console.warn('Login form or containers not found in HTML, creating them dynamically...');
        createLoginFormHTML();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
        const { createInput, createButton } = await import('/component/index.js');
        console.log('Components imported successfully');
        
        const success = initializeLoginComponents(createInput, createButton);
        if (success) {
            setupEventListeners();
            await checkLogin();
            checkRememberMe();
        } else {
            console.log('Component initialization failed, trying basic form...');
            const basicSuccess = initializeBasicLoginForm();
            if (basicSuccess) {
                setupEventListeners();
                await checkLogin();
                checkRememberMe();
            }
        }
    } catch (error) {
        console.error('Failed to import components:', error);
        const success = initializeBasicLoginForm();
        if (success) {
            setupEventListeners();
            await checkLogin();
            checkRememberMe();
        }
    }
});

function createLoginFormHTML() {
    console.log('Creating login form HTML dynamically...');
    
    document.body.innerHTML = `
        <div class="container">
            <form class="login-form" id="loginForm">
                <h1 class="title">로그인</h1>
                
                <div class="id-input"></div>
                <div class="password-input"></div>
                
                <div class="util-container">
                    <div class="remember-me-container">
                        <input type="checkbox" id="remember-me" name="remember-me">
                        <label for="remember-me">
                            <span>기억하기</span>
                        </label>
                    </div>
                    <div class="find-password-container">
                        <a href="/find-password" class="find-password">비밀번호 찾기</a>
                    </div>
                </div>
                
                <div class="login-button"></div>
                
                <hr class="divider">
                
                <div class="register-container">
                    아직 계정이 없나요? <a href="/register" class="register-link">회원가입</a>
                </div>
            </form>
            
            <div class="notice-container" id="noticeContainer"></div>
        </div>
    `;
    
    console.log('Login form HTML created successfully');
}

function initializeLoginComponents(createInput, createButton) {
    console.log('Initializing login components...');
    
    const userIdContainer = document.querySelector('.id-input');
    const passwordContainer = document.querySelector('.password-input');
    const buttonContainer = document.querySelector('.login-button');
    
    if (!userIdContainer || !passwordContainer || !buttonContainer) {
        console.error('Required DOM elements not found!');
        
        if (!window.componentRetryCount) window.componentRetryCount = 0;
        if (window.componentRetryCount < 3) {
            window.componentRetryCount++;
            console.log(`Retrying in 500ms... (attempt ${window.componentRetryCount}/3)`);
            setTimeout(() => {
                const retry = initializeLoginComponents(createInput, createButton);
                if (retry) {
                    setupEventListeners();
                    checkLogin();
                    checkRememberMe();
                }
            }, 500);
        } else {
            console.error('Max retries reached, falling back to basic form');
            const basicSuccess = initializeBasicLoginForm();
            if (basicSuccess) {
                setupEventListeners();
                checkLogin();
                checkRememberMe();
            }
        }
        
        return false;
    }
    
    try {
        const userIdInput = createInput({
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
            text: '로그인',
            type: 'submit',
            variant: 'primary',
            className: 'login-button',
            id: 'login-button'
        });
        
        if (!loginButton) {
            console.error('Failed to create loginButton');
            return false;
        }
        buttonContainer.appendChild(loginButton);
        
        // Verify that inputs were actually created
        console.log('Checking created components...');
        console.log('UserIdContainer HTML:', userIdContainer.innerHTML);
        console.log('PasswordContainer HTML:', passwordContainer.innerHTML);
        
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
        
        if (!window.basicRetryCount) window.basicRetryCount = 0;
        if (window.basicRetryCount < 3) {
            window.basicRetryCount++;
            console.log(`Basic form retrying in 500ms... (attempt ${window.basicRetryCount}/3)`);
            setTimeout(() => {
                const retry = initializeBasicLoginForm();
                if (retry) {
                    setupEventListeners();
                    checkLogin();
                    checkRememberMe();
                }
            }, 500);
        } else {
            console.error('Basic form max retries reached, giving up');
        }
        
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
            <button type="submit" id="login-button" class="btn btn-primary login-button">로그인</button>
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
        visibilityOn.style.display = 'none';
        visibilityOff.style.display = 'block';
    } else {
        input.type = 'password';
        visibilityOn.style.display = 'block';
        visibilityOff.style.display = 'none';
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const form = document.getElementById('loginForm');
    const loginButton = document.getElementById('login-button');
    const rememberMeCheckbox = document.getElementById('remember-me');
    
    if (!form) {
        console.error('Login form not found!');
        return false;
    }
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
    
    // Button click
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
    
    // Input Enter key
    const inputs = document.querySelectorAll('input[name="id"], input[name="password"]');
    inputs.forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                login();
            }
        });
    });
    
    // Remember me functionality
    if (rememberMeCheckbox) {
        rememberMeCheckbox.addEventListener('click', rememberMe);
    }
    
    console.log('Event listeners set up successfully');
    return true;
}

function login() {
    if (isLoggingIn) {
        console.log('로그인이 이미 진행 중입니다.');
        return;
    }

    // Wait a bit and try to find elements with retries
    setTimeout(() => {
        const idInput = document.querySelector('input[name="id"]');
        const passwordInput = document.querySelector('input[name="password"]');
        const loginButton = document.getElementById('login-button') || document.querySelector('.btn.login-button') || document.querySelector('button[type="submit"]');
        
        console.log('Found elements:', {
            idInput: !!idInput,
            passwordInput: !!passwordInput,
            loginButton: !!loginButton,
            allInputs: document.querySelectorAll('input').length,
            allButtons: document.querySelectorAll('button').length
        });
        
        if (!idInput || !passwordInput) {
            console.error('Input elements not found');
            // Try to initialize components again
            console.log('Retrying component initialization...');
            const containers = {
                id: document.querySelector('.id-input'),
                password: document.querySelector('.password-input'),
                button: document.querySelector('.login-button')
            };
            console.log('Container elements:', containers);
            
            if (containers.id && containers.password && containers.button) {
                // Containers exist but are empty, create basic inputs
                console.log('Creating basic inputs in existing containers...');
                containers.id.innerHTML = `
                    <div class="input-wrapper">
                        <span class="material-symbols-outlined">person</span>
                        <input type="text" name="id" placeholder="아이디" required>
                    </div>
                `;
                
                containers.password.innerHTML = `
                    <div class="input-wrapper">
                        <span class="material-symbols-outlined">lock</span>
                        <input type="password" name="password" placeholder="비밀번호" required>
                        <div class="visibility-container">
                            <span class="material-symbols-outlined" id="visibility-on">visibility</span>
                            <span class="material-symbols-outlined" id="visibility-off" style="display: none;">visibility_off</span>
                        </div>
                    </div>
                `;
                
                containers.button.innerHTML = `
                    <button type="submit" id="login-button" class="btn btn-primary login-button">로그인</button>
                `;
                
                setupPasswordToggle();
                
                // Try login again after a short delay
                setTimeout(() => {
                    const newIdInput = document.querySelector('input[name="id"]');
                    const newPasswordInput = document.querySelector('input[name="password"]');
                    const newLoginButton = document.getElementById('login-button');
                    
                    if (newIdInput && newPasswordInput) {
                        console.log('Inputs created successfully, proceeding with login...');
                        performLogin(newIdInput, newPasswordInput, newLoginButton);
                    } else {
                        let notice = new NoticeBox('페이지를 새로고침해주세요.', 'error');
                        notice.show();
                    }
                }, 200);
                return;
            } else {
                let notice = new NoticeBox('페이지를 새로고침해주세요.', 'error');
                notice.show();
                return;
            }
        }
        
        performLogin(idInput, passwordInput, loginButton);
    }, 100);
}

function performLogin(idInput, passwordInput, loginButton) {
    const id = idInput.value.trim();
    const password = passwordInput.value;

    // Validation
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
    if (loginButton) {
        loginButton.disabled = true;
        const originalButtonText = loginButton.textContent;
        loginButton.textContent = '로그인 중...';
        
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
                    passwordInput.value = '';
                }
            })
            .catch((error) => {
                console.error('Login error:', error);
                let notice = new NoticeBox(
                    '로그인 중 오류가 발생했습니다.',
                    'error'
                );
                notice.show();
            })
            .finally(() => {
                isLoggingIn = false;
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = originalButtonText;
                }
            });
    }
}

function rememberMe() {
    const rememberMeCheckbox = document.getElementById('remember-me');
    const idInput = document.querySelector('input[name="id"]');
    
    if (rememberMeCheckbox && idInput) {
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('username', idInput.value);
        } else {
            localStorage.removeItem('username');
        }
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
    const idInput = document.querySelector('input[name="id"]');
    const rememberMeCheckbox = document.getElementById('remember-me');
    
    if (rememberUsername && idInput && rememberMeCheckbox) {
        idInput.value = rememberUsername;
        rememberMeCheckbox.checked = true;
    }
}
