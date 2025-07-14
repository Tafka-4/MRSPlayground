import escape from '/module/escape.js';
import apiClient from '/module/api.js';
import logApi from '/module/logApi.js';
import NoticeBox from '/module/notice.js';
import WebSocketClient from '/module/websocket.js';

let logMonitoringInterval = null;
let isLogMonitoringActive = false;
let logWebSocket = null;
let keygenWebSocket = null;
let isKeygenMonitoringActive = false;

async function loadDashboardStats() {
    try {
        const userStatsResponse = await apiClient.get(
            '/api/v1/users/admin/statistics'
        );

        const userStats = userStatsResponse.statistics || {
            totalUsers: 0,
            newUsers: 0,
            activeUsers: 0
        };

        document.getElementById('total-users').textContent =
            userStats.totalUsers.toLocaleString();
        document.getElementById('new-users').textContent =
            userStats.newUsers.toLocaleString();
        document.getElementById('active-users').textContent =
            userStats.activeUsers.toLocaleString();

        await loadLogStats();
    } catch (error) {
        console.error('통계 데이터 로딩 실패:', error);
        new NoticeBox('통계 데이터를 불러오는데 실패했습니다.', 'error').show();

        document.getElementById('total-users').textContent = '0';
        document.getElementById('new-users').textContent = '0';
        document.getElementById('active-users').textContent = '0';
    }
}

