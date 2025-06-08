/**
 * Dashboard-specific components for admin interface
 */

import escape from '../module/escape.js';

/**
 * Creates a statistics card component
 */
export function createStatsCard(options = {}) {
    const {
        title,
        value = '0',
        icon = 'analytics',
        className = 'stats-card'
    } = options;

    const card = document.createElement('div');
    card.className = className;

    card.innerHTML = `
        <div class="stats-icon">
            <span class="material-symbols-outlined">${escape(icon)}</span>
        </div>
        <div class="stats-content">
            <div class="stats-title">${escape(title)}</div>
            <div class="stats-value">${escape(value.toLocaleString())}</div>
        </div>
    `;

    return card;
}

/**
 * Creates an activity item component
 */
export function createActivityItem(options = {}) {
    const { icon = 'info', text, time, status = 'default' } = options;

    const item = document.createElement('li');
    item.className = `activity-item ${status !== 'default' ? status : ''}`;

    item.innerHTML = `
        <div class="activity-icon">
            <span class="material-symbols-outlined">${escape(icon)}</span>
        </div>
        <div class="activity-content">
            <div class="activity-text">${escape(text)}</div>
            <div class="activity-time">${escape(time)}</div>
        </div>
    `;

    return item;
}

/**
 * Creates a log item component
 */
export function createLogItem(options = {}) {
    const {
        user = '익명',
        route = 'N/A',
        status = 'unknown',
        time = 'N/A',
        isNew = false
    } = options;

    const statusIcons = {
        success: 'check_circle',
        failed: 'error',
        unknown: 'help'
    };

    const icon = statusIcons[status] || 'help';

    const item = document.createElement('div');
    item.className = `log-item ${isNew ? 'new-log' : ''}`;

    item.innerHTML = `
        <div class="log-icon">
            <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="log-content">
            <div class="log-text">${escape(user)} - ${escape(route)}</div>
            <div class="log-time">${escape(time)} (${escape(status)})</div>
        </div>
    `;

    return item;
}

/**
 * Creates a toggle button component
 */
export function createToggleButton(options = {}) {
    const {
        id,
        iconActive = 'pause',
        iconInactive = 'play_arrow',
        textActive = '중지',
        textInactive = '시작',
        isActive = false,
        onClick
    } = options;

    const button = document.createElement('button');
    button.className = `toggle-btn ${isActive ? 'active' : ''}`;
    if (id) button.id = id;

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = isActive ? iconActive : iconInactive;

    const text = document.createElement('span');
    text.textContent = isActive ? textActive : textInactive;

    button.appendChild(icon);
    button.appendChild(text);

    if (onClick) {
        button.addEventListener('click', onClick);
    }

    // Store references for easy updating
    button._icon = icon;
    button._text = text;
    button._iconActive = iconActive;
    button._iconInactive = iconInactive;
    button._textActive = textActive;
    button._textInactive = textInactive;

    return button;
}

/**
 * Updates a toggle button state
 */
export function updateToggleButton(button, isActive) {
    if (!button || !button._icon || !button._text) return;

    button.className = `toggle-btn ${isActive ? 'active' : ''}`;
    button._icon.textContent = isActive
        ? button._iconActive
        : button._iconInactive;
    button._text.textContent = isActive
        ? button._textActive
        : button._textInactive;
}

/**
 * Creates a key display component
 */
export function createKeyDisplay(options = {}) {
    const { key = '로딩 중...', timestamp, onCopy } = options;

    const container = document.createElement('div');
    container.className = 'key-display-container';

    const header = document.createElement('div');
    header.className = 'key-display-header';
    header.innerHTML = `
        <h3>현재 키</h3>
        <div class="key-actions">
            <button class="btn btn-small btn-secondary" id="copy-key-btn">
                <span class="material-symbols-outlined">content_copy</span>
                복사
            </button>
            <button class="btn btn-small btn-secondary" id="refresh-key-btn">
                <span class="material-symbols-outlined">refresh</span>
                새로고침
            </button>
        </div>
    `;

    const keyContent = document.createElement('div');
    keyContent.className = 'key-content';
    keyContent.innerHTML = `
        <div class="current-key" id="current-key" data-key="${escape(
            key
        )}" title="${escape(key)}">${escape(key)}</div>
        <div class="key-sub-header" id="current-key-sub-header-text">
            ${
                timestamp
                    ? `키 시점: ${new Date(timestamp).toLocaleString('ko-KR')}`
                    : '키 로드 중...'
            }
        </div>
    `;

    container.appendChild(header);
    container.appendChild(keyContent);

    // Add copy functionality
    const copyBtn = header.querySelector('#copy-key-btn');
    if (copyBtn && onCopy) {
        copyBtn.addEventListener('click', onCopy);
    }

    return container;
}

