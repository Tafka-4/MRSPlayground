function createInput({
    id,
    label,
    type = 'text',
    placeholder = '',
    icon,
    validation,
    isTextarea = false
}) {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    inputGroup.id = `${id}-group`;

    if (label) {
        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;
        labelEl.textContent = label;
        inputGroup.appendChild(labelEl);
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';

    if (icon && !isTextarea) {
        const iconEl = document.createElement('span');
        iconEl.className = 'material-symbols-outlined icon';
        iconEl.textContent = icon;
        inputWrapper.appendChild(iconEl);
    }

    const inputEl = isTextarea
        ? document.createElement('textarea')
        : document.createElement('input');

    if (!isTextarea) {
        inputEl.type = type;
    } else {
        inputEl.rows = 4;
    }

    inputEl.id = id;
    inputEl.name = id;
    inputEl.placeholder = placeholder;
    if (icon && !isTextarea) {
        inputEl.classList.add('has-icon');
    }

    inputWrapper.appendChild(inputEl);
    inputGroup.appendChild(inputWrapper);

    if (validation) {
        const validationMsg = document.createElement('div');
        validationMsg.className = 'validation-message';
        validationMsg.textContent = validation.message;
        inputGroup.appendChild(validationMsg);

        inputEl.addEventListener('input', () => {
            if (validation.pattern.test(inputEl.value)) {
                inputGroup.classList.remove('invalid');
            } else {
                inputGroup.classList.add('invalid');
            }
        });
    }

    return inputGroup;
}

export { createInput };
