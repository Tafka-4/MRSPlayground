import apiClient from '/module/api.js';
import NoticeBox from '/module/notice.js';

document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verify-form');

    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = verifyForm.querySelector('button[type="submit"]');
            const originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner"></span> 인증 중...';

            const formData = new FormData(e.target);
            const data = {
                key: formData.get('key')
            };

            try {
                await apiClient.post('/api/v1/auth/verify', data);

                new NoticeBox('인증이 완료되었습니다. 마이페이지로 이동합니다.', 'success').show();
                setTimeout(() => {
                    window.location.href = '/mypage';
                }, 1000);
            } catch (error) {
                console.error('인증 요청 중 오류:', error);
                let errorMessage = '인증 요청 중 오류가 발생했습니다. 다시 시도해주세요.';
                if (error.message) {
                    errorMessage = error.message;
                }
                new NoticeBox(errorMessage, 'error').show();
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }
        });
    }
});
