class Animation {
    constructor(target, animationType) {
        this.target = target;
        this.animationType = animationType || 'linear';
        this.target.classList.add('animation');
    }

    #linear(start, end, duration) {
        const range = end - start;
        let startTime = null;

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const currentValue = start + range * progress;

            this.#apply('transform', currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    #easeInOut(appearDuration, disappearDuration) {
        const noticeWidth = this.target.offsetWidth;
        this.#linear(noticeWidth, 0, appearDuration);
        setTimeout(() => {
            this.#linear(0, noticeWidth + 100, disappearDuration);
        }, appearDuration + 500);
    }

    #shake(strength, duration) {
        const range = strength * 2;
        const step = range / duration;
        const result = [];
        const start = -strength;

        for (let i = 0; i < duration; i++) {
            let dx = start + step * i;
            let dy = Math.sin(dx) * strength;
            result.push(`translate(${dx}px, ${dy}px)`);
        }

        this.#apply('transform', result);
    }

    #apply(property, value) {
        if (property === 'transform') {
            this.target.style.transform = `translateX(${value}px)`;
        } else {
            this.target.style[property] = value;
        }
    }

    play(...args) {
        switch (this.animationType) {
            case 'linear':
                this.#linear(...args);
                break;
            case 'shake':
                this.#shake(...args);
                break;
            case 'easeInOut':
                this.#easeInOut(...args);
                break;
            default:
                this.#linear(...args);
        }
    }

    kill() {
        this.target.classList.remove('animation');
        this.target.remove();
    }
}

export default Animation;