async function loadLogStats() {
    try {
        const response = await logApi.getStatistics();

        if (!response.success) {
            throw new Error('로그 통계를 불러올 수 없습니다.');
        }

        const stats = response.recent_24h_statistics;

        const totalRequestsEl = document.getElementById('total-requests');
        const successRateEl = document.getElementById('success-rate');
        const failedRequestsEl = document.getElementById('failed-requests');

        if (totalRequestsEl) {
            totalRequestsEl.textContent = (
                stats.total_requests || 0
            ).toLocaleString();
        }

        if (successRateEl) {
            const total = stats.total_requests || 0;
            const success = stats.successful_requests || 0;
            const rate =
                total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
            successRateEl.textContent = `${rate}%`;
        }

        if (failedRequestsEl) {
            failedRequestsEl.textContent = (
                stats.failed_requests || 0
            ).toLocaleString();
        }
    } catch (error) {
        console.error('로그 통계 로딩 실패:', error);
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');

    try {
        const response = await logApi.getLogs({ limit: 5 });

        if (!response.success) {
            throw new Error('최근 활동을 불러올 수 없습니다.');
        }
        const logs = response.logs || [];

        if (logs.length === 0) {
            activityList.innerHTML = `
                <li class="activity-item placeholder">
                    <div class="activity-icon">
                        <span class="material-symbols-outlined">info</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">최근 활동이 없습니다.</div>
                        <div class="activity-time">데이터 없음</div>
                    </div>
                </li>
            `;
            return;
        }

        const activities = logs.map((log) => {
            const username = log.username || log.login_id || '익명 사용자';
            const route = log.route || 'Unknown';
            const method = log.method || 'GET';
            const status = log.status || 'unknown';
            const time = log.created_at
                ? new Date(log.created_at).toLocaleString('ko-KR')
                : '시간 정보 없음';

            let icon = 'info';
            let activityText = '';

            if (route.includes('/auth/login')) {
                icon = 'login';
                activityText = `${username}님이 로그인했습니다.`;
            } else if (route.includes('/auth/register')) {
                icon = 'person_add';
                activityText = `${username}님이 회원가입했습니다.`;
            } else if (route.includes('/auth/logout')) {
                icon = 'logout';
                activityText = `${username}님이 로그아웃했습니다.`;
            } else if (method === 'POST') {
                icon = 'add';
                activityText = `${username}님이 새로운 요청을 생성했습니다.`;
            } else if (method === 'PUT' || method === 'PATCH') {
                icon = 'edit';
                activityText = `${username}님이 데이터를 수정했습니다.`;
            } else if (method === 'DELETE') {
                icon = 'delete';
                activityText = `${username}님이 데이터를 삭제했습니다.`;
            } else {
                icon = 'visibility';
                activityText = `${username}님이 ${route}에 접근했습니다.`;
            }

            if (status === 'failed') {
                icon = 'error';
                activityText += ' (실패)';
            }

            return {
                icon,
                text: activityText,
                time,
                status
            };
        });

        activityList.innerHTML = activities
            .map(
                (activity) => `
                <li class="activity-item">
                    <div class="activity-icon">
                        <span class="material-symbols-outlined">${escape(
                            activity.icon
                        )}</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${escape(
                            activity.text
                        )}</div>
                        <div class="activity-time">${escape(
                            activity.time
                        )}</div>
                    </div>
                </li>
            `
            )
            .join('');
    } catch (error) {
        console.error('최근 활동 로딩 실패:', error);

        activityList.innerHTML = `
            <li class="activity-item placeholder">
                <div class="activity-icon">
                    <span class="material-symbols-outlined">error</span>
                </div>
                <div class="activity-content">
                    <div class="activity-text">활동 데이터를 불러오는데 실패했습니다.</div>
                    <div class="activity-time">오류 발생</div>
                </div>
            </li>
        `;

        new NoticeBox(
            '최근 활동 데이터를 불러오는데 실패했습니다.',
            'error'
        ).show();
    }
}

async function loadRecentLogs() {
    try {
        const data = await logApi.getLogs({ limit: 5 });
        const logs = data.logs || [];
        displayLogs(logs);
    } catch (error) {
        console.error('최근 로그 로딩 실패:', error);
    }
}

function displayLogs(logs, isUpdate = false) {
    const logContainer = document.getElementById('log-container');

    if (logs.length === 0) {
        logContainer.innerHTML = `
            <div class="log-item placeholder">
                <div class="log-icon">
                    <span class="material-symbols-outlined">info</span>
                </div>
                <div class="log-content">
                    <div class="log-text">최근 로그가 없습니다.</div>
                    <div class="log-time">데이터 없음</div>
                </div>
            </div>
        `;
        return;
    }

    const logHTML = logs
        .map((log) => {
            const status = log.status || 'unknown';
            const route = log.route || 'N/A';
            const user = log.username || log.user_id || '익명';
            const time = log.created_at
                ? new Date(log.created_at).toLocaleString('ko-KR')
                : 'N/A';

            const statusIcons = {
                success: 'check_circle',
                failed: 'error'
            };

            const icon = statusIcons[status] || 'help';

            return `
            <div class="log-item ${isUpdate ? 'new-log' : ''}">
                <div class="log-icon">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="log-content">
                    <div class="log-text">${escape(user)} - ${escape(
                route
            )}</div>
                    <div class="log-time">${escape(time)} (${escape(
                status
            )})</div>
                </div>
            </div>
        `;
        })
        .join('');

    if (isUpdate) {
        logContainer.insertAdjacentHTML('afterbegin', logHTML);

        const allLogItems = logContainer.querySelectorAll(
            '.log-item:not(.placeholder)'
        );
        if (allLogItems.length > 5) {
            for (let i = 5; i < allLogItems.length; i++) {
                allLogItems[i].remove();
            }
        }
    } else {
        logContainer.innerHTML = logHTML;
    }
}

function initializeLogWebSocket() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.error('액세스 토큰이 없습니다.');
        new NoticeBox('로그인이 필요합니다.', 'error').show();
        return;
    }

    if (logWebSocket) {
        logWebSocket.disconnect();
        logWebSocket = null;
    }

    logWebSocket = new WebSocketClient();

    logWebSocket.on('connected', () => {
        console.log('로그 WebSocket 연결됨');
        new NoticeBox(
            '실시간 로그 모니터링이 연결되었습니다.',
            'success'
        ).show();
    });

    logWebSocket.on('disconnected', () => {
        console.log('로그 WebSocket 연결 해제됨');
        new NoticeBox(
            '실시간 로그 모니터링 연결이 해제되었습니다.',
            'warning'
        ).show();
    });

    logWebSocket.on('error', (error) => {
        console.error('로그 WebSocket 오류:', error);
        new NoticeBox(
            '실시간 로그 모니터링 중 오류가 발생했습니다.',
            'error'
        ).show();
    });

    logWebSocket.on('auth-success', (message) => {
        console.log('WebSocket 인증 성공:', message.message);
    });

    logWebSocket.on('auth-failed', (message) => {
        console.error('WebSocket 인증 실패:', message.message);
        new NoticeBox(
            `인증 실패: ${message.message || '알 수 없는 오류'}`,
            'error'
        ).show();

        if (logWebSocket) {
            logWebSocket.disconnect();
            logWebSocket = null;
        }

        const icon = document.getElementById('log-toggle-icon');
        const text = document.getElementById('log-toggle-text');
        if (icon && text) {
            icon.textContent = 'play_arrow';
            text.textContent = '시작';
            isLogMonitoringActive = false;
        }
    });

    logWebSocket.on('new-log', (message) => {
        const { data } = message;

        if (data.connected) {
            return;
        }

        if (data.initial) {
            displayLogs(data.logs);
        } else if (data.new) {
            displayLogs(data.logs, true);
        } else if (data.logs) {
            displayLogs(data.logs);
        }
    });

    logWebSocket.connect('/ws/logs', token);
}

