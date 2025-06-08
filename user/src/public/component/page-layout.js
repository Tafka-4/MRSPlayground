import escape from '../module/escape.js';

/**
 * Page layout utilities for common page structures
 */

/**
 * Creates a centered page layout for forms
 */
export function createCenteredLayout() {
    const body = document.body;
    body.className = 'page-centered';

    const container = document.createElement('div');
    container.className = 'form-container';

    return container;
}

/**
 * Creates a scrollable page layout for content pages
 */
export function createScrollableLayout() {
    const body = document.body;
    body.className = 'page-scrollable';

    const container = document.createElement('div');
    container.className = 'container';

    return container;
}

/**
 * Creates a page header with title and optional buttons
 */
export function createPageHeader(options = {}) {
    const { title, buttons = [], className = 'page-header' } = options;

    const header = document.createElement('div');
    header.className = className;

    if (title) {
        const titleElement = document.createElement('h1');
        titleElement.className = 'title';
        titleElement.textContent = title;
        header.appendChild(titleElement);
    }

    if (buttons.length > 0) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'header-buttons';

        buttons.forEach((button) => {
            buttonContainer.appendChild(button);
        });

        header.appendChild(buttonContainer);
    }

    return header;
}

/**
 * Creates a navigation breadcrumb
 */
export function createBreadcrumb(items = []) {
    const nav = document.createElement('nav');
    nav.className = 'breadcrumb';
    nav.setAttribute('aria-label', 'breadcrumb');

    const ol = document.createElement('ol');
    ol.className = 'breadcrumb-list';

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'breadcrumb-item';

        if (index === items.length - 1) {
            // Last item (current page)
            li.className += ' active';
            li.textContent = item.text;
            li.setAttribute('aria-current', 'page');
        } else {
            // Link items
            const link = document.createElement('a');
            link.href = item.href || '#';
            link.textContent = item.text;
            li.appendChild(link);
        }

        ol.appendChild(li);
    });

    nav.appendChild(ol);
    return nav;
}

/**
 * Creates a section with title and content
 */
export function createSection(options = {}) {
    const { title, content, className = 'section' } = options;

    const section = document.createElement('section');
    section.className = className;

    if (title) {
        const titleElement = document.createElement('h2');
        titleElement.className = 'section-title';
        titleElement.textContent = title;
        section.appendChild(titleElement);
    }

    if (content) {
        if (typeof content === 'string') {
            const contentElement = document.createElement('div');
            contentElement.className = 'section-content';
            contentElement.innerHTML = content;
            section.appendChild(contentElement);
        } else if (content instanceof HTMLElement) {
            content.className = content.className
                ? `${content.className} section-content`
                : 'section-content';
            section.appendChild(content);
        }
    }

    return section;
}

/**
 * Creates a card component
 */
export function createCard(options = {}) {
    const { title, content, actions = [], className = 'card' } = options;

    const card = document.createElement('div');
    card.className = className;

    if (title) {
        const header = document.createElement('div');
        header.className = 'card-header';

        const titleElement = document.createElement('h3');
        titleElement.className = 'card-title';
        titleElement.textContent = title;
        header.appendChild(titleElement);

        card.appendChild(header);
    }

    if (content) {
        const body = document.createElement('div');
        body.className = 'card-body';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        card.appendChild(body);
    }

    if (actions.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        actions.forEach((action) => {
            footer.appendChild(action);
        });

        card.appendChild(footer);
    }

    return card;
}

/**
 * Creates a standard modal with consistent styling and behavior
 */
export function createStandardModal(options = {}) {
    const {
        title,
        message,
        variant = 'default', // 'default', 'warning', 'danger', 'success'
        cancelText = '취소',
        confirmText = '확인',
        onCancel = null,
        onConfirm = null,
        closable = true,
        buttonSize = 'large' // 'small', 'medium', 'large'
    } = options;

    // Create action buttons using standard button component
    const actions = [];

    if (onCancel) {
        const cancelButton = createStandardButton({
            text: cancelText,
            variant: 'secondary',
            size: buttonSize,
            onClick: () => {
                modal.remove();
                if (onCancel) onCancel();
            }
        });
        actions.push(cancelButton);
    }

    const confirmButton = createStandardButton({
        text: confirmText,
        variant: variant === 'default' ? 'primary' : variant,
        size: buttonSize,
        onClick: () => {
            modal.remove();
            if (onConfirm) onConfirm();
        }
    });
    actions.push(confirmButton);

    const modal = createModal({
        title,
        content: `<p>${escape(message)}</p>`,
        closable,
        actions
    });

    return modal;
}

/**
 * Get button class based on variant
 */
function getVariantClass(variant) {
    switch (variant) {
        case 'warning':
        case 'danger':
            return 'btn-danger';
        case 'success':
            return 'btn-success';
        case 'primary':
            return 'btn-primary';
        default:
            return 'btn-primary';
    }
}

/**
 * Creates a modal dialog
 */
