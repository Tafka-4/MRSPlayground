import apiClient from './module/api.js';
import NoticeBox from './module/notice.js';

document.getElementById('verify-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        key: formData.get('key')
    };

    try {
        const response = await apiClient.post('/api/v1/auth/verify', data);

        if (response.ok) {
            new NoticeBox('인증이 완료되었습니다.', 'success').show();
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            const errorData = await response.json();
            const errorMessage =
                errorData.error || '인증에 실패했습니다. 다시 시도해주세요.';
            new NoticeBox(errorMessage, 'error').show();
        }
    } catch (error) {
        console.error('인증 요청 중 오류:', error);
        new NoticeBox(
            '인증 요청 중 오류가 발생했습니다. 다시 시도해주세요.',
            'error'
        ).show();
    }
});
