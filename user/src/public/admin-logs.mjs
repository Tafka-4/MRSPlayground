import escape from './module/escape.js';
import { apiClient } from './module/api.js';

let currentPage = 1;
let currentFilters = {
    status: '',
    userId: '',
    limit: 10
};

let autoRefreshInterval = null;
let isAutoRefreshActive = true;

function showNotice(message, type = 'info') {
    const notice = document.createElement('div');
    notice.style.cssText = `
        background-color: ${
            type === 'success'
                ? '#4CAF50'
                : type === 'error'
                ? '#f47c7c'
                : '#2196F3'
        };
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    notice.textContent = message;
    document.querySelector('.notice-container').appendChild(notice);

    setTimeout(() => {
        notice.remove();
    }, 3000);
}

async function loadLogStatistics() {
    try {
        const response = await apiClient.get(
            '/api/v1/logs/admin/logs/statistics'
        );

        if (!response.ok) {
            throw new Error('로그 통계를 불러올 수 없습니다.');
        }

        const data = await response.json();
        const stats = data.recent_24h_statistics;

        document.getElementById('total-requests-stat').textContent =
            stats.total_requests?.toLocaleString() || '0';
        document.getElementById('success-requests-stat').textContent =
            stats.successful_requests?.toLocaleString() || '0';
        document.getElementById('failed-requests-stat').textContent =
            stats.failed_requests?.toLocaleString() || '0';
        document.getElementById('pending-requests-stat').textContent =
            stats.pending_requests?.toLocaleString() || '0';

        const total = stats.total_requests || 0;
        const success = stats.successful_requests || 0;
        const failed = stats.failed_requests || 0;

        const successRate =
            total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
        const failedRate =
            total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';

        document.getElementById(
            'success-rate-percent'
        ).textContent = `${successRate}%`;
        document.getElementById(
            'failed-rate-percent'
        ).textContent = `${failedRate}%`;
    } catch (error) {
        console.error('로그 통계 로딩 실패:', error);
        showNotice('로그 통계를 불러오는데 실패했습니다.', 'error');
    }
}

async function loadLogs(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: currentFilters.limit.toString(),
            ...(currentFilters.status && { status: currentFilters.status }),
            ...(currentFilters.userId && { userId: currentFilters.userId })
        });

        const response = await apiClient.get(
            `/api/v1/logs/admin/logs?${params}`
        );

        if (!response.ok) {
            throw new Error('로그를 불러올 수 없습니다.');
        }

        const data = await response.json();
        displayLogs(data.logs);
        displayPagination(data.pagination);
    } catch (error) {
        console.error('로그 로딩 실패:', error);
        showNotice('로그를 불러오는데 실패했습니다.', 'error');
        document.getElementById('logs-table').innerHTML =
            '<div class="loading">로그를 불러오는데 실패했습니다.</div>';
    }
}

function displayLogs(logs) {
    const logsTable = document.getElementById('logs-table');

    if (!logs || logs.length === 0) {
        logsTable.innerHTML =
            '<div class="loading">표시할 로그가 없습니다.</div>';
        return;
    }

    const logHeader = `
        <div class="log-header">
            <div>요청 ID</div>
            <div>상태</div>
            <div>사용자</div>
            <div>라우트</div>
            <div>요청 시간</div>
            <div>응답 시간</div>
            <div>IP 주소</div>
        </div>
    `;

    const logRows = logs
        .map((log) => {
            const requestId = log.request_id
                ? log.request_id.substring(0, 8) + '...'
                : 'N/A';
            const status = log.status || 'unknown';
            const username = log.username || log.user_id || '익명';
            const route = log.route || 'N/A';
            const createdAt = log.created_at
                ? new Date(log.created_at).toLocaleString('ko-KR')
                : 'N/A';
            const updatedAt = log.updated_at
                ? new Date(log.updated_at).toLocaleString('ko-KR')
                : 'N/A';
            const clientIp = log.client_ip || 'N/A';

            return `
            <div class="log-row">
                <div title="${escape(log.request_id || '')}">${escape(
                requestId
            )}</div>
                <div><span class="status-badge ${escape(status)}">${escape(
                status
            )}</span></div>
                <div>
                    ${
                        log.user_id
                            ? `<a href="/${escape(
                                  log.user_id
                              )}" class="user-link" target="_blank">${escape(
                                  username
                              )}</a>`
                            : escape(username)
                    }
                </div>
                <div><span class="route-text">${escape(route)}</span></div>
                <div class="time-text">${escape(createdAt)}</div>
                <div class="time-text">${escape(updatedAt)}</div>
                <div class="ip-text">${escape(clientIp)}</div>
            </div>
        `;
        })
        .join('');

    logsTable.innerHTML = logHeader + logRows;
}

function displayPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');

    if (!pagination || pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const { page, totalPages } = pagination;
    let paginationHTML = '';

    if (page > 1) {
        paginationHTML += `<button class="page-button" onclick="goToPage(${
            page - 1
        })">이전</button>`;
    }

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        paginationHTML += `<button class="page-button" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span>...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="page-button ${
            i === page ? 'active' : ''
        }" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span>...</span>`;
        }
        paginationHTML += `<button class="page-button" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    if (page < totalPages) {
        paginationHTML += `<button class="page-button" onclick="goToPage(${
            page + 1
        })">다음</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;
}

