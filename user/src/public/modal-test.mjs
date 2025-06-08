import {
    createModal,
    createStandardModal,
    createStandardButton,
    createCard,
    createLoadingSpinner
} from './component/page-layout.js';
import {
    createInputWrapper,
    FormManager
} from './component/form-components.js';
import {
    createStatsCard,
    createDashboardSection,
    DashboardManager
} from './component/dashboard-components.js';
import NoticeBox from './module/notice.js';

// 전역 함수들
window.showSimpleModal = showSimpleModal;
window.showConfirmModal = showConfirmModal;
window.showWarningModal = showWarningModal;
window.showFormModal = showFormModal;
window.showLoginModal = showLoginModal;
window.showLoadingModal = showLoadingModal;
window.showSuccessNotice = showSuccessNotice;
window.showErrorNotice = showErrorNotice;

function showSimpleModal() {
    const modal = createStandardModal({
        title: '간단한 알림',
        message:
            '이것은 간단한 모달 테스트입니다. 컴포넌트가 잘 작동하는지 확인해보세요!',
        variant: 'default',
        confirmText: '확인',
        onConfirm: () => {
            new NoticeBox('모달이 닫혔습니다!', 'success').show();
        }
    });
    document.body.appendChild(modal);
}

function showConfirmModal() {
    const modal = createStandardModal({
        title: '작업 확인',
        message: '이 작업을 계속하시겠습니까? 이 동작은 되돌릴 수 없습니다.',
        variant: 'primary',
        cancelText: '취소',
        confirmText: '확인',
        onCancel: () => {
            new NoticeBox('작업이 취소되었습니다.', 'info').show();
        },
        onConfirm: () => {
            new NoticeBox('작업이 확인되었습니다.', 'success').show();
        }
    });
    document.body.appendChild(modal);
}

function showWarningModal() {
    const modal = createStandardModal({
        title: '경고',
        message:
            '주의! 이것은 중요한 경고 메시지입니다. 계속 진행하기 전에 신중히 검토해주세요.',
        variant: 'danger',
        cancelText: '취소',
        confirmText: '삭제',
        onCancel: () => {
            new NoticeBox('작업이 취소되었습니다.', 'info').show();
        },
        onConfirm: () => {
            new NoticeBox('항목이 삭제되었습니다.', 'success').show();
        }
    });
    document.body.appendChild(modal);
}

function showFormModal() {
    const formContainer = document.createElement('div');

    const nameInput = createInputWrapper({
        type: 'text',
        name: 'name',
        label: '이름',
        placeholder: '이름을 입력하세요',
        icon: 'person'
    });

    const emailInput = createInputWrapper({
        type: 'email',
        name: 'email',
        label: '이메일',
        placeholder: '이메일을 입력하세요',
        icon: 'email'
    });

    formContainer.appendChild(nameInput);
    formContainer.appendChild(emailInput);

    const formManager = new FormManager();
    formManager.registerField('name', nameInput.querySelector('input'));
    formManager.registerField('email', emailInput.querySelector('input'));

    const modal = createModal({
        title: '사용자 정보 입력',
        content: formContainer,
        actions: [
            createStandardButton({
                text: '취소',
                variant: 'secondary',
                onClick: () => modal.remove()
            }),
            createStandardButton({
                text: '저장',
                variant: 'primary',
                onClick: () => {
                    const data = formManager.getData();
                    if (data.name && data.email) {
                        modal.remove();
                        new NoticeBox(
                            `${data.name}님의 정보가 저장되었습니다!`,
                            'success'
                        ).show();
                    } else {
                        new NoticeBox(
                            '모든 필드를 입력해주세요.',
                            'error'
                        ).show();
                    }
                }
            })
        ]
    });

    document.body.appendChild(modal);
}

