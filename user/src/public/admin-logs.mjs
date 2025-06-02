import escape from './module/escape.js';
import logApi from './module/logApi.js';
import NoticeBox from './module/notice.js';
import WebSocketClient from './module/websocket.js';

class LogPageState {
    constructor() {
        this.currentPage = 1;
        this.currentView = 'table';
        this.isRealTimeMonitoring = false;
        this.realTimeWebSocket = null;
        this.currentUserData = null;
        this.filterPresets = JSON.parse(
            localStorage.getItem('adminLogFilterPresets') || '[]'
        );
        this.filters = this.getDefaultFilters();
    }

    getDefaultFilters() {
        return {
            page: 1,
            limit: 10,
            status: '',
            userId: '',
            route: '',
            ip: '',
            dateFrom: '',
            dateTo: ''
        };
    }

    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.currentPage = 1;
    }

    resetFilters() {
        this.filters = this.getDefaultFilters();
        this.currentPage = 1;
    }
}

const state = new LogPageState();

const handleApiResponse = (data) => {
    if (!data.success) {
        throw new Error(data.message || '알 수 없는 오류가 발생했습니다.');
    }
    return data;
};

async function loadLogStatistics() {
    try {
        const data = await logApi.getStatistics();
        handleApiResponse(data);
        updateStatisticsDisplay(data.recent_24h_statistics);
    } catch (error) {
        console.error('통계 로딩 실패:', error);
        new NoticeBox('통계 데이터를 불러오는데 실패했습니다.', 'error').show();
    }
}

function updateStatisticsDisplay(stats) {
    const elements = {
        'total-requests-stat': stats.total_requests || 0,
        'success-requests-stat': stats.successful_requests || 0,
        'failed-requests-stat': stats.failed_requests || 0,
        'pending-requests-stat': stats.pending_requests || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value.toLocaleString();
    });

    const total = stats.total_requests || 0;
    const success = stats.successful_requests || 0;
    const failed = stats.failed_requests || 0;

    const successRate =
        total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
    const failedRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';

    const successRateEl = document.getElementById('success-rate-percent');
    const failedRateEl = document.getElementById('failed-rate-percent');

    if (successRateEl) successRateEl.textContent = `${successRate}%`;
    if (failedRateEl) failedRateEl.textContent = `${failedRate}%`;
}

async function loadLogs(page = 1) {
    try {
        const options = {
            ...state.filters,
            page
        };

        const data = await logApi.getLogs(options);
        handleApiResponse(data);

        if (state.currentView === 'table') {
            displayLogsTable(data.logs);
        } else {
            displayLogsCards(data.logs);
        }

        displayPagination(data.pagination);
        state.currentPage = page;
    } catch (error) {
        console.error('로그 로딩 실패:', error);
        new NoticeBox('로그를 불러오는데 실패했습니다.', 'error').show();

        const container =
            state.currentView === 'table'
                ? document.getElementById('logs-table')
                : document.getElementById('logs-cards');

        if (container) {
            container.innerHTML =
                '<div class="loading">로그를 불러오는데 실패했습니다.</div>';
        }
    }
}

