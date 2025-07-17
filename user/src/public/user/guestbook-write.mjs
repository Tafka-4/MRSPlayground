import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';
import { initializeComponents, loadSavedTheme } from '/component/index.js';

class GuestbookWritePage {
    constructor() {
        this.targetUserId = null;
        this.targetUserData = null;
        
        this.cacheElements();
        this.attachEventListeners();
        this.initializePage();
    }

    cacheElements() {
        this.loadingElement = document.getElementById('loading');
        this.errorContainer = document.getElementById('error-container');
        this.guestbookContainer = document.getElementById('guestbook-write-container');
        this.profileImage = document.getElementById('target-profile-image');
        this.username = document.getElementById('target-username');
        this.description = document.getElementById('target-description');
        this.messageTextarea = document.getElementById('message');
        this.charCount = document.getElementById('char-count');
        this.previewMessage = document.getElementById('preview-message');
        this.form = document.getElementById('guestbook-form');
        this.cancelButton = document.getElementById('cancelButton');
        this.submitButton = document.getElementById('submitButton');
    }

    attachEventListeners() {
        this.setupProfileNavigation();
        this.setupMobileHeaderScroll();
        
        this.messageTextarea.addEventListener('input', this.handleMessageInput.bind(this));
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.cancelButton.addEventListener('click', this.handleCancel.bind(this));
    }

    setupProfileNavigation() {
        const profileMenuToggle = document.getElementById('profileMenuToggle');
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavClose = document.getElementById('profileNavClose');
        const profileNavOverlay = document.getElementById('profileNavOverlay');

        if (profileMenuToggle) {
            profileMenuToggle.addEventListener('click', () => {
                profileNavigation.classList.add('active');
                profileNavOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (profileNavClose) {
            profileNavClose.addEventListener('click', this.closeProfileNavigation);
        }

        if (profileNavOverlay) {
            profileNavOverlay.addEventListener('click', this.closeProfileNavigation);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileNavigation.classList.contains('active')) {
                this.closeProfileNavigation();
            }
        });
    }

    closeProfileNavigation() {
        const profileNavigation = document.getElementById('profileNavigation');
        const profileNavOverlay = document.getElementById('profileNavOverlay');
        
        profileNavigation.classList.remove('active');
        profileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    setupMobileHeaderScroll() {
        const mobileHeader = document.querySelector('.mobile-profile-header');
        if (!mobileHeader) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        function updateMobileHeader() {
            const scrollY = window.scrollY;
            const scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
            const scrollDelta = Math.abs(scrollY - lastScrollY);

            if (scrollY === 0) {
                mobileHeader.classList.remove('header-hidden');
            } else if (
                scrollY > 50 &&
                scrollDirection === 'up' &&
                scrollDelta > 2
            ) {
                mobileHeader.classList.add('header-hidden');
            } else if (scrollDirection === 'down' && scrollDelta > 1) {
                mobileHeader.classList.remove('header-hidden');
            }

            if (scrollY > 50) {
                mobileHeader.classList.add('header-shadow');
            } else {
                mobileHeader.classList.remove('header-shadow');
            }

            lastScrollY = scrollY;
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateMobileHeader);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick, { passive: true });

        mobileHeader.addEventListener('touchstart', (e) => {
            requestTick();
        }, { passive: true });

        mobileHeader.addEventListener('touchmove', (e) => {
            requestTick();
        }, { passive: true });
    }

    async initializePage() {
        const pathParts = window.location.pathname.split('/');
        this.targetUserId = pathParts[2];

        try {
            const userResult = await apiClient.get('/api/v1/auth/me');
            
            if (!userResult.success || !userResult.user) {
                throw new Error('로그인이 필요합니다.');
            }
            
            this.currentUser = userResult.user;
            
            if (this.currentUser.userid === this.targetUserId) {
                new NoticeBox('자신의 방명록에는 메시지를 남길 수 없습니다.', 'error').show();
                setTimeout(() => window.location.href = '/mypage/guestbook', 2000);
                return;
            }
            
            await this.loadTargetUserInfo();
            
        } catch (error) {
            console.error('페이지 초기화 실패:', error);
            this.showError(error.message || '페이지를 불러올 수 없습니다.');
        }
    }

    async loadTargetUserInfo() {
        try {
            const response = await apiClient.get(`/api/v1/users/${this.targetUserId}`);
            
            if (!response.success || !response.user) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }
            
            this.targetUser = response.user;
            this.displayTargetUserInfo();
            
        } catch (error) {
            console.error('사용자 정보 로딩 실패:', error);
            throw new Error('사용자 정보를 불러올 수 없습니다.');
        }
    }

    displayTargetUserInfo() {
        this.loadingElement.style.display = 'none';
        this.guestbookContainer.style.display = 'block';
        
        document.getElementById('page-title').textContent = `${this.targetUser.nickname}님의 방명록 작성`;
        document.title = `${this.targetUser.nickname}님의 방명록 작성`;
        
        this.username.textContent = this.targetUser.nickname;
        this.description.textContent = this.targetUser.description || '소개가 없습니다.';
        
        if (this.targetUser.profileImage) {
            this.profileImage.innerHTML = `<img src="${this.targetUser.profileImage}" alt="프로필 이미지" />`;
        }
    }

    handleMessageInput(event) {
        const message = event.target.value;
        const charCount = message.length;
        this.charCount.textContent = charCount;
        
        const charCounter = this.charCount.parentElement;
        charCounter.className = 'char-counter';
        if (charCount > 900) {
            charCounter.classList.add('warning');
        }
        if (charCount > 1000) {
            charCounter.classList.add('error');
        }
        
        if (message.trim()) {
            this.previewMessage.textContent = message;
            this.previewMessage.className = 'preview-message';
        } else {
            this.previewMessage.textContent = '메시지를 입력하면 여기에 미리보기가 표시됩니다.';
            this.previewMessage.className = 'preview-message empty';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const message = this.messageTextarea.value.trim();
        
        if (!message) {
            new NoticeBox('메시지를 입력해주세요.', 'error').show();
            return;
        }
        
        if (message.length > 1000) {
            new NoticeBox('메시지는 1000자를 초과할 수 없습니다.', 'error').show();
            return;
        }
        
        this.submitButton.disabled = true;
        this.submitButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>전송 중...';
        
        try {
            const result = await apiClient.post(`/api/v1/guestbook/${this.targetUserId}`, { message });
            
            if (result.success) {
                new NoticeBox(result.message || '방명록이 성공적으로 작성되었습니다!', 'success').show();
                
                setTimeout(() => {
                    window.location.href = `/user/${this.targetUserId}/guestbook`;
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
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = '<span class="material-symbols-outlined">send</span>방명록 남기기';
        }
    }

    handleCancel() {
        window.history.back();
    }

    showError(message) {
        this.loadingElement.style.display = 'none';
        this.errorContainer.style.display = 'flex';
        document.getElementById('error-message').textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeComponents();
    loadSavedTheme();
    new GuestbookWritePage();
}); 