import NoticeBox from '/module/notice.js';
import apiClient from '/module/api.js';

console.log('find-password.mjs 로드됨');

const findPasswordInput = {
    id: document.querySelector('input[name="id"]'),
    email: document.querySelector('input[name="email"]')
};

const findPasswordButton = document.querySelector('#find-password-button');
const goToLoginButton = document.querySelector('#go-to-login');
const findPasswordForm = document.querySelector('.auth-form');
const successMessage = document.querySelector('#success-message');

console.log('DOM 요소 확인:', {
    idInput: !!findPasswordInput.id,
    emailInput: !!findPasswordInput.email,
    findPasswordButton: !!findPasswordButton,
    goToLoginButton: !!goToLoginButton,
    findPasswordForm: !!findPasswordForm,
    successMessage: !!successMessage
});

let isFindingPassword = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생');
    setupEventListeners();
});

function setupEventListeners() {
    console.log('이벤트 리스너 설정 시작');
    
    if (findPasswordButton) {
        findPasswordButton.addEventListener('click', (event) => {
            event.preventDefault();
            findPassword();
        });
        findPasswordButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                findPassword();
            }
        });
        console.log('비밀번호 찾기 버튼 이벤트 리스너 설정됨');
    } else {
        console.error('비밀번호 찾기 버튼을 찾을 수 없습니다');
    }

    if (goToLoginButton) {
        goToLoginButton.addEventListener('click', () => {
            window.location.href = '/login';
        });
        console.log('로그인 페이지 이동 버튼 이벤트 리스너 설정됨');
    } else {
        console.error('로그인 페이지 이동 버튼을 찾을 수 없습니다');
    }

    if (findPasswordInput.id) {
        findPasswordInput.id.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                findPassword();
            }
        });

        findPasswordInput.id.addEventListener('input', () => {
            const username = findPasswordInput.id.value;
            if (username.length > 0 && /[^a-zA-Z0-9_]/g.test(username)) {
                findPasswordInput.id.style.borderColor = '#ff6b6b';
            } else {
                findPasswordInput.id.style.borderColor = '';
            }
        });
        console.log('아이디 입력 필드 이벤트 리스너 설정됨');
    } else {
        console.error('아이디 입력 필드를 찾을 수 없습니다');
    }

    if (findPasswordInput.email) {
        findPasswordInput.email.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                findPassword();
            }
        });

        findPasswordInput.email.addEventListener('input', () => {
            const email = findPasswordInput.email.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email.length > 0 && !emailRegex.test(email)) {
                findPasswordInput.email.style.borderColor = '#ff6b6b';
            } else {
                findPasswordInput.email.style.borderColor = '';
            }
        });
        console.log('이메일 입력 필드 이벤트 리스너 설정됨');
    } else {
        console.error('이메일 입력 필드를 찾을 수 없습니다');
    }
    
    console.log('이벤트 리스너 설정 완료');
}

async function findPassword() {
    console.log('비밀번호 찾기 함수 호출됨');
    
    if (isFindingPassword) {
        console.log('비밀번호 찾기가 이미 진행 중입니다.');
        return;
    }

    const id = findPasswordInput.id?.value.trim() || '';
    const email = findPasswordInput.email?.value.trim() || '';

    console.log('입력값:', { id: id ? '***' : '(빈값)', email: email ? '***' : '(빈값)' });

    if (!validateInputs(id, email)) {
        return;
    }

    isFindingPassword = true;
    
    if (findPasswordButton) {
        findPasswordButton.disabled = true;
        findPasswordButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>발송 중...';
    }

    try {
        const response = await apiClient.post('/api/v1/auth/find-password', { id, email });
        
        if (response && response.success) {
            NoticeBox.success('임시 비밀번호가 이메일로 발송되었습니다.');
            showSuccessMessage();
        } else {
            NoticeBox.error(response?.message || '비밀번호 찾기에 실패했습니다.');
            resetButton();
        }
    } catch (error) {
        let errorMessage = '비밀번호 찾기에 실패했습니다.';
        
        if (error.status === 404) {
            errorMessage = '해당 아이디와 이메일로 등록된 계정을 찾을 수 없습니다.';
        } else if (error.status === 429) {
            errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        NoticeBox.error(errorMessage);
        resetButton();
    } finally {
        isFindingPassword = false;
    }
}

function validateInputs(id, email) {
    if (id === '') {
        NoticeBox.error('아이디를 입력해주세요.');
        findPasswordInput.id?.focus();
        return false;
    }

    if (id.length < 4) {
        NoticeBox.error('아이디는 4자 이상이어야 합니다.');
        findPasswordInput.id?.focus();
        return false;
    }

    if (id.length > 20) {
        NoticeBox.error('아이디는 20자 이하여야 합니다.');
        findPasswordInput.id?.focus();
        return false;
    }

    if (/[^a-zA-Z0-9_]/g.test(id)) {
        NoticeBox.error('아이디는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.');
        findPasswordInput.id?.focus();
        return false;
    }

    if (email === '') {
        NoticeBox.error('이메일을 입력해주세요.');
        findPasswordInput.email?.focus();
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        NoticeBox.error('올바른 이메일 형식을 입력해주세요.');
        findPasswordInput.email?.focus();
        return false;
    }

    if (email.length > 100) {
        NoticeBox.error('이메일은 100자 이하여야 합니다.');
        findPasswordInput.email?.focus();
        return false;
    }

    return true;
}

function showSuccessMessage() {
    if (findPasswordForm) {
        findPasswordForm.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'block';
        successMessage.classList.add('show');
    }

    setTimeout(() => {
        window.location.href = '/login';
    }, 10000);
}

function resetButton() {
    if (findPasswordButton) {
        findPasswordButton.disabled = false;
        findPasswordButton.innerHTML = '<span class="material-symbols-outlined">send</span>임시 비밀번호 발송';
    }
}

// checkLoginStatus 함수를 주석 처리하여 비활성화
/*
async function checkLoginStatus() {
    try {
                        const response = await apiClient.get('/api/v1/auth/me');
        if (response && response.user) {
            console.log('User already logged in, redirecting to mypage...');
            window.location.href = '/mypage';
        }
    } catch (error) {
        console.log('User not logged in, staying on find-password page');
    }
}
*/