function showLoginModal() {
    const formContainer = document.createElement('div');

    const usernameInput = createInputWrapper({
        type: 'text',
        name: 'username',
        label: '사용자명',
        placeholder: '사용자명을 입력하세요',
        icon: 'person'
    });

    const passwordInput = createInputWrapper({
        type: 'password',
        name: 'password',
        label: '비밀번호',
        placeholder: '비밀번호를 입력하세요',
        icon: 'lock'
    });

    formContainer.appendChild(usernameInput);
    formContainer.appendChild(passwordInput);

    const formManager = new FormManager();
    formManager.registerField('username', usernameInput.querySelector('input'));
    formManager.registerField('password', passwordInput.querySelector('input'));

    const modal = createModal({
        title: '로그인',
        content: formContainer,
        actions: [
            createStandardButton({
                text: '취소',
                variant: 'secondary',
                onClick: () => modal.remove()
            }),
            createStandardButton({
                text: '로그인',
                variant: 'primary',
                onClick: () => {
                    const data = formManager.getData();
                    if (data.username && data.password) {
                        modal.remove();
                        new NoticeBox(
                            `${data.username}님, 환영합니다!`,
                            'success'
                        ).show();
                    } else {
                        new NoticeBox(
                            '사용자명과 비밀번호를 모두 입력해주세요.',
                            'error'
                        ).show();
                    }
                }
            })
        ]
    });

    document.body.appendChild(modal);
}

function showLoadingModal() {
    const loadingSpinner = createLoadingSpinner('데이터를 처리 중입니다...');

    const modal = createModal({
        title: '처리 중',
        content: loadingSpinner,
        closable: false
    });

    document.body.appendChild(modal);

    // 3초 후 자동으로 닫기
    setTimeout(() => {
        modal.remove();
        new NoticeBox('처리가 완료되었습니다!', 'success').show();
    }, 3000);
}

function showSuccessNotice() {
    new NoticeBox('성공! 작업이 완료되었습니다.', 'success').show();
}

function showErrorNotice() {
    new NoticeBox('오류가 발생했습니다. 다시 시도해주세요.', 'error').show();
}

function setupCardTests() {
    const cardContainer = document.getElementById('card-container');

    // 기본 카드
    const basicCard = createCard({
        title: '기본 카드',
        content:
            '<p>이것은 기본 카드 컴포넌트입니다.</p><p>제목과 내용, 그리고 액션 버튼을 가질 수 있습니다.</p>',
        actions: [
            createStandardButton({
                text: '액션',
                variant: 'primary',
                size: 'small',
                onClick: () =>
                    new NoticeBox('카드 액션이 실행되었습니다!', 'info').show()
            })
        ]
    });

    cardContainer.appendChild(basicCard);
}

function setupDashboardTests() {
    const dashboardContainer = document.getElementById('dashboard-container');

    // 통계 카드들 생성
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';

    const userStatsCard = createStatsCard({
        title: '총 사용자',
        value: 1247,
        icon: 'people'
    });

    const orderStatsCard = createStatsCard({
        title: '총 주문',
        value: 3642,
        icon: 'shopping_cart'
    });

    const revenueStatsCard = createStatsCard({
        title: '매출',
        value: 125480,
        icon: 'attach_money'
    });

    const growthStatsCard = createStatsCard({
        title: '성장률',
        value: 15.2,
        icon: 'trending_up'
    });

    statsGrid.appendChild(userStatsCard);
    statsGrid.appendChild(orderStatsCard);
    statsGrid.appendChild(revenueStatsCard);
    statsGrid.appendChild(growthStatsCard);

    // 대시보드 섹션으로 감싸기
    const statsSection = createDashboardSection({
        title: '주요 통계',
        content: statsGrid,
        actions: [
            createStandardButton({
                text: '새로고침',
                variant: 'secondary',
                size: 'small',
                icon: 'refresh',
                onClick: () => {
                    // 랜덤 값으로 업데이트
                    updateStatsWithRandomValues();
                    new NoticeBox(
                        '통계가 업데이트되었습니다!',
                        'success'
                    ).show();
                }
            })
        ]
    });

    dashboardContainer.appendChild(statsSection);

    // 대시보드 매니저 테스트
    const dashboardManager = new DashboardManager();
    dashboardManager.addStatsCard('users', {
        title: '활성 사용자',
        value: 342,
        icon: 'person_check'
    });

    function updateStatsWithRandomValues() {
        // 통계 카드들을 랜덤 값으로 업데이트
        const cards = statsGrid.querySelectorAll('.stats-card');
        cards.forEach((card) => {
            const valueElement = card.querySelector('.stats-value');
            if (valueElement) {
                const randomValue = Math.floor(Math.random() * 10000) + 1000;
                valueElement.textContent = randomValue.toLocaleString();
            }
        });
    }
}

// 페이지 로드 시 환영 메시지
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new NoticeBox(
            '모달 테스트 페이지에 오신 것을 환영합니다!',
            'info'
        ).show();
    }, 500);
});