function displayLogsTable(logs) {
    const container = document.getElementById('logs-table');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML =
            '<div class="loading">표시할 로그가 없습니다.</div>';
        return;
    }

    const header = `
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

    const rows = logs.map((log) => createLogTableRow(log)).join('');
    container.innerHTML = header + rows;
}

function createLogTableRow(log) {
    const requestId = log.request_id
        ? log.request_id.substring(0, 8) + '...'
        : 'N/A';
    const status = log.status || 'unknown';
    const username = log.username || log.login_id || '익명';
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
                        ? `<a href="javascript:void(0)" class="user-link" onclick="showUserDetailModal('${escape(
                              log.user_id
                          )}')">${escape(username)}</a>`
                        : escape(username)
                }
            </div>
            <div><span class="route-text">${escape(route)}</span></div>
            <div class="time-text">${escape(createdAt)}</div>
            <div class="time-text">${escape(updatedAt)}</div>
            <div class="ip-text">${escape(clientIp)}</div>
        </div>
    `;
}

function displayLogsCards(logs) {
    const container = document.getElementById('logs-cards');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML =
            '<div class="loading">표시할 로그가 없습니다.</div>';
        return;
    }

    const cards = logs.map((log) => createLogCard(log)).join('');
    container.innerHTML = cards;
}

function createLogCard(log) {
    const status = log.status || 'unknown';
    const username = log.username || log.login_id || '익명';
    const route = log.route || 'N/A';
    const createdAt = log.created_at
        ? new Date(log.created_at).toLocaleString('ko-KR')
        : 'N/A';

    return `
        <div class="log-card">
            <div class="log-card-header">
                <span class="status-badge ${escape(status)}">${escape(
        status
    )}</span>
                <span class="time-text">${escape(createdAt)}</span>
            </div>
            <div class="log-card-body">
                <div class="log-card-row">
                    <span class="log-card-label">사용자:</span>
                    <span>
                        ${
                            log.user_id
                                ? `<a href="javascript:void(0)" class="user-link" onclick="showUserDetailModal('${escape(
                                      log.user_id
                                  )}')">${escape(username)}</a>`
                                : escape(username)
                        }
                    </span>
                </div>
                <div class="log-card-row">
                    <span class="log-card-label">라우트:</span>
                    <span class="route-text">${escape(route)}</span>
                </div>
                <div class="log-card-row">
                    <span class="log-card-label">IP:</span>
                    <span class="ip-text">${escape(
                        log.client_ip || 'N/A'
                    )}</span>
                </div>
                <div class="log-card-row">
                    <span class="log-card-label">요청 ID:</span>
                    <span title="${escape(log.request_id || '')}">${escape(
        log.request_id ? log.request_id.substring(0, 16) + '...' : 'N/A'
    )}</span>
                </div>
            </div>
        </div>
    `;
}

function displayPagination(pagination) {
    const infoContainer = document.getElementById('pagination-info');
    const paginationContainer = document.getElementById('pagination');

    if (!infoContainer || !paginationContainer) return;

    if (!pagination) {
        infoContainer.textContent = '';
        paginationContainer.innerHTML = '';
        return;
    }

    const { page, limit, total, totalPages } = pagination;
    const start = Math.min((page - 1) * limit + 1, total);
    const end = Math.min(page * limit, total);

    infoContainer.textContent = `${start}-${end} / 총 ${total.toLocaleString()}개`;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';

    if (page > 1) {
        html += `<button class="page-button" onclick="goToPage(${
            page - 1
        })">이전</button>`;
    }

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        html += `<button class="page-button" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += '<span>...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-button ${
            i === page ? 'active' : ''
        }" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span>...</span>';
        html += `<button class="page-button" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    if (page < totalPages) {
        html += `<button class="page-button" onclick="goToPage(${
            page + 1
        })">다음</button>`;
    }

    paginationContainer.innerHTML = html;
}

async function goToPage(page) {
    await loadLogs(page);
}

function switchView(view) {
    const buttons = document.querySelectorAll('.view-button');
    buttons.forEach((btn) => btn.classList.remove('active'));

    const activeButton = document.querySelector(`[data-view="${view}"]`);
    if (activeButton) activeButton.classList.add('active');

    const tableView = document.getElementById('table-view');
    const cardsView = document.getElementById('cards-view');

    if (tableView && cardsView) {
        if (view === 'table') {
            tableView.style.display = 'block';
            cardsView.style.display = 'none';
        } else {
            tableView.style.display = 'none';
            cardsView.style.display = 'block';
        }
    }

    state.currentView = view;
    loadLogs(state.currentPage);
}

function toggleFilters() {
    const content = document.getElementById('filter-content');
    const icon = document.getElementById('filter-toggle-icon');

    if (content && icon) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = 'expand_less';
        } else {
            content.style.display = 'none';
            icon.textContent = 'expand_more';
        }
    }
}

async function applyFilters() {
    const newFilters = {
        status: document.getElementById('status-filter')?.value || '',
        userId: state.filters.userId,
        route: document.getElementById('route-filter')?.value || '',
        ip: document.getElementById('ip-filter')?.value || '',
        dateFrom: document.getElementById('date-from')?.value || '',
        dateTo: document.getElementById('date-to')?.value || '',
        limit: parseInt(document.getElementById('limit-filter')?.value || '10')
    };

    if (!newFilters.userId) {
        const userSearchValue =
            document.getElementById('user-search')?.value.trim() || '';
        if (userSearchValue) {
            newFilters.userId = userSearchValue;
        }
    }

    state.updateFilters(newFilters);
    await loadLogs(1);
    new NoticeBox('필터가 적용되었습니다.', 'success').show();
}

