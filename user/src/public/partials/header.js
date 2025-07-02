// Header Script
document.body.classList.add('has-header');

if (!window.headerEventsSetup) {
    window.headerEventsSetup = true;

    function setupDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');

        dropdowns.forEach((dropdown) => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');

            if (toggle && menu) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close other dropdowns
                    dropdowns.forEach((otherDropdown) => {
                        if (otherDropdown !== dropdown) {
                            otherDropdown.classList.remove('open');
                        }
                    });

                    dropdown.classList.toggle('open');
                });
            }
        });

        document.addEventListener('click', () => {
            dropdowns.forEach((dropdown) => {
                dropdown.classList.remove('open');
            });
        });
    }

    function setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const mobileThemeToggle =
            document.getElementById('mobileThemeToggle');

        const desktopIcon = themeToggle?.querySelector(
            '.material-symbols-outlined'
        );
        const mobileIcon = mobileThemeToggle?.querySelector(
            '.material-symbols-outlined'
        );

        function updateThemeIcon(theme) {
            const iconText = theme === 'dark' ? 'light_mode' : 'dark_mode';
            if (desktopIcon) desktopIcon.textContent = iconText;
            if (mobileIcon) mobileIcon.textContent = iconText;
        }

        function toggleTheme() {
            const currentTheme =
                document.documentElement.getAttribute('data-theme') ||
                'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        if (mobileThemeToggle) {
            mobileThemeToggle.addEventListener('click', toggleTheme);
        }

        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    const { default: apiClient } = await import(
                        '/module/api.js'
                    );
                    const response = await apiClient.post('/api/v1/auth/logout');
                    
                    if (response && response.success) {
                        window.location.href = '/login';
                    } else {
                        localStorage.removeItem('accessToken');
                        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                        window.location.href = '/login';
                    }
                } catch (error) {
                    console.error('Logout failed', error);
                    localStorage.removeItem('accessToken');
                    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    window.location.href = '/login';
                }
            });
        }
    }

    async function fetchAndUpdateUserData() {
        if (window.headerUserDataSetup) return;
        window.headerUserDataSetup = true;

        const authPages = ['/login', '/register', '/find-password'];
        if (authPages.includes(window.location.pathname)) {
            updateUIForGuest();
            return;
        }

        const publicPages = ['/help', '/contact', '/feedback', '/notice', '/license'];
        const userProfilePattern = /^\/user\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/activity|\/guestbook)?$/;
        const isPublicPage = publicPages.includes(window.location.pathname) || userProfilePattern.test(window.location.pathname);

        try {
            const { default: apiClient } = await import('/module/api.js');
            const data = await apiClient.get('/api/v1/auth/me');
            
            if (!data || !data.user) {
                throw new Error('사용자 정보를 가져올 수 없습니다.');
            }
            
            const user = data.user;

            document
                .querySelectorAll('.user-name')
                .forEach((el) => (el.textContent = user.nickname));
            const userRole =
                user.authority === 'admin' ? '관리자' : '사용자';
            document
                .querySelectorAll('.user-role')
                .forEach((el) => (el.textContent = userRole));

            const notificationBadge = document.querySelector(
                '.notification-badge'
            );
            if (notificationBadge) {
                const count = user.notificationCount || 0;
                notificationBadge.textContent = count;
                notificationBadge.style.display =
                    count > 0 ? 'inline' : 'none';
            }

            const adminMenuItem = document.getElementById('admin-menu-item');
            if (adminMenuItem) {
                adminMenuItem.style.display =
                    user.authority === 'admin' ? 'block' : 'none';
            }

            const avatarDiv = document.querySelector('.user-avatar');
            if (avatarDiv && user.profileImage) {
                avatarDiv.innerHTML = `<img src="${user.profileImage}" alt="${user.nickname}님의 프로필 사진" class="profile-picture">`;
            }

            document.dispatchEvent(
                new CustomEvent('userLoaded', { detail: { user } })
            );
        } catch (error) {
            console.error('Header user data update failed:', error);
            if (isPublicPage) {
                console.log('공개 페이지에서 인증 실패, 게스트 UI 표시');
            }
            updateUIForGuest();
        }
    }

    function updateUIForGuest() {
        document
            .querySelectorAll('.user-name')
            .forEach((el) => (el.textContent = '게스트'));
        document
            .querySelectorAll('.user-role')
            .forEach((el) => (el.textContent = '로그인 필요'));

        const avatarDiv = document.querySelector('.user-avatar');
        if (avatarDiv) {
            avatarDiv.innerHTML = `<span class="material-symbols-outlined">person</span>`;
        }

        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.innerHTML = `
                <li>
                    <a href="/login" class="dropdown-link">
                        <span class="material-symbols-outlined">login</span>
                        <span>로그인</span>
                    </a>
                </li>
            `;
        }
    }

    function setupNotifications() {
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                console.log('알림 버튼 클릭됨');
            });
        }
    }

    function setupHeaderScroll() {
        let lastScrollY = window.scrollY;
        let ticking = false;
        const header = document.querySelector('.main-header');
        if (!header) return;

        function updateHeader() {
            const scrollY = window.scrollY;
            const scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
            const scrollDelta = Math.abs(scrollY - lastScrollY);

            if (scrollY === 0) {
                header.classList.remove('header-hidden');
            } else if (
                scrollY > 50 &&
                scrollDirection === 'up' &&
                scrollDelta > 2
            ) {
                header.classList.add('header-hidden');
            } else if (scrollDirection === 'down' && scrollDelta > 1) {
                header.classList.remove('header-hidden');
            }

            if (scrollY > 50) {
                header.classList.add('header-shadow');
            } else {
                header.classList.remove('header-shadow');
            }

            lastScrollY = scrollY;
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick, { passive: true });

        let touchStartY = 0;
        let touchEndY = 0;

        window.addEventListener(
            'touchstart',
            (e) => {
                touchStartY = e.changedTouches[0].screenY;
            },
            { passive: true }
        );

        window.addEventListener(
            'touchend',
            (e) => {
                touchEndY = e.changedTouches[0].screenY;
                const touchDelta = touchStartY - touchEndY;

                if (Math.abs(touchDelta) > 50) {
                    if (touchDelta < 0) {
                        header.classList.add('header-hidden');
                    } else {
                        header.classList.remove('header-hidden');
                    }
                }
            },
            { passive: true }
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupDropdowns();
            setupThemeToggle();
            setupLogout();
            fetchAndUpdateUserData();
            setupNotifications();
            setupHeaderScroll();
        });
    } else {
        setupDropdowns();
        setupThemeToggle();
        setupLogout();
        fetchAndUpdateUserData();
        setupNotifications();
        setupHeaderScroll();
    }
} 