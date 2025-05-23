import Animation from './animation.js';

class NoticeBox {
    static activeNotices = []; // 활성화된 알림창 배열
    constructor(message, type) {
        this.id = Math.random().toString(36).substring(2, 15);
        this.noticeBox = document.createElement('div');
        this.noticeBox.innerHTML = this.#noticeBoxSegement(message, type, this.id);
        this.noticeBox.style.cssText = this.#styleNoticeBox(type);
        this.noticeBox.addEventListener('click', () => {
            this.#destroy();
        });
        switch (type) {
            case 'success':
                this.noticeBox.classList.add('success')
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            case 'warning':
                this.noticeBox.classList.add('warning');
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            case 'error':
                this.noticeBox.classList.add('error');
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
            default:
                this.noticeBox.classList.add('info');
                this.animation = new Animation(this.noticeBox, 'easeInOut');
                break;
        }
    }
    

    show() {
        const noticeContainer = document.querySelector(".notice-container");
        noticeContainer.appendChild(this.noticeBox);
        NoticeBox.activeNotices.push(this);

        NoticeBox.activeNotices.forEach((notice, index) => {
            notice.noticeBox.style.bottom = `${10 + (index * 110)}px`;
        });
        if (NoticeBox.activeNotices.length > 1) {
            const oldestNotice = NoticeBox.activeNotices.shift();
            oldestNotice.#destroy();
            NoticeBox.activeNotices.forEach((notice, index) => {
                notice.noticeBox.style.bottom = `${10 + (index * 110)}px`;
            });
        }

        const appearDuration = 200;
        const disappearDuration = 200;
        const displayDuration = 2000;

        this.animation.play(appearDuration, disappearDuration);
        
        setTimeout(() => {
            setTimeout(() => {
                this.#destroy();
            }, appearDuration + disappearDuration);
        }, displayDuration);
    }

    #hideNotice() {
        this.noticeBox.style.display = 'none';
    }

    #destroy() {
        this.noticeBox.remove();
        NoticeBox.activeNotices = NoticeBox.activeNotices.filter(notice => notice.id !== this.id);
        NoticeBox.activeNotices.forEach((notice, index) => {
            notice.noticeBox.style.bottom = `${10 + (index * 110)}px`;
        });
    }

    #styleNoticeBox(type) {
        let backgroundColor;
        switch (type) {
            case 'success':
                backgroundColor = '#4CAF50';
                break;
            case 'warning':
                backgroundColor = '#FFC107';
                break;
            case 'error':
                backgroundColor = '#F44336';
                break;
            default:
                backgroundColor = '#fff';
                break;
        }
        return `
            position: fixed;
            bottom: 10px;
            right: 10px;    
            width: 300px;
            height: 100px;
            background-color: ${backgroundColor};
            border-radius: 10px;
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    }

    #noticeBoxSegement(message, type, id) {
        return `
        <div class="notice-box-${type}" id="${id}">
            <div class="message">${message}</div>
            <div class="close">X</div>
        </div>
        `
    }
}

export default NoticeBox;