function toggleLogMonitoring() {
    const icon = document.getElementById('log-toggle-icon');
    const text = document.getElementById('log-toggle-text');

    if (isLogMonitoringActive) {
        if (logWebSocket) {
            logWebSocket.disconnect();
            logWebSocket = null;
        }

        icon.textContent = 'play_arrow';
        text.textContent = '시작';
        isLogMonitoringActive = false;
        new NoticeBox('실시간 로그 모니터링이 중지되었습니다.', 'info').show();
    } else {
        initializeLogWebSocket();

        icon.textContent = 'pause';
        text.textContent = '중지';
        isLogMonitoringActive = true;
    }
}

function clearLogs() {
    const logContainer = document.getElementById('log-container');
    logContainer.innerHTML = `
        <div class="log-item placeholder">
            <div class="log-icon">
                <span class="material-symbols-outlined">info</span>
            </div>
            <div class="log-content">
                <div class="log-text">로그가 지워졌습니다.</div>
                <div class="log-time">대기 중</div>
            </div>
        </div>
    `;
    new NoticeBox('로그가 지워졌습니다.', 'success').show();
}

function initializeKeygenWebSocket() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        new NoticeBox('로그인이 필요합니다.', 'error').show();
        return;
    }

    if (keygenWebSocket) {
        keygenWebSocket.disconnect();
        keygenWebSocket = null;
    }

    keygenWebSocket = new WebSocketClient();

    keygenWebSocket.on('connected', () => {
        isKeygenMonitoringActive = true;
        updateKeygenToggleButton(true);
        new NoticeBox('실시간 키 모니터링이 연결되었습니다.', 'success').show();
    });

    keygenWebSocket.on('disconnected', (event) => {
        isKeygenMonitoringActive = false;
        updateKeygenToggleButton(false);

        if (event && event.code === 1006) {
            new NoticeBox(
                '연결이 불안정합니다. 자동으로 재연결을 시도합니다.',
                'warning'
            ).show();
        } else {
            new NoticeBox(
                '실시간 키 모니터링 연결이 해제되었습니다.',
                'warning'
            ).show();
        }
    });

    keygenWebSocket.on('error', (error) => {
        console.error('Keygen WebSocket 오류:', error);
        isKeygenMonitoringActive = false;
        updateKeygenToggleButton(false);
        new NoticeBox(
            '실시간 키 모니터링 중 오류가 발생했습니다.',
            'error'
        ).show();
    });

    keygenWebSocket.on('auth-success', (message) => {
        console.log('Keygen WebSocket 인증 성공:', message.message);
    });

    keygenWebSocket.on('auth-failed', (message) => {
        console.error('Keygen WebSocket 인증 실패:', message.message);
        isKeygenMonitoringActive = false;
        updateKeygenToggleButton(false);
        new NoticeBox(
            `키 모니터링 인증 실패: ${message.message || '알 수 없는 오류'}`,
            'error'
        ).show();

        if (keygenWebSocket) {
            keygenWebSocket.disconnect();
            keygenWebSocket = null;
        }
    });

    keygenWebSocket.on('new-key', (message) => {
        const { data } = message;
        if (data && data.key) {
            updateCurrentKeyDisplay(data.key, data.timestamp);
        }
    });

    keygenWebSocket.connect('/ws/keygen', token);
}

function updateKeygenToggleButton(isActive) {
    const toggleBtn = document.getElementById('keygen-toggle-btn');
    const icon = document.getElementById('keygen-toggle-icon');
    const text = document.getElementById('keygen-toggle-text');

    if (toggleBtn && icon && text) {
        if (isActive) {
            toggleBtn.classList.add('active');
            icon.textContent = 'sync_disabled';
            text.textContent = '중지';
        } else {
            toggleBtn.classList.remove('active');
            icon.textContent = 'sync';
            text.textContent = '실시간';
        }
    }
}