export function createModal(options = {}) {
    const {
        title,
        content,
        actions = [],
        className = 'modal',
        closable = true
    } = options;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = className;

    // Header
    if (title || closable) {
        const header = document.createElement('div');
        header.className = 'modal-header';

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            header.appendChild(titleElement);
        }

        if (closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'modal-close';
            closeButton.innerHTML =
                '<span class="material-symbols-outlined">close</span>';
            closeButton.addEventListener('click', () => {
                overlay.remove();
            });
            header.appendChild(closeButton);
        }

        modal.appendChild(header);
    }

    // Body
    if (content) {
        const body = document.createElement('div');
        body.className = 'modal-body';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        modal.appendChild(body);
    }

    // Footer
    if (actions.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        actions.forEach((action) => {
            footer.appendChild(action);
        });

        modal.appendChild(footer);
    }

    overlay.appendChild(modal);

    // Close on overlay click
    if (closable) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    return overlay;
}

/**
 * Creates a loading spinner
 */
export function createLoadingSpinner(text = '로딩 중...') {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined spinning';
    icon.textContent = 'progress_activity';

    const textElement = document.createElement('span');
    textElement.textContent = text;

    spinner.appendChild(icon);
    spinner.appendChild(textElement);

    return spinner;
}

/**
 * Creates a simple grid layout
 */
export function createGrid(options = {}) {
    const { columns = 2, gap = '1rem', className = 'grid' } = options;

    const grid = document.createElement('div');
    grid.className = className;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gap = gap;

    return grid;
}

/**
 * Creates a flex container
 */
export function createFlexContainer(options = {}) {
    const {
        direction = 'row',
        justify = 'flex-start',
        align = 'stretch',
        gap = '0',
        wrap = 'nowrap',
        className = 'flex-container'
    } = options;

    const container = document.createElement('div');
    container.className = className;
    container.style.display = 'flex';
    container.style.flexDirection = direction;
    container.style.justifyContent = justify;
    container.style.alignItems = align;
    container.style.gap = gap;
    container.style.flexWrap = wrap;

    return container;
}

/**
 * Page layout manager for consistent layouts
 */
export class PageLayoutManager {
    constructor() {
        this.currentLayout = null;
        this.components = new Map();
    }

    /**
     * Set up basic page layout
     */
    setupLayout(type = 'centered') {
        let container;

        if (type === 'centered') {
            container = createCenteredLayout();
        } else if (type === 'scrollable') {
            container = createScrollableLayout();
        }

        if (container) {
            document.body.appendChild(container);
            this.currentLayout = container;
        }

        return container;
    }

    /**
     * Add component to current layout
     */
    addComponent(name, component) {
        if (this.currentLayout && component instanceof HTMLElement) {
            this.currentLayout.appendChild(component);
            this.components.set(name, component);
        }
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Remove component
     */
    removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.parentNode) {
            component.parentNode.removeChild(component);
            this.components.delete(name);
        }
    }

    /**
     * Clear all components
     */
    clear() {
        if (this.currentLayout) {
            this.currentLayout.innerHTML = '';
            this.components.clear();
        }
    }
}

/**
 * Creates a standard button with consistent styling and behavior
 */
export function createStandardButton(options = {}) {
    const {
        text = '버튼',
        variant = 'primary', // 'primary', 'secondary', 'danger', 'success', 'warning'
        size = 'medium', // 'small', 'medium', 'large'
        outline = false,
        icon = null,
        onClick = null,
        disabled = false,
        className = ''
    } = options;

    const button = document.createElement('button');

    // Base classes
    button.className = `btn ${getButtonVariantClass(
        variant,
        outline
    )} ${getButtonSizeClass(size)} ${className}`.trim();

    // Content
    if (icon && text) {
        button.innerHTML = `<span class="material-symbols-outlined">${escape(
            icon
        )}</span>${escape(text)}`;
    } else if (icon) {
        button.innerHTML = `<span class="material-symbols-outlined">${escape(
            icon
        )}</span>`;
    } else {
        button.textContent = text;
    }

    // Event listener
    if (onClick) {
        button.addEventListener('click', onClick);
    }

    // Disabled state
    if (disabled) {
        button.disabled = true;
    }

    return button;
}

/**
 * Get button variant class based on variant and outline
 */
function getButtonVariantClass(variant, outline) {
    const prefix = outline ? 'btn-outline-' : 'btn-';

    switch (variant) {
        case 'primary':
            return `${prefix}primary`;
        case 'secondary':
            return `${prefix}secondary`;
        case 'danger':
            return `${prefix}danger`;
        case 'success':
            return `${prefix}success`;
        case 'warning':
            return `${prefix}warning`;
        default:
            return `${prefix}primary`;
    }
}

/**
 * Get button size class
 */
function getButtonSizeClass(size) {
    switch (size) {
        case 'small':
            return 'btn-sm';
        case 'large':
            return 'btn-lg';
        case 'medium':
            return 'btn-md';
        default:
            return 'btn-md';
    }
}
