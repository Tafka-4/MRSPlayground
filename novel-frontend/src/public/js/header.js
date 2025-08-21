document.addEventListener('DOMContentLoaded', function() {
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
                const response = await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
    
    async function checkUserRole() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            
            const response = await fetch('/api/v1/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.role === 'admin' && adminMenuItem) {
                    adminMenuItem.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    }
    
    if (localStorage.getItem('accessToken')) {
        checkUserRole();
    }
    
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .dropdown-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.startsWith(href) && href !== '/') {
            link.classList.add('active');
        }
    });
});
