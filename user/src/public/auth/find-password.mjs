import api from '../module/api.js';
import Notice from '../module/notice.js';

document.addEventListener('DOMContentLoaded', () => {
    const findPasswordForm = document.getElementById('find-password-form');

    findPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(findPasswordForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await api.post('/api/v1/auth/reset-password-send', data);
            if (response.success) {
                Notice.success('비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.');
                findPasswordForm.reset();
            } else {
                Notice.error(response.message);
            }
        } catch (error) {
            Notice.error(error.message);
        }
    });
});