async function resetFilters() {
    state.resetFilters();

    const filterElements = {
        'status-filter': '',
        'user-search': '',
        'route-filter': '',
        'ip-filter': '',
        'date-from': '',
        'date-to': '',
        'limit-filter': '10'
    };

    Object.entries(filterElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });

    await loadLogs(1);
    new NoticeBox('필터가 초기화되었습니다.', 'info').show();
}

async function showUserDetailModal(userId) {
    try {
        const modal = document.getElementById('user-detail-modal');
        const title = document.getElementById('user-detail-title');
        const userInfo = document.getElementById('user-info');
        const userLogs = document.getElementById('user-modal-logs');

        if (!modal || !title || !userInfo || !userLogs) return;

        modal.style.display = 'flex';
        title.textContent = '사용자 로그 상세 (로딩 중...)';
        userInfo.innerHTML =
            '<div class="loading">사용자 정보를 불러오는 중...</div>';
        userLogs.innerHTML = '<div class="loading">로그를 불러오는 중...</div>';

        const data = await logApi.getUserLogs(userId, { limit: 20 });
        handleApiResponse(data);

        state.currentUserData = { userId, logs: data.logs };

        const firstLog = data.logs[0];
        if (firstLog) {
            title.textContent = `${
                firstLog.username || firstLog.login_id || '익명'
            } 사용자 로그`;

            userInfo.innerHTML = `
                <div class="user-info-grid">
                    <div class="user-info-item">
                        <div class="user-info-label">사용자 ID</div>
                        <div class="user-info-value">${escape(userId)}</div>
                    </div>
                    <div class="user-info-item">
                        <div class="user-info-label">닉네임</div>
                        <div class="user-info-value">${escape(
                            firstLog.username || '없음'
                        )}</div>
                    </div>
                    <div class="user-info-item">
                        <div class="user-info-label">로그인 ID</div>
                        <div class="user-info-value">${escape(
                            firstLog.login_id || '없음'
                        )}</div>
                    </div>
                    <div class="user-info-item">
                        <div class="user-info-label">총 로그 수</div>
                        <div class="user-info-value">${data.logs.length}개</div>
                    </div>
                </div>
            `;
        }

        const logRows = data.logs.map((log) => createLogTableRow(log)).join('');
        userLogs.innerHTML = `
            <div class="logs-table-container">
                <div class="logs-table-content">
                    <div class="logs-table">
                        <div class="log-header">
                            <div>요청 ID</div>
                            <div>상태</div>
                            <div>사용자</div>
                            <div>라우트</div>
                            <div>요청 시간</div>
                            <div>응답 시간</div>
                            <div>IP 주소</div>
                        </div>
                        ${logRows}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('사용자 상세 로그 로딩 실패:', error);
        new NoticeBox('사용자 로그를 불러오는데 실패했습니다.', 'error').show();
        closeUserDetailModal();
    }
}

function closeUserDetailModal() {
    const modal = document.getElementById('user-detail-modal');
    if (modal) modal.style.display = 'none';
    state.currentUserData = null;
}

async function exportLogs() {
    try {
        const data = await logApi.exportLogs(state.filters);
        handleApiResponse(data);

        const csvContent = generateCSV(data.logs);
        downloadCSV(csvContent, 'admin-logs-export.csv');

        new NoticeBox('로그가 성공적으로 내보내졌습니다.', 'success').show();
    } catch (error) {
        console.error('로그 내보내기 실패:', error);
        new NoticeBox('로그 내보내기에 실패했습니다.', 'error').show();
    }
}

function exportUserLogs() {
    if (!state.currentUserData) return;

    const csvContent = generateCSV(state.currentUserData.logs);
    downloadCSV(csvContent, `user-${state.currentUserData.userId}-logs.csv`);
    new NoticeBox('사용자 로그가 내보내졌습니다.', 'success').show();
}

function generateCSV(logs) {
    const headers = [
        '요청 ID',
        '상태',
        '사용자 ID',
        '닉네임',
        '라우트',
        '요청 시간',
        '응답 시간',
        'IP 주소'
    ];
    const rows = logs.map((log) => [
        log.request_id || '',
        log.status || '',
        log.user_id || '',
        log.username || '',
        log.route || '',
        log.created_at || '',
        log.updated_at || '',
        log.client_ip || ''
    ]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((field) => `"${field}"`).join(','))
        .join('\n');

    return '\uFEFF' + csvContent; // BOM for UTF-8
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

async function loadPopularRoutes() {
    try {
        const routes = await logApi.getPopularRoutes();
        displayPopularRoutes(routes);
    } catch (error) {
        console.error('인기 라우트 로딩 실패:', error);
        const container = document.getElementById('routes-list');
        if (container) {
            container.innerHTML =
                '<div class="loading">인기 라우트를 불러오는데 실패했습니다.</div>';
        }
    }
}

function displayPopularRoutes(routes) {
    const container = document.getElementById('routes-list');
    if (!container) return;

    if (routes.length === 0) {
        container.innerHTML =
            '<div class="loading">표시할 라우트가 없습니다.</div>';
        return;
    }

    const html = routes
        .map(
            ([route, count]) => `
        <div class="route-item">
            <div class="route-info">
                <div class="route-name">${escape(route)}</div>
                <div class="route-count">${count}회 요청</div>
            </div>
            <div class="count-badge">${count}</div>
        </div>
    `
        )
        .join('');

    container.innerHTML = html;
}

async function loadErrorAnalysis() {
    try {
        const errors = await logApi.getErrorAnalysis();
        displayErrorAnalysis(errors);
    } catch (error) {
        console.error('에러 분석 로딩 실패:', error);
        const container = document.getElementById('errors-list');
        if (container) {
            container.innerHTML =
                '<div class="loading">에러 분석을 불러오는데 실패했습니다.</div>';
        }
    }
}

function displayErrorAnalysis(errors) {
    const container = document.getElementById('errors-list');
    if (!container) return;

    if (errors.length === 0) {
        container.innerHTML =
            '<div class="loading">표시할 에러가 없습니다.</div>';
        return;
    }

    const html = errors
        .map(
            ([route, count]) => `
        <div class="error-item" onclick="showRouteErrorModal('${escape(
            route
        )}')">
            <div class="error-info">
                <div class="error-name">${escape(route)}</div>
                <div class="error-count">${count}회 실패</div>
            </div>
            <div class="count-badge">${count}</div>
        </div>
    `
        )
        .join('');

    container.innerHTML = html;
}

let currentRouteErrorData = null;

async function showRouteErrorModal(route) {
    try {
        const modal = document.getElementById('route-error-modal');
        if (!modal) return;

        modal.style.display = 'flex';

        const title = document.getElementById('route-error-title');
        if (title) title.textContent = `라우트 에러 상세: ${route}`;

        [
            'error-overview',
            'error-statistics',
            'error-timeline',
            'error-logs'
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (element)
                element.innerHTML =
                    '<div class="loading">데이터를 불러오는 중...</div>';
        });

        const data = await logApi.getRouteErrors(route, { page: 1, limit: 10 });
        handleApiResponse(data);

        currentRouteErrorData = data;

        displayErrorOverview(data);
        displayErrorStatistics(data.error_statistics);
        displayErrorTimeline(data.hourly_statistics);
        displayErrorLogs(data.error_logs, data.pagination);
    } catch (error) {
        console.error('라우트 에러 상세 로딩 실패:', error);
        new NoticeBox(
            '라우트 에러 상세 정보를 불러오는데 실패했습니다.',
            'error'
        ).show();
        closeRouteErrorModal();
    }
}

function displayErrorOverview(data) {
    const container = document.getElementById('error-overview');
    if (!container) return;

    const totalErrors = data.pagination.total;
    const uniqueErrorTypes = data.error_statistics.length;
    const lastError =
        data.error_logs.length > 0
            ? new Date(data.error_logs[0].created_at).toLocaleString('ko-KR')
            : '없음';

    container.innerHTML = `
        <h4>에러 개요</h4>
        <div class="error-overview-grid">
            <div class="error-overview-item">
                <div class="error-overview-label">라우트</div>
                <div class="error-overview-value">${escape(data.route)}</div>
            </div>
            <div class="error-overview-item">
                <div class="error-overview-label">총 에러 수</div>
                <div class="error-overview-value">${totalErrors.toLocaleString()}건</div>
            </div>
            <div class="error-overview-item">
                <div class="error-overview-label">에러 유형</div>
                <div class="error-overview-value">${uniqueErrorTypes}가지</div>
            </div>
            <div class="error-overview-item">
                <div class="error-overview-label">최근 에러</div>
                <div class="error-overview-value">${escape(lastError)}</div>
            </div>
        </div>
    `;
}

function displayErrorStatistics(errorStats) {
    const container = document.getElementById('error-statistics');
    if (!container) return;

    if (errorStats.length === 0) {
        container.innerHTML = `
            <h4>에러 통계</h4>
            <div class="loading">에러 통계가 없습니다.</div>
        `;
        return;
    }

    const html = errorStats
        .map(
            (stat) => `
        <div class="error-stat-item">
            <div class="error-stat-info">
                <div class="error-code">코드: ${escape(stat.error_code)}</div>
                <div class="error-message">${escape(stat.error_message)}</div>
                <div class="error-last-time">마지막 발생: ${
                    stat.last_occurrence
                        ? new Date(stat.last_occurrence).toLocaleString('ko-KR')
                        : '알 수 없음'
                }</div>
            </div>
            <div>
                <div class="error-count">${stat.count}</div>
            </div>
        </div>
    `
        )
        .join('');

    container.innerHTML = `
        <h4>에러 통계</h4>
        <div class="error-statistics-list">
            ${html}
        </div>
    `;
}

function displayErrorTimeline(timeStats) {
    const container = document.getElementById('error-timeline');
    if (!container) return;

    if (timeStats.length === 0) {
        container.innerHTML = `
            <h4>시간대별 에러 분석 (최근 24시간)</h4>
            <div class="loading">시간대별 데이터가 없습니다.</div>
        `;
        return;
    }

    const html = timeStats
        .map(
            (stat) => `
        <div class="timeline-item">
            <div class="timeline-hour">${escape(stat.hour)}</div>
            <div class="timeline-count">${stat.error_count}건</div>
        </div>
    `
        )
        .join('');

    container.innerHTML = `
        <h4>시간대별 에러 분석 (최근 24시간)</h4>
        <div class="timeline-chart">
            ${html}
        </div>
    `;
}

function displayErrorLogs(errorLogs, pagination) {
    const container = document.getElementById('error-logs');
    if (!container) return;

    if (errorLogs.length === 0) {
        container.innerHTML = `
            <h4>상세 에러 로그</h4>
            <div class="loading">에러 로그가 없습니다.</div>
        `;
        return;
    }

    const logItems = errorLogs
        .map(
            (log) => `
        <div class="error-log-item">
            <div class="error-log-header">
                <div class="error-log-id">ID: ${escape(
                    log.request_id
                        ? log.request_id.substring(0, 8) + '...'
                        : 'N/A'
                )}</div>
                <div class="error-log-time">${
                    log.created_at
                        ? new Date(log.created_at).toLocaleString('ko-KR')
                        : 'N/A'
                }</div>
            </div>
            <div class="error-log-body">
                <div class="error-log-field">
                    <div class="error-log-label">사용자</div>
                    <div class="error-log-value">${escape(
                        log.username || log.login_id || '익명'
                    )}</div>
                </div>
                <div class="error-log-field">
                    <div class="error-log-label">에러 코드</div>
                    <div class="error-log-value error-code">${escape(
                        log.error_code || 'N/A'
                    )}</div>
                </div>
                <div class="error-log-field">
                    <div class="error-log-label">에러 메시지</div>
                    <div class="error-log-value error-message">${escape(
                        log.error_message || 'N/A'
                    )}</div>
                </div>
                <div class="error-log-field">
                    <div class="error-log-label">IP 주소</div>
                    <div class="error-log-value">${escape(
                        log.client_ip || 'N/A'
                    )}</div>
                </div>
                <div class="error-log-field">
                    <div class="error-log-label">재시도 횟수</div>
                    <div class="error-log-value">${log.retry_count || 0}회</div>
                </div>
            </div>
        </div>
    `
        )
        .join('');

    container.innerHTML = `
        <h4>상세 에러 로그 (${pagination.total.toLocaleString()}건)</h4>
        <div class="error-logs-list">
            ${logItems}
        </div>
    `;
}

function closeRouteErrorModal() {
    const modal = document.getElementById('route-error-modal');
    if (modal) modal.style.display = 'none';
    currentRouteErrorData = null;
}

function showCleanupModal() {
    const modal = document.getElementById('cleanup-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cleanupDate = document.getElementById('cleanup-date');
    if (cleanupDate) {
        cleanupDate.value = thirtyDaysAgo.toISOString().split('T')[0];
    }
}

function hideCleanupModal() {
    const modal = document.getElementById('cleanup-modal');
    if (modal) modal.style.display = 'none';
}

async function performCleanup() {
    const dateElement = document.getElementById('cleanup-date');
    const statusElement = document.getElementById('cleanup-status');

    if (!dateElement) return;

    const date = dateElement.value;
    const status = statusElement?.value || null;

    if (!date) {
        new NoticeBox('삭제 기준 날짜를 선택해주세요.', 'error').show();
        return;
    }

    if (
        !confirm(
            '정말로 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        )
    ) {
        return;
    }

    try {
        const data = await logApi.cleanupLogs(date, status);
        handleApiResponse(data);

        new NoticeBox(
            `${data.deletedCount || 0}개의 로그가 삭제되었습니다.`,
            'success'
        ).show();

        hideCleanupModal();
        await loadLogs(state.currentPage);
        await loadLogStatistics();
    } catch (error) {
        console.error('로그 정리 실패:', error);
        new NoticeBox('로그 정리에 실패했습니다.', 'error').show();
    }
}

function toggleRealTimeMonitoring() {
    if (state.isRealTimeMonitoring) {
        stopRealTimeMonitoring();
    } else {
        startRealTimeMonitoring();
    }
}

function startRealTimeMonitoring() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        new NoticeBox('로그인이 필요합니다.', 'error').show();
        return;
    }

    state.realTimeWebSocket = new WebSocketClient();

    state.realTimeWebSocket.on('connected', () => {
        updateMonitoringStatus(true);
        new NoticeBox('실시간 모니터링이 시작되었습니다.', 'success').show();
    });

    state.realTimeWebSocket.on('disconnected', () => {
        updateMonitoringStatus(false);
        new NoticeBox('실시간 모니터링이 중지되었습니다.', 'warning').show();
    });

    state.realTimeWebSocket.on('error', (error) => {
        console.error('WebSocket 오류:', error);
        updateMonitoringStatus(false);
        new NoticeBox(
            '실시간 모니터링 중 오류가 발생했습니다.',
            'error'
        ).show();
    });

    state.realTimeWebSocket.on('new-log', (message) => {
        handleNewRealTimeLog(message.data);
    });

    state.realTimeWebSocket.connect('/ws/logs', token);
    state.isRealTimeMonitoring = true;
}

function stopRealTimeMonitoring() {
    if (state.realTimeWebSocket) {
        state.realTimeWebSocket.disconnect();
        state.realTimeWebSocket = null;
    }
    updateMonitoringStatus(false);
    state.isRealTimeMonitoring = false;
}

function updateMonitoringStatus(connected) {
    const status = document.getElementById('monitoring-status');
    const icon = document.getElementById('monitoring-icon');
    const text = document.getElementById('monitoring-text');

    if (!status || !icon || !text) return;

    const dot = status.querySelector('.status-dot');
    if (dot) {
        dot.className = connected
            ? 'status-dot connected'
            : 'status-dot disconnected';
    }

    const statusText = status.querySelector('span:last-child');
    if (statusText) {
        statusText.textContent = connected ? '연결됨' : '연결 해제됨';
    }

    icon.textContent = connected ? 'pause' : 'play_arrow';
    text.textContent = connected
        ? '실시간 모니터링 중지'
        : '실시간 모니터링 시작';
}

function handleNewRealTimeLog(data) {
    if (data.logs && Array.isArray(data.logs)) {
        if (state.currentView === 'table') {
            prependLogsToTable(data.logs);
        } else {
            prependLogsToCards(data.logs);
        }
        loadLogStatistics();
    }
}

function prependLogsToTable(logs) {
    const container = document.getElementById('logs-table');
    const header = container?.querySelector('.log-header');
    if (!header) return;

    const newRows = logs.map((log) => createLogTableRow(log)).join('');
    header.insertAdjacentHTML('afterend', newRows);

    const allRows = container.querySelectorAll('.log-row');
    if (allRows.length > 50) {
        for (let i = 50; i < allRows.length; i++) {
            allRows[i].remove();
        }
    }
}

function prependLogsToCards(logs) {
    const container = document.getElementById('logs-cards');
    if (!container) return;

    const newCards = logs.map((log) => createLogCard(log)).join('');
    container.insertAdjacentHTML('afterbegin', newCards);

    const allCards = container.querySelectorAll('.log-card');
    if (allCards.length > 30) {
        for (let i = 30; i < allCards.length; i++) {
            allCards[i].remove();
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleUserSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        hideUserSuggestions();
        return;
    }

    try {
        const response = await apiClient.get(
            `/api/v1/users/admin/search?q=${encodeURIComponent(query)}&limit=5`
        );

        if (response.ok) {
            const data = await response.json();
            showUserSuggestions(data.users || []);
        } else {
            hideUserSuggestions();
        }
    } catch (error) {
        console.error('사용자 검색 실패:', error);
        hideUserSuggestions();
    }
}

function showUserSuggestions(users) {
    const suggestionsContainer = document.getElementById('user-suggestions');
    if (!suggestionsContainer) return;

    if (users.length === 0) {
        hideUserSuggestions();
        return;
    }

    const html = users
        .map(
            (user) => `
        <div class="suggestion-item" onclick="selectUser('${escape(
            user.userid
        )}', '${escape(user.nickname || user.userid)}')">
            <div><strong>${escape(user.nickname || user.userid)}</strong></div>
            <div style="font-size: 0.8rem; color: #6b7280;">${escape(
                user.userid
            )}</div>
        </div>
    `
        )
        .join('');

    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

function hideUserSuggestions() {
    const suggestionsContainer = document.getElementById('user-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

function selectUser(userId, displayName) {
    const userSearchInput = document.getElementById('user-search');
    if (userSearchInput) {
        userSearchInput.value = displayName;
    }
    state.filters.userId = userId;
    hideUserSuggestions();
}

async function refreshLogs() {
    await loadLogs(state.currentPage);
    new NoticeBox('로그가 새로고침되었습니다.', 'info').show();
}

function clearLogDisplay() {
    const container =
        state.currentView === 'table'
            ? document.getElementById('logs-table')
            : document.getElementById('logs-cards');

    if (container) {
        container.innerHTML =
            '<div class="loading">로그 표시가 지워졌습니다.</div>';
    }

    const paginationInfo = document.getElementById('pagination-info');
    const pagination = document.getElementById('pagination');

    if (paginationInfo) paginationInfo.textContent = '';
    if (pagination) pagination.innerHTML = '';

    new NoticeBox('로그 화면이 지워졌습니다.', 'info').show();
}

async function initializePage() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const limitInput = document.getElementById('limit-filter');

    if (dateFromInput)
        dateFromInput.value = yesterday.toISOString().slice(0, 16);
    if (dateToInput) dateToInput.value = now.toISOString().slice(0, 16);
    if (limitInput) limitInput.value = state.filters.limit.toString();

    const userSearchInput = document.getElementById('user-search');
    if (userSearchInput) {
        userSearchInput.addEventListener(
            'input',
            debounce(handleUserSearch, 300)
        );
        userSearchInput.addEventListener('blur', () => {
            setTimeout(() => hideUserSuggestions(), 200);
        });
    }

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.closest('.advanced-filters')) {
            applyFilters();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (state.realTimeWebSocket) {
            state.realTimeWebSocket.disconnect();
        }
    });

    await Promise.all([
        loadLogStatistics(),
        loadLogs(1),
        loadPopularRoutes(),
        loadErrorAnalysis()
    ]);
}

window.loadLogs = loadLogs;
window.goToPage = goToPage;
window.switchView = switchView;
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleRealTimeMonitoring = toggleRealTimeMonitoring;
window.showUserDetailModal = showUserDetailModal;
window.closeUserDetailModal = closeUserDetailModal;
window.showRouteErrorModal = showRouteErrorModal;
window.closeRouteErrorModal = closeRouteErrorModal;
window.exportLogs = exportLogs;
window.exportUserLogs = exportUserLogs;
window.refreshLogs = refreshLogs;
window.clearLogDisplay = clearLogDisplay;
window.selectUser = selectUser;
window.showCleanupModal = showCleanupModal;
window.hideCleanupModal = hideCleanupModal;
window.performCleanup = performCleanup;

document.addEventListener('DOMContentLoaded', initializePage);
