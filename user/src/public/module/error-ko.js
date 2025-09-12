export const errorMessages = {
    // Common Errors
    'Network error': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
    'API request failed': '요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
    'Not Found': '요청하신 리소스를 찾을 수 없습니다.',
    'Internal Server Error': '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Bad Request': '잘못된 요청입니다.',
    'Unauthorized': '인증이 필요합니다. 다시 로그인해주세요.',
    'Forbidden': '이 작업에 대한 권한이 없습니다.',
    'Token has expired': '세션이 만료되었습니다. 다시 로그인해주세요.',

    // User & Auth Errors
    'All fields are required': '모든 필수 항목을 입력해주세요.',
    'User not found': '사용자를 찾을 수 없습니다.',
    'Invalid credentials': '아이디 또는 비밀번호가 올바르지 않습니다.',
    'Invalid current password': '현재 비밀번호가 올바르지 않습니다.',
    'Email and code are required': '이메일과 인증 코드를 입력해주세요.',
    'Invalid verification code': '인증 코드가 올바르지 않습니다.',
    'Email verified successfully': '이메일 인증이 완료되었습니다.',
    'Verification email sent': '인증 이메일을 발송했습니다.',
    'Password changed successfully': '비밀번호가 성공적으로 변경되었습니다.',
    'You cannot write a guestbook entry for yourself.': '자기 자신에게 방명록을 작성할 수 없습니다.',
    'You are not authorized to edit this entry.': '이 항목을 수정할 권한이 없습니다.',
    'You are not authorized to delete this entry.': '이 항목을 삭제할 권한이 없습니다.',
    
    // Validation Errors
    'Title, type, and description are required': '제목, 유형, 설명은 필수 항목입니다.',
};

export const translateError = (message) => {
    return errorMessages[message] || message || '알 수 없는 오류가 발생했습니다.';
}; 