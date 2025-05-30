document.getElementById('verify-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        verificationCode: formData.get('verificationCode'),
    };
    
    try {
        // 여기에 실제 인증 API 호출 로직을 구현
        console.log('인증 데이터:', data);
        
        // 임시로 성공 메시지 표시
        const notice = document.createElement('div');
        notice.style.cssText = `
            background-color: #4CAF50;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        notice.textContent = '인증이 완료되었습니다.';
        document.querySelector('.notice-container').appendChild(notice);
        
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
    } catch (error) {
        const notice = document.createElement('div');
        notice.style.cssText = `
            background-color: #f47c7c;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        notice.textContent = '인증에 실패했습니다. 다시 시도해주세요.';
        document.querySelector('.notice-container').appendChild(notice);
    }
}); 