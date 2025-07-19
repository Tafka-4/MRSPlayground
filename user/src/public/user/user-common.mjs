export function setupUserPage(targetUserId) {
    const mobileProfileHeader = document.querySelector('.mobile-profile-header');
    let lastScrollTop = 0;

    function throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    function handleScroll() {
        if (!mobileProfileHeader) return;
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > lastScrollTop && scrollTop > 80) {
            mobileProfileHeader.classList.add('header-hidden');
        } else {
            mobileProfileHeader.classList.remove('header-hidden');
        }

        if (scrollTop > 80) {
            mobileProfileHeader.classList.add('header-shadow');
        } else {
            mobileProfileHeader.classList.remove('header-shadow');
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }

    window.addEventListener('scroll', throttle(handleScroll, 100), {
        passive: true,
    });
    
    const menuToggle = document.querySelector('.profile-menu-toggle');
    const navContainer = document.querySelector('.profile-navigation-container');
    const navOverlay = document.querySelector('.profile-nav-overlay');
    const navClose = document.querySelector('.profile-nav-close');

    if (menuToggle && navContainer && navOverlay && navClose) {
        menuToggle.addEventListener('click', () => {
            navContainer.classList.add('open');
            navOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        const closeNav = () => {
            navContainer.classList.remove('open');
            navOverlay.classList.remove('open');
            document.body.style.overflow = '';
        };

        navOverlay.addEventListener('click', closeNav);
        navClose.addEventListener('click', closeNav);
    }


    const path = window.location.pathname;
    const navItems = document.querySelectorAll('.profile-nav-item');
    navItems.forEach((item) => {
        const page = item.getAttribute('data-page');
        if (page) {
            let href = `/user/${targetUserId}`;
            if (page !== 'profile') {
                href += `/${page}`;
            }
            item.setAttribute('href', href);
            
            if (path === href) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });

    const container = document.querySelector('.container');
    if (container && path.includes('guestbook')) {
        container.style.maxWidth = '100%';
    }
} 