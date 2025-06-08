export * from './buttons/index.js';
export * from './badges/index.js';
export * from './cards/index.js';
export * from './headers/index.js';
export * from './tables/index.js';
export * from './modals/index.js';

// Buttons
export { 
    createButton,
    createDarkModeToggleButton,
    createPasswordToggleButton,
    createLogoutButton,
    createAdminButton,
    createEditButton,
    createDeleteButton,
    createSaveButton,
    createCancelButton,
    createConfirmButton,
    createLoadingButton,
    createButtonGroup 
} from './buttons/index.js';

// Badges
export { 
    createBadge, 
    createVerificationBadge, 
    createRoleBadge,
    createStatusBadge 
} from './badges/index.js';

// Cards
export { 
    createCard, 
    createUserProfileCard, 
    createStatsCard, 
    createNotificationCard, 
    createEmptyStateCard, 
    createCardGrid 
} from './cards/index.js';

// Headers
export { 
    createPageHeader, 
    createBreadcrumb, 
    createNavbar, 
    createUserMenu, 
    createSearchBar, 
    createNotificationHeader 
} from './headers/index.js';

// Modals
export { 
    createModal, 
    createConfirmModal, 
    createConfirmCancelModal,
    createFormModal,
    createLoadingModal,
    createImageModal, 
    showModal,
    showSuccess,
    showError,
    showWarning
} from './modals/index.js';

// Tables
export { 
    createTable, 
    createUserTable, 
    createLogTable,
    createPagination 
} from './tables/index.js';

export function initializeComponents() {
    const root = document.documentElement;
    
    if (!getComputedStyle(root).getPropertyValue('--primary-color')) {
        root.style.setProperty('--primary-color', 'rgb(10, 10, 10)');
        root.style.setProperty('--secondary-color', 'rgb(100, 100, 100)');
        root.style.setProperty('--success-color', '#28a745');
        root.style.setProperty('--warning-color', '#eea73c');
        root.style.setProperty('--error-color', '#f47c7c');
        root.style.setProperty('--border-color', 'rgb(200, 200, 200)');
        root.style.setProperty('--background-color', 'rgb(240, 240, 240)');
        root.style.setProperty('--card-background', 'white');
        root.style.setProperty('--border-radius', '0.5rem');
        root.style.setProperty('--shadow', '0 4px 6px rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--transition', '0.2s ease');
    }

    if (!document.querySelector('link[href*="material-symbols"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        document.head.appendChild(link);
    }

    if (!document.querySelector('link[href*="ONE-Mobile-POP"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=ONE+Mobile+POP:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
    }

    console.log('✅ Component library initialized');
}

export function toggleDarkMode(isDark = null) {
    if (isDark === null) {
        isDark = !document.documentElement.hasAttribute('data-theme') || 
                 document.documentElement.getAttribute('data-theme') !== 'dark';
    }
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
    
    window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: isDark ? 'dark' : 'light' } 
    }));
}

export function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    toggleDarkMode(isDark);
}

export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

export function setTheme(theme = {}) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
}

function setupGlobalComponents() {
    window.Components = {
        initializeComponents,
        toggleDarkMode,
        loadSavedTheme,
        getCurrentTheme,
        setTheme
    };
    
    console.log('✅ Global Components object initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeComponents();
        loadSavedTheme();
        setupGlobalComponents();
    });
} else {
    initializeComponents();
    loadSavedTheme();
    setupGlobalComponents();
} 