document.addEventListener('DOMContentLoaded', function() {
    const scrollToTop = document.getElementById('scrollToTop');
    
    if (scrollToTop) {
        let isScrolling = false;
        
        function toggleScrollButton() {
            if (window.scrollY > 300) {
                scrollToTop.classList.add('visible');
            } else {
                scrollToTop.classList.remove('visible');
            }
        }
        
        function onScroll() {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    toggleScrollButton();
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }
        
        window.addEventListener('scroll', onScroll);
        
        scrollToTop.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        toggleScrollButton();
    }
    
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        if (!link.hasAttribute('rel')) {
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
    
    const featureTags = document.querySelectorAll('.feature-tag');
    featureTags.forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            const feature = this.textContent.trim();
            
            const routes = {
                '아카이브': '/novel',
                '커뮤니티': '/community',
                '마연회콘': '/emojis',
                '마법연구소': '/research'
            };
            
            if (routes[feature]) {
                window.location.href = routes[feature];
            }
        });
    });
    
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-text');
    copyrightElements.forEach(element => {
        const text = element.textContent;
        if (text && !text.includes(currentYear.toString())) {
            element.textContent = text.replace(/\d{4}/, currentYear.toString());
        }
    });
});

const style = document.createElement('style');
style.textContent = `
    .scroll-to-top {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 48px;
        height: 48px;
        background-color: var(--purple-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
    }
    
    .scroll-to-top.visible {
        opacity: 1;
        visibility: visible;
    }
    
    .scroll-to-top:hover {
        background-color: var(--purple-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }
    
    .scroll-to-top .material-symbols-outlined {
        font-size: 1.5rem;
    }
    
    @media (max-width: 768px) {
        .scroll-to-top {
            width: 40px;
            height: 40px;
            bottom: 1.5rem;
            right: 1.5rem;
        }
        
        .scroll-to-top .material-symbols-outlined {
            font-size: 1.25rem;
        }
    }
`;
document.head.appendChild(style);