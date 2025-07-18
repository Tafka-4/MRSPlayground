import api from '../module/api.js';
import Notice from '../module/notice.js';

document.addEventListener('DOMContentLoaded', () => {
    const findPasswordForm = document.getElementById('findPasswordForm');
    const successMessage = document.getElementById('success-message');
    const goToLoginBtn = document.getElementById('go-to-login');

    if (findPasswordForm) {
        findPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const button = findPasswordForm.querySelector('button[type="submit"]');
            const originalButtonText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> 발송 중...';

            const formData = new FormData(findPasswordForm);
            const data = Object.fromEntries(formData.entries());

            try {
                await api.post('/api/v1/auth/reset-password-send', data);
                
                findPasswordForm.style.display = 'none';
                successMessage.style.display = 'block';

            } catch (error) {
                Notice.error(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                button.disabled = false;
                button.innerHTML = originalButtonText;
            }
        });
    }

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            window.location.href = '/login';
        });
    }
});