function updateCurrentKeyDisplay(key, timestamp) {
    const currentTime = timestamp
        ? new Date(timestamp).toLocaleString('ko-KR')
        : new Date().toLocaleString('ko-KR');

    const subHeaderElement = document.getElementById(
        'current-key-sub-header-text'
    );
    if (subHeaderElement) {
        subHeaderElement.textContent = `키 시점: ${currentTime}`;
        subHeaderElement.style.color = `rgb(100, 100, 100)`;
        subHeaderElement.style.fontStyle = `italic`;
    }

    const currentKeyElement = document.getElementById('current-key');
    if (currentKeyElement) {
        currentKeyElement.style.transition = 'background-color 0.3s ease';
        currentKeyElement.style.backgroundColor = 'rgb(220, 252, 231)';

        currentKeyElement.title = key;
        currentKeyElement.textContent = key;
        currentKeyElement.setAttribute('data-key', key);

        setTimeout(() => {
            currentKeyElement.style.backgroundColor = '';
        }, 1000);
    }
}

async function loadCurrentKey() {
    try {
        const data = await apiClient.get('/api/v1/auth/current-key');
        updateCurrentKeyDisplay(data.key);
    } catch (error) {
        console.error('현재 키 로딩 실패:', error);
        document.getElementById('current-key').textContent = '키 로드 실패';
        document.getElementById('current-key-sub-header-text').textContent =
            '키 로드 실패';
        new NoticeBox('현재 키를 불러오는데 실패했습니다.', 'error').show();
    }
}

async function copyCurrentKey() {
    const currentKeyElement = document.getElementById('current-key');
    const key =
        currentKeyElement?.getAttribute('data-key') ||
        currentKeyElement?.textContent;

    if (!key || key === '로딩 중...' || key === '키 로드 실패') {
        new NoticeBox('복사할 키가 없습니다.', 'warning').show();
        return;
    }

    try {
        await navigator.clipboard.writeText(key);
        new NoticeBox('키가 클립보드에 복사되었습니다.', 'success').show();

        if (currentKeyElement) {
            const originalBackground = currentKeyElement.style.backgroundColor;
            currentKeyElement.style.backgroundColor = 'rgb(250, 250, 250)';
            setTimeout(() => {
                currentKeyElement.style.backgroundColor = originalBackground;
                currentKeyElement.style.color = '';
            }, 300);
        }
    } catch (error) {
        console.error('클립보드 복사 실패:', error);

        new NoticeBox(
            '클립보드 복사에 실패했습니다. 키를 길게 눌러 수동으로 복사해주세요.',
            'error'
        ).show();

        if (currentKeyElement) {
            const originalBackground = currentKeyElement.style.backgroundColor;
            currentKeyElement.style.backgroundColor = 'rgb(239, 68, 68)';
            currentKeyElement.style.color = 'white';
            setTimeout(() => {
                currentKeyElement.style.backgroundColor = originalBackground;
                currentKeyElement.style.color = '';
            }, 300);
        }
    }
}

function toggleKeygenMonitoring() {
    const toggleBtn = document.getElementById('keygen-toggle-btn');
    const icon = document.getElementById('keygen-toggle-icon');
    const text = document.getElementById('keygen-toggle-text');

    if (isKeygenMonitoringActive) {
        if (keygenWebSocket) {
            keygenWebSocket.disconnect();
            keygenWebSocket = null;
        }

        isKeygenMonitoringActive = false;
        updateKeygenToggleButton(false);

        new NoticeBox('실시간 키 모니터링이 중지되었습니다.', 'info').show();
    } else {
        initializeKeygenWebSocket();
    }
}

async function manualRefreshKey() {
    try {
        await loadCurrentKey();
        new NoticeBox('키가 새로고침되었습니다.', 'success').show();
    } catch (error) {
        console.error('수동 키 새로고침 실패:', error);
        new NoticeBox('키 새로고침에 실패했습니다.', 'error').show();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadRecentActivity();
    loadCurrentKey();

    setTimeout(() => {
        initializeKeygenWebSocket();
    }, 1000);
});

window.addEventListener('beforeunload', () => {
    if (logWebSocket) {
        logWebSocket.disconnect();
    }
    if (keygenWebSocket) {
        keygenWebSocket.disconnect();
    }
});

window.loadRecentActivity = loadRecentActivity;
window.toggleLogMonitoring = toggleLogMonitoring;
window.clearLogs = clearLogs;
window.copyCurrentKey = copyCurrentKey;
window.toggleKeygenMonitoring = toggleKeygenMonitoring;
window.manualRefreshKey = manualRefreshKey;
