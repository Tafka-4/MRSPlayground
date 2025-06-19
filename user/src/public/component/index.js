/**
 * @file Component Library Entry Point
 * @description 모든 UI 컴포넌트를 통합하고, 테마 관리 및 초기화와 같은 전역 기능을 제공하는 메인 파일입니다.
 * 이 파일을 통해 각 컴포넌트를 개별적으로 또는 전체적으로 가져와 사용할 수 있습니다.
 * @module components/index
 */

import {
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

import {
    createBadge,
    createVerificationBadge,
    createRoleBadge,
    createStatusBadge
} from './badges/index.js';

import {
    createCard,
    createUserProfileCard,
    createStatsCard,
    createNotificationCard,
    createEmptyStateCard,
    createCardGrid
} from './cards/index.js';

import {
    createTable,
    createUserTable,
    createLogTable,
    createPagination
} from './tables/index.js';

import {
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

import { createInput } from './input/index.js';

/**
 * 컴포넌트 라이브러리의 필수 초기화를 수행합니다.
 * CSS 변수(테마 색상, 폰트 등)를 설정하고, 필요한 외부 폰트(Material Symbols, ONE Mobile POP)를 동적으로 로드합니다.
 * 페이지 로드 시 자동으로 호출됩니다.
 */
function initializeComponents() {
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
        link.href =
            'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        document.head.appendChild(link);
    }

    if (!document.getElementById('one-mobile-pop-font-style')) {
        const style = document.createElement('style');
        style.id = 'one-mobile-pop-font-style';
        style.textContent = `
            @font-face {
                font-family: 'ONE-Mobile-POP';
                src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/ONE-Mobile-POP.woff')
                    format('woff');
                font-weight: normal;
                font-style: normal;
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('component-input-style')) {
        const link = document.createElement('link');
        link.id = 'component-input-style';
        link.rel = 'stylesheet';
        link.href = '/component/style/input.css';
        document.head.appendChild(link);
    }

    if (!document.getElementById('component-buttons-style')) {
        const link = document.createElement('link');
        link.id = 'component-buttons-style';
        link.rel = 'stylesheet';
        link.href = '/component/style/buttons.css';
        document.head.appendChild(link);
    }

    console.log('✅ Component library initialized');
    
    setupThemeToggle();
}

/**
 * 다크 모드와 라이트 모드를 전환합니다.
 * 사용자의 선택을 `localStorage`에 저장하여 다음 방문 시에도 유지되도록 합니다.
 *
 * @param {boolean|null} [isDark=null] - `true`이면 다크 모드, `false`이면 라이트 모드로 설정합니다. `null`이면 현재 상태를 반전시킵니다.
 */
function toggleTheme() {
    const currentTheme =
        document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

/**
 * `localStorage`에 저장된 테마 설정을 불러와 적용합니다.
 * 저장된 설정이 없으면 사용자의 시스템 설정을 따릅니다.
 * 페이지 로드 시 자동으로 호출됩니다.
 */
function loadSavedTheme() {
    const theme = localStorage.getItem('theme');
    if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

/**
 * 현재 적용된 테마를 반환합니다.
 * @returns {string} 현재 테마 이름 ('dark' 또는 'light').
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * CSS 변수를 동적으로 설정하여 라이브러리의 테마를 커스터마이징합니다.
 * @param {object} theme - CSS 변수 이름(키)과 값으로 이루어진 객체. (e.g., `{ 'primary-color': 'blue' }`)
 */
function setTheme(theme = {}) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });
}

/**
 * 테마 토글 버튼에 이벤트 리스너를 추가합니다.
 * @private
 */
function setupThemeToggle() {
    const themeToggleButton = document.querySelector('#theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
}

// 자동 초기화 로직
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeComponents();
        loadSavedTheme();
    });
} else {
    initializeComponents();
    loadSavedTheme();
}

export {
    // General
    initializeComponents,
    loadSavedTheme,
    getCurrentTheme,
    setTheme,
    toggleTheme,
    // Buttons
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
    createButtonGroup,
    // Badges
    createBadge,
    createVerificationBadge,
    createRoleBadge,
    createStatusBadge,
    // Cards
    createCard,
    createUserProfileCard,
    createStatsCard,
    createNotificationCard,
    createEmptyStateCard,
    createCardGrid,
    // Tables
    createTable,
    createUserTable,
    createLogTable,
    createPagination,
    // Modals
    createModal,
    createConfirmModal,
    createConfirmCancelModal,
    createFormModal,
    createLoadingModal,
    createImageModal,
    showModal,
    showSuccess,
    showError,
    showWarning,
    // Input
    createInput
};
