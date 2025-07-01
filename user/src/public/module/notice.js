import Animation from './animation.js';
import escape from './escape.js';

class NoticeBox {
    static activeNotices = [];
    constructor(message, type, displayImage = null) {
        this.id = Math.random().toString(36).substring(2, 15);
        this.noticeBox = document.createElement('div');
        this.message = escape(message);
        this.type = escape(type);
        this.displayImage = displayImage;
        this.noticeBox.innerHTML = this.#noticeBoxSegement();
        this.noticeBox.addEventListener('click', () => {
            this.#destroy();
        });
        this.#styleNoticeBox(this.#getColorForType(this.type));
        this.noticeBox.classList.add(`notice-box-${this.type}`);

        switch (type) {
            case 'success':
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            case 'warning':
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            case 'error':
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            default:
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
        }
    }

    show() {
        const noticeContainer = document.querySelector('.notice-container');
        noticeContainer.appendChild(this.noticeBox);
        NoticeBox.activeNotices.push(this);

        NoticeBox.activeNotices.forEach((notice, index) => {
            notice.noticeBox.style.bottom = `${10 + index * 110}px`;
        });
        if (NoticeBox.activeNotices.length > 1) {
            const oldestNotice = NoticeBox.activeNotices.shift();
            oldestNotice.#destroy();
            NoticeBox.activeNotices.forEach((notice, index) => {
                notice.noticeBox.style.bottom = `${10 + index * 110}px`;
            });
        }

        const appearDuration = 200;
        const disappearDuration = 200;
        const displayDuration = 3000;

        this.animation.play(appearDuration, disappearDuration, displayDuration);

        setTimeout(() => {
            setTimeout(() => {
                this.#destroy();
            }, displayDuration);
        }, displayDuration + appearDuration + disappearDuration);
    }

    #destroy() {
        this.noticeBox.remove();
        NoticeBox.activeNotices = NoticeBox.activeNotices.filter(
            (notice) => notice.id !== this.id
        );
        NoticeBox.activeNotices.forEach((notice, index) => {
            notice.noticeBox.style.bottom = `${10 + index * 110}px`;
        });
    }

    #styleNoticeBox(backgroundColor) {
        const styleId = `notice-box-style-${this.type}`;
        if (document.getElementById(styleId)) {
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.innerHTML = `
            .notice-box-${this.type} {
                position: fixed;
                right: 10px;    
                width: 300px;
                height: 100px;
                background-color: ${backgroundColor};
                color: white;
                border-radius: 10px;
                box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
                padding: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
            }
        `;
        document.head.appendChild(styleElement);
    }

    #getColorForType(type) {
        switch (type) {
            case 'success':
                return '#4CAF50';
            case 'warning':
                return '#FFC107';
            case 'error':
                return '#F44336';
            default:
                return '#007bff';
        }
    }

    #noticeBoxSegement() {
        return `
        <div class="notice-box-${this.type}" id="${this.id}">
            <div class="notice-box-${this.type}-icon">
                ${
                    this.displayImage
                        ? `<img src="${this.displayImage}" alt="displayImage" width="100px" height="100px">`
                        : ''
                }
            </div>
            <div class="notice-box-${this.type}-content">
                ${this.type.toUpperCase()}<br>
                ${this.message}
            </div>
        </div>
        `;
    }

    static success(message, displayImage = null) {
        const notice = new NoticeBox(message, 'success', displayImage);
        notice.show();
        return notice;
    }

    static error(message, displayImage = null) {
        const notice = new NoticeBox(message, 'error', displayImage);
        notice.show();
        return notice;
    }

    static warning(message, displayImage = null) {
        const notice = new NoticeBox(message, 'warning', displayImage);
        notice.show();
        return notice;
    }

    static info(message, displayImage = null) {
        const notice = new NoticeBox(message, 'info', displayImage);
        notice.show();
        return notice;
    }
}

export default NoticeBox;