async function loadPopularRoutes() {
    try {
        const response = await apiClient.get(
            '/api/v1/logs/admin/logs/statistics'
        );

        if (!response.ok) {
            throw new Error('인기 라우트를 불러올 수 없습니다.');
        }

        const data = await response.json();
        const routes = data.route_statistics || [];

        const routesList = document.getElementById('routes-list');

        if (routes.length === 0) {
            routesList.innerHTML =
                '<div class="loading">표시할 라우트가 없습니다.</div>';
            return;
        }

        const routesHTML = routes
            .map(
                (route) => `
            <div class="route-item">
                <div class="route-info">
                    <div class="route-name">${escape(route.route)}</div>
                    <div class="route-count">요청 수: ${route.count}회</div>
                </div>
                <div class="count-badge">${route.count}</div>
            </div>
        `
            )
            .join('');

        routesList.innerHTML = routesHTML;
    } catch (error) {
        console.error('인기 라우트 로딩 실패:', error);
        showNotice('인기 라우트를 불러오는데 실패했습니다.', 'error');
    }
}

async function loadErrorAnalysis() {
    try {
        const response = await apiClient.get(
            '/api/v1/logs/admin/logs/statistics'
        );

        if (!response.ok) {
            throw new Error('에러 분석을 불러올 수 없습니다.');
        }

        const data = await response.json();
        const errors = data.error_statistics || [];

        const errorsList = document.getElementById('errors-list');

        if (errors.length === 0) {
            errorsList.innerHTML =
                '<div class="loading">표시할 에러가 없습니다.</div>';
            return;
        }

        const errorsHTML = errors
            .map(
                (error) => `
            <div class="error-item">
                <div class="error-info">
                    <div class="error-code">HTTP ${escape(
                        error.error_code
                    )}</div>
                    <div class="error-count">발생 횟수: ${error.count}회</div>
                </div>
                <div class="count-badge">${error.count}</div>
            </div>
        `
            )
            .join('');

        errorsList.innerHTML = errorsHTML;
    } catch (error) {
        console.error('에러 분석 로딩 실패:', error);
        showNotice('에러 분석을 불러오는데 실패했습니다.', 'error');
    }
}

function applyFilters() {
    currentFilters.status = document.getElementById('status-filter').value;
    currentFilters.userId = document.getElementById('user-filter').value.trim();
    currentFilters.limit = parseInt(
        document.getElementById('limit-filter').value
    );

    currentPage = 1;
    loadLogs(currentPage);
    showNotice('필터가 적용되었습니다.', 'success');
}

function resetFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('user-filter').value = '';
    document.getElementById('limit-filter').value = '10';

    currentFilters = {
        status: '',
        userId: '',
        limit: 10
    };

    currentPage = 1;
    loadLogs(currentPage);
    showNotice('필터가 초기화되었습니다.', 'success');
}

function refreshLogs() {
    loadLogs(currentPage);
    loadLogStatistics();
    showNotice('로그가 새로고침되었습니다.', 'success');
}

function goToPage(page) {
    currentPage = page;
    loadLogs(page);
}

function toggleAutoRefresh() {
    const icon = document.getElementById('auto-refresh-icon');
    const text = document.getElementById('auto-refresh-text');

    if (isAutoRefreshActive) {
        clearInterval(autoRefreshInterval);
        icon.textContent = 'play_arrow';
        text.textContent = '자동 새로고침 시작';
        isAutoRefreshActive = false;
        showNotice('자동 새로고침이 중지되었습니다.', 'info');
    } else {
        autoRefreshInterval = setInterval(() => {
            loadLogs(currentPage);
            loadLogStatistics();
        }, 10000); // 10초마다 새로고침
        icon.textContent = 'pause';
        text.textContent = '자동 새로고침 중지';
        isAutoRefreshActive = true;
        showNotice('자동 새로고침이 시작되었습니다. (10초 간격)', 'success');
    }
}

function showCleanupModal() {
    document.getElementById('cleanup-modal').style.display = 'flex';

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    document.getElementById('cleanup-date').value = sevenDaysAgo
        .toISOString()
        .split('T')[0];
}

function hideCleanupModal() {
    document.getElementById('cleanup-modal').style.display = 'none';
}

async function performCleanup() {
    const date = document.getElementById('cleanup-date').value;
    const status = document.getElementById('cleanup-status').value;

    if (!date) {
        showNotice('삭제 기준 날짜를 선택해주세요.', 'error');
        return;
    }

    try {
        const response = await apiClient.delete(
            '/api/v1/logs/admin/logs/cleanup',
            {
                before_date: date,
                ...(status && { status })
            }
        );

        if (!response.ok) {
            throw new Error('로그 정리에 실패했습니다.');
        }

        const result = await response.json();
        hideCleanupModal();
        showNotice(
            `${result.deleted_count}개의 로그가 삭제되었습니다.`,
            'success'
        );

        loadLogs(1);
        loadLogStatistics();
    } catch (error) {
        console.error('로그 정리 실패:', error);
        showNotice('로그 정리에 실패했습니다.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLogStatistics();
    loadLogs(1);
    loadPopularRoutes();
    loadErrorAnalysis();

    toggleAutoRefresh();
});

window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.refreshLogs = refreshLogs;
window.goToPage = goToPage;
window.toggleAutoRefresh = toggleAutoRefresh;
window.showCleanupModal = showCleanupModal;
window.hideCleanupModal = hideCleanupModal;
window.performCleanup = performCleanup;
window.loadPopularRoutes = loadPopularRoutes;
window.loadErrorAnalysis = loadErrorAnalysis;
