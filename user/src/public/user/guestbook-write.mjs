import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';

const pathParts = window.location.pathname.split('/');
const targetUserId = pathParts[pathParts.length - 1];

let currentUser = null;
let targetUser = null;

async function initializePage() {
    try {
        const userResponse = await apiClient.get('/api/v1/auth/me');
        const userResult = await userResponse.json();
        
        if (!userResult.success) {
            throw new Error('로그인이 필요합니다.');
        }
        
        currentUser = userResult.user;
        
        if (currentUser.userid === targetUserId) {
            new NoticeBox('자신의 방명록에는 메시지를 남길 수 없습니다.', 'error').show();
            setTimeout(() => window.location.href = '/mypage/guestbook', 2000);
            return;
        }
        
        await loadTargetUserInfo();
        setupEventListeners();
        
    } catch (error) {
        console.error('페이지 초기화 실패:', error);
        showError(error.message || '페이지를 불러올 수 없습니다.');
    }
}

async function loadTargetUserInfo() {
    try {
        const response = await apiClient.get(`/api/v1/users/${targetUserId}`);
        
        if (!response.ok) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }
        
        targetUser = await response.json();
        displayTargetUserInfo();
        
    } catch (error) {
        console.error('사용자 정보 로딩 실패:', error);
        throw new Error('사용자 정보를 불러올 수 없습니다.');
    }
}

function displayTargetUserInfo() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('guestbook-write-container').style.display = 'block';
    
    document.getElementById('page-title').textContent = `${targetUser.nickname}님의 방명록 작성`;
    document.title = `${targetUser.nickname}님의 방명록 작성`;
    
    document.getElementById('target-username').textContent = targetUser.nickname;
    document.getElementById('target-description').textContent = targetUser.description || '소개가 없습니다.';
    
    const profileImage = document.getElementById('target-profile-image');
    if (targetUser.profileImage) {
        profileImage.innerHTML = `<img src="${targetUser.profileImage}" alt="프로필 이미지" />`;
    }
}

function setupEventListeners() {
    const form = document.getElementById('guestbook-form');
    const messageTextarea = document.getElementById('message');
    const cancelButton = document.getElementById('cancelButton');
    
    form.addEventListener('submit', handleFormSubmit);
    
    messageTextarea.addEventListener('input', handleMessageInput);
    
    cancelButton.addEventListener('click', () => {
        window.history.back();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
}

function handleMessageInput(event) {
    const message = event.target.value;
    const charCount = message.length;
    const charCountElement = document.getElementById('char-count');
    const charCounter = charCountElement.parentElement;
    const previewMessage = document.getElementById('preview-message');
    
    charCountElement.textContent = charCount;
    
    charCounter.className = 'char-counter';
    if (charCount > 900) {
        charCounter.classList.add('warning');
    }
    if (charCount > 1000) {
        charCounter.classList.add('error');
    }
    
    if (message.trim()) {
        previewMessage.textContent = message;
        previewMessage.className = 'preview-message';
    } else {
        previewMessage.textContent = '메시지를 입력하면 여기에 미리보기가 표시됩니다.';
        previewMessage.className = 'preview-message empty';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const message = document.getElementById('message').value.trim();
    const submitButton = document.getElementById('submitButton');
    
    if (!message) {
        new NoticeBox('메시지를 입력해주세요.', 'error').show();
        return;
    }
    
    if (message.length > 1000) {
        new NoticeBox('메시지는 1000자를 초과할 수 없습니다.', 'error').show();
        return;
    }
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>전송 중...';
    
    try {
        const response = await apiClient.post(`/api/v1/guestbook/${targetUserId}`, { message });
        const result = await response.json();
        
        if (result.success) {
            new NoticeBox('방명록이 성공적으로 작성되었습니다!', 'success').show();
            
            setTimeout(() => {
                window.location.href = `/${targetUserId}`;
            }, 1500);
        } else {
            throw new Error(result.message || '방명록 작성에 실패했습니다.');
        }
        
    } catch (error) {
        console.error('방명록 작성 실패:', error);
        
        let errorMessage = '방명록 작성에 실패했습니다.';
        
        if (error.message.includes('자신의 방명록')) {
            errorMessage = '자신의 방명록에는 메시지를 남길 수 없습니다.';
        } else if (error.message.includes('로그인')) {
            errorMessage = '로그인이 필요합니다.';
            setTimeout(() => window.location.href = '/login', 2000);
        } else if (error.message.includes('사용자를 찾을 수 없습니다')) {
            errorMessage = '사용자를 찾을 수 없습니다.';
        }
        
        new NoticeBox(errorMessage, 'error').show();
        
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<span class="material-symbols-outlined">send</span>방명록 남기기';
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-container').style.display = 'flex';
    document.getElementById('error-message').textContent = message;
}

document.addEventListener('DOMContentLoaded', initializePage); 