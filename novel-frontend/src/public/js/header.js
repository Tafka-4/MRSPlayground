document.addEventListener('DOMContentLoaded', async function() {
    const { default: apiClient } = await import('/module/api.js');
    const header = document.querySelector('.main-header');
    const dropdowns = document.querySelectorAll('.dropdown');
    const themeToggle = document.getElementById('themeToggle');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminMenuItem = document.getElementById('admin-menu-item');
    
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    function updateHeader() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            header.classList.add('header-shadow');
        } else {
            header.classList.remove('header-shadow');
        }
        
        if (currentScrollY > lastScrollY && currentScrollY > 150) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.classList.remove('open');
                    }
                });
                
                dropdown.classList.toggle('open');
            });
        }
    });
    
    document.addEventListener('click', function() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    });
    
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    function getCurrentTheme() {
        return localStorage.getItem('theme') || 
               (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const icon = theme === 'dark' ? 'light_mode' : 'dark_mode';
        if (themeToggle) {
            themeToggle.querySelector('.material-symbols-outlined').textContent = icon;
        }
        if (mobileThemeToggle) {
            mobileThemeToggle.querySelector('.material-symbols-outlined').textContent = icon;
        }
    }
    
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', toggleTheme);
    }
    
    setTheme(getCurrentTheme());
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await apiClient.post('/api/v1/auth/logout');
                localStorage.removeItem('accessToken');
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
    
    async function ensureAccessToken() {
        let token = localStorage.getItem('accessToken');
        if (token) return token;
        try {
            const refreshed = await apiClient.post('/api/v1/auth/refresh');
            const access = refreshed?.data?.accessToken || refreshed?.accessToken;
            if (access) {
                localStorage.setItem('accessToken', access);
                return access;
            }
        } catch {}
        return null;
    }

    async function checkUserRole() {
        try {
            let token = localStorage.getItem('accessToken');
            if (!token) {
                token = await ensureAccessToken();
            }
            if (!token) return;

            const doMe = async (bearer) => apiClient.get('/api/v1/auth/me', { headers: { 'Authorization': `Bearer ${bearer}` } });

            try {
                const data = await doMe(token);
                const role = data?.data?.user?.authority || data?.user?.authority || data?.authority || data?.role;
                if ((role === 'admin' || role === 'bot') && adminMenuItem) {
                    adminMenuItem.style.display = 'block';
                }
            } catch (e) {}
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    }

    async function fetchAndUpdateUserData() {
        try {
            let token = localStorage.getItem('accessToken');
            if (!token) token = await ensureAccessToken();
            if (!token) return;

            const me = await apiClient.get('/api/v1/auth/me', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
            const user = me?.data?.user || me?.user || {};

            if (user && (user.nickname || user.username)) {
                const name = user.nickname || user.username;
                document.querySelectorAll('.user-name').forEach((el) => (el.textContent = name));
            }

            const role = user.authority === 'admin' ? '관리자' : '사용자';
            document.querySelectorAll('.user-role').forEach((el) => (el.textContent = role));

            const notificationBadge = document.querySelector('.notification-badge');
            if (notificationBadge) {
                const count = user.notificationCount || 0;
                notificationBadge.textContent = count;
                notificationBadge.style.display = count > 0 ? 'inline' : 'none';
            }

            if ((user.authority === 'admin' || user.authority === 'bot') && adminMenuItem) {
                adminMenuItem.style.display = 'block';
            }
        } catch (e) {
            // no-op
        }
    }
    
    (async () => {
        try {
            if (!localStorage.getItem('accessToken')) await ensureAccessToken();
            if (localStorage.getItem('accessToken')) checkUserRole();
            fetchAndUpdateUserData();
        } catch {}
    })();
    
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .dropdown-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.startsWith(href) && href !== '/') {
            link.classList.add('active');
        }
    });
});
