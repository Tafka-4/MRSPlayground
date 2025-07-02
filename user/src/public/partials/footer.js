// Footer Script
if (!window.footerEventsSetup) {
    window.footerEventsSetup = true;

    function setupScrollToTop() {
        const scrollButton = document.getElementById('scrollToTop');
        if (!scrollButton) return;

        function toggleScrollButton() {
            if (window.scrollY > 200) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', toggleScrollButton);

        scrollButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        toggleScrollButton();
    }

    function setupExternalLinks() {
        const externalLinks = document.querySelectorAll('.external-link');
        externalLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                console.log('External link clicked:', link.href);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupScrollToTop();
            setupExternalLinks();
        });
    } else {
        setupScrollToTop();
        setupExternalLinks();
    }
} 