/**
 * Updates the key display
 */
export function updateKeyDisplay(container, key, timestamp) {
    const keyElement = container.querySelector('#current-key');
    const subHeaderElement = container.querySelector(
        '#current-key-sub-header-text'
    );

    if (keyElement) {
        keyElement.style.transition = 'background-color 0.3s ease';
        keyElement.style.backgroundColor = 'rgb(220, 252, 231)';

        keyElement.title = key;
        keyElement.textContent = key;
        keyElement.setAttribute('data-key', key);

        setTimeout(() => {
            keyElement.style.backgroundColor = '';
        }, 1000);
    }

    if (subHeaderElement) {
        const currentTime = timestamp
            ? new Date(timestamp).toLocaleString('ko-KR')
            : new Date().toLocaleString('ko-KR');

        subHeaderElement.textContent = `키 시점: ${currentTime}`;
        subHeaderElement.style.color = 'rgb(100, 100, 100)';
        subHeaderElement.style.fontStyle = 'italic';
    }
}

/**
 * Creates a dashboard section with header and content
 */
export function createDashboardSection(options = {}) {
    const {
        title,
        content,
        actions = [],
        className = 'dashboard-section'
    } = options;

    const section = document.createElement('section');
    section.className = className;

    if (title) {
        const header = document.createElement('div');
        header.className = 'section-header';

        const titleElement = document.createElement('h2');
        titleElement.className = 'section-title';
        titleElement.textContent = title;
        header.appendChild(titleElement);

        if (actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'section-actions';

            actions.forEach((action) => {
                actionsContainer.appendChild(action);
            });

            header.appendChild(actionsContainer);
        }

        section.appendChild(header);
    }

    if (content) {
        const contentContainer = document.createElement('div');
        contentContainer.className = 'section-content';

        if (typeof content === 'string') {
            contentContainer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            contentContainer.appendChild(content);
        }

        section.appendChild(contentContainer);
    }

    return section;
}

/**
 * Creates a simple list container
 */
export function createListContainer(options = {}) {
    const { id, className = 'list-container', items = [] } = options;

    const container = document.createElement('ul');
    container.className = className;
    if (id) container.id = id;

    items.forEach((item) => {
        if (typeof item === 'string') {
            const li = document.createElement('li');
            li.innerHTML = item;
            container.appendChild(li);
        } else if (item instanceof HTMLElement) {
            container.appendChild(item);
        }
    });

    return container;
}

/**
 * Creates a placeholder item for empty lists
 */
export function createPlaceholderItem(options = {}) {
    const {
        icon = 'info',
        text = '데이터가 없습니다.',
        subtext = '데이터 없음',
        className = 'placeholder'
    } = options;

    const item = document.createElement('li');
    item.className = `activity-item ${className}`;

    item.innerHTML = `
        <div class="activity-icon">
            <span class="material-symbols-outlined">${escape(icon)}</span>
        </div>
        <div class="activity-content">
            <div class="activity-text">${escape(text)}</div>
            <div class="activity-time">${escape(subtext)}</div>
        </div>
    `;

    return item;
}

/**
 * Dashboard manager for organizing dashboard components
 */
export class DashboardManager {
    constructor(container) {
        this.container = container;
        this.sections = new Map();
        this.statsCards = new Map();
    }

    /**
     * Add a statistics card
     */
    addStatsCard(name, options) {
        const card = createStatsCard(options);
        this.statsCards.set(name, card);
        return card;
    }

    /**
     * Update a statistics card value
     */
    updateStatsCard(name, value) {
        const card = this.statsCards.get(name);
        if (card) {
            const valueElement = card.querySelector('.stats-value');
            if (valueElement) {
                valueElement.textContent = value.toLocaleString();
            }
        }
    }

    /**
     * Add a dashboard section
     */
    addSection(name, options) {
        const section = createDashboardSection(options);
        this.sections.set(name, section);
        if (this.container) {
            this.container.appendChild(section);
        }
        return section;
    }

    /**
     * Get a section by name
     */
    getSection(name) {
        return this.sections.get(name);
    }

    /**
     * Clear all content
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.sections.clear();
        this.statsCards.clear();
    }
}
