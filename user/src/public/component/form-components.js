/**
 * Form components utilities for common form elements
 */

/**
 * Creates a form input wrapper with icon and optional visibility toggle
 */
export function createInputWrapper(options = {}) {
    const {
        type = 'text',
        name,
        placeholder = '',
        icon,
        required = false,
        hasVisibilityToggle = false,
        className = ''
    } = options;

    const wrapper = document.createElement('div');
    wrapper.className = `input-wrapper ${className}`;

    // Create icon if provided
    if (icon) {
        const iconElement = document.createElement('span');
        iconElement.className = 'material-symbols-outlined';
        iconElement.textContent = icon;
        wrapper.appendChild(iconElement);
    }

    // Create input
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.placeholder = placeholder;
    input.className = 'form-input';
    input.required = required;
    wrapper.appendChild(input);

    // Add visibility toggle for password inputs
    if (hasVisibilityToggle && type === 'password') {
        const visibilityContainer = document.createElement('div');
        visibilityContainer.className = 'visibility-container';

        const visibilityIcon = document.createElement('span');
        visibilityIcon.className = 'material-symbols-outlined';
        visibilityIcon.textContent = 'visibility';
        visibilityIcon.id = `visibility-${name}`;

        const visibilityOffIcon = document.createElement('span');
        visibilityOffIcon.className = 'material-symbols-outlined';
        visibilityOffIcon.textContent = 'visibility_off';
        visibilityOffIcon.id = `visibility-off-${name}`;
        visibilityOffIcon.style.display = 'none';

        visibilityContainer.appendChild(visibilityIcon);
        visibilityContainer.appendChild(visibilityOffIcon);
        wrapper.appendChild(visibilityContainer);

        // Add toggle functionality
        const toggleVisibility = () => {
            if (input.type === 'password') {
                input.type = 'text';
                visibilityIcon.style.display = 'none';
                visibilityOffIcon.style.display = 'block';
            } else {
                input.type = 'password';
                visibilityIcon.style.display = 'block';
                visibilityOffIcon.style.display = 'none';
            }
        };

        visibilityIcon.addEventListener('click', toggleVisibility);
        visibilityOffIcon.addEventListener('click', toggleVisibility);
    }

    return wrapper;
}

/**
 * Creates a button with consistent styling
 */
export function createButton(options = {}) {
    const {
        text,
        type = 'button',
        className = 'btn btn-primary',
        icon,
        onClick,
        disabled = false
    } = options;

    const button = document.createElement('button');
    button.type = type;
    button.className = className;
    button.disabled = disabled;

    if (icon) {
        const iconElement = document.createElement('span');
        iconElement.className = 'material-symbols-outlined';
        iconElement.textContent = icon;
        button.appendChild(iconElement);
    }

    if (text) {
        const textNode = document.createTextNode(text);
        button.appendChild(textNode);
    }

    if (onClick) {
        button.addEventListener('click', onClick);
    }

    return button;
}

/**
 * Creates a checkbox wrapper with custom styling
 */
export function createCheckbox(options = {}) {
    const { name, id, labelText, checked = false, onChange } = options;

    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.id = id;
    input.checked = checked;

    const label = document.createElement('label');
    label.htmlFor = id;
    label.innerHTML = `<span>${labelText}</span>`;

    wrapper.appendChild(input);
    wrapper.appendChild(label);

    if (onChange) {
        input.addEventListener('change', onChange);
    }

    return wrapper;
}

/**
 * Creates a link with consistent styling
 */
export function createLink(options = {}) {
    const { text, href = '#', className = 'link', onClick } = options;

    const link = document.createElement('a');
    link.href = href;
    link.className = className;
    link.textContent = text;

    if (onClick) {
        link.addEventListener('click', onClick);
    }

    return link;
}

/**
 * Creates a title element
 */
export function createTitle(text, className = 'title') {
    const title = document.createElement('h1');
    title.className = className;
    title.textContent = text;
    return title;
}

/**
 * Creates a subtitle element
 */
export function createSubtitle(text, className = 'subtitle') {
    const subtitle = document.createElement('p');
    subtitle.className = className;
    subtitle.innerHTML = text; // Allow HTML content for links
    return subtitle;
}

/**
 * Creates a divider element
 */
export function createDivider() {
    const divider = document.createElement('div');
    divider.className = 'divider';
    return divider;
}

/**
 * Form validation utilities
 */
export const FormValidators = {
    /**
     * Validates email format
     */
    email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },

    /**
     * Validates password strength
     */
    password: (value) => {
        return {
            minLength: value.length >= 8,
            hasLetter: /[a-zA-Z]/.test(value),
            hasNumber: /[0-9]/.test(value),
            hasSpecialChar: /[!@#$%^&*()_{}]/.test(value),
            isValid:
                value.length >= 8 &&
                /[a-zA-Z]/.test(value) &&
                /[0-9]/.test(value) &&
                /[!@#$%^&*()_{}]/.test(value)
        };
    },

    /**
     * Validates username format
     */
    username: (value) => {
        return !/[^a-zA-Z0-9!@#$%^&*()_{}]/.test(value);
    },

    /**
     * Validates required field
     */
    required: (value) => {
        return value && value.trim().length > 0;
    }
};

/**
 * Form state manager for handling form data and validation
 */
export class FormManager {
    constructor(formElement) {
        this.form = formElement;
        this.fields = new Map();
        this.validators = new Map();
        this.errors = new Map();
    }

    /**
     * Register a field with its validator
     */
    registerField(name, element, validator = null) {
        this.fields.set(name, element);
        if (validator) {
            this.validators.set(name, validator);
        }
    }

    /**
     * Get form data as object
     */
    getData() {
        const data = {};
        for (const [name, element] of this.fields) {
            if (element.type === 'checkbox') {
                data[name] = element.checked;
            } else {
                data[name] = element.value;
            }
        }
        return data;
    }

    /**
     * Set form data from object
     */
    setData(data) {
        for (const [name, value] of Object.entries(data)) {
            const element = this.fields.get(name);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        }
    }

    /**
     * Validate all fields
     */
    validate() {
        this.errors.clear();
        let isValid = true;

        for (const [name, validator] of this.validators) {
            const element = this.fields.get(name);
            const value =
                element.type === 'checkbox' ? element.checked : element.value;

            const result = validator(value);
            if (result !== true) {
                this.errors.set(name, result);
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Get validation errors
     */
    getErrors() {
        return Object.fromEntries(this.errors);
    }

    /**
     * Clear all form fields
     */
    clear() {
        for (const [name, element] of this.fields) {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = '';
            }
        }
        this.errors.clear();
    }
}
