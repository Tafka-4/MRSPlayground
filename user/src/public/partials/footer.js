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

    function renderServiceFeatures() {
        const container = document.getElementById('service-features');
        if (!container) return;

        const features = Array.isArray(window.__FOOTER_FEATURES)
            ? window.__FOOTER_FEATURES
            : ['아카이브', '커뮤니티', '마연회콘', '마법연구소'];

        container.innerHTML = '';
        const urlMap = {
            '아카이브': 'https://novel.magicresearches.com',
            '커뮤니티': 'https://community.magicresearches.com',
            '마연회콘': 'https://emoji.magicresearches.com',
            '마법연구소': 'https://research.magicresearches.com'
        };

        for (const feature of features) {
            const href = urlMap[feature];
            if (href) {
                const a = document.createElement('a');
                a.className = 'feature-tag';
                a.href = href;
                a.textContent = feature;
                container.appendChild(a);
            } else {
                const span = document.createElement('span');
                span.className = 'feature-tag';
                span.textContent = feature;
                container.appendChild(span);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupScrollToTop();
            setupExternalLinks();
            renderServiceFeatures();
        });
    } else {
        setupScrollToTop();
        setupExternalLinks();
        renderServiceFeatures();
    }
} 