import apiClient from './api.js';

class LogApiClient {
    constructor() {
        this.baseUrl = '/api/v1';
    }

    /**
     * 로그 조회
     * @param {Object} options - 조회 옵션
     * @param {number} options.page - 페이지 번호
     * @param {number} options.limit - 페이지당 항목 수
     * @param {string} options.status - 상태 필터
     * @param {string} options.userId - 사용자 ID 필터
     * @param {string} options.route - 라우트 필터
     * @param {string} options.ip - IP 필터
     * @param {string} options.dateFrom - 시작 날짜
     * @param {string} options.dateTo - 종료 날짜
     * @param {boolean} options.onlyMine - 내 로그만 조회
     * @param {boolean} options.onlyErrors - 에러 로그만 조회
     * @param {boolean} options.export - 내보내기 모드
     * @returns {Promise<Object>} API 응답
     */
    async getLogs(options = {}) {
        const params = new URLSearchParams();

        const {
            page = 1,
            limit = 10,
            status,
            userId,
            route,
            ip,
            dateFrom,
            dateTo,
            onlyMine = false,
            onlyErrors = false,
            export: isExport = false
        } = options;

        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (status) params.append('status', status);
        if (userId) params.append('userId', userId);
        if (route) params.append('route', route);
        if (ip) params.append('ip', ip);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        if (onlyMine) params.append('onlyMine', 'true');
        if (onlyErrors) params.append('onlyErrors', 'true');
        if (isExport) params.append('export', 'true');

        return await apiClient.get(`${this.baseUrl}/logs?${params}`);
    }

    /**
     * 내 로그 조회
     * @param {Object} options - 조회 옵션
     * @returns {Promise<Object>} API 응답
     */
    async getMyLogs(options = {}) {
        return this.getLogs({ ...options, onlyMine: true });
    }

    /**
     * 에러 로그만 조회
     * @param {Object} options - 조회 옵션
     * @returns {Promise<Object>} API 응답
     */
    async getErrorLogs(options = {}) {
        return this.getLogs({ ...options, onlyErrors: true });
    }

    /**
     * 특정 사용자의 로그 조회
     * @param {string} userId - 사용자 ID
     * @param {Object} options - 추가 옵션
     * @returns {Promise<Object>} API 응답
     */
    async getUserLogs(userId, options = {}) {
        return this.getLogs({ ...options, userId });
    }

    /**
     * 로그 통계 조회
     * @returns {Promise<Object>} 통계 데이터
     */
    async getStatistics() {
        return await apiClient.get(`${this.baseUrl}/logs/statistics`);
    }

    /**
     * 라우트별 에러 상세 조회
     * @param {string} route - 라우트 경로
     * @param {Object} options - 조회 옵션
     * @returns {Promise<Object>} 에러 상세 데이터
     */
    async getRouteErrors(route, options = {}) {
        const { page = 1, limit = 20 } = options;
        const params = new URLSearchParams({
            route: route,
            page: page.toString(),
            limit: limit.toString()
        });

        return await apiClient.get(
            `${this.baseUrl}/logs/route-errors?${params}`
        );
    }

    /**
     * 로그 정리 (삭제)
     * @param {string} beforeDate - 삭제 기준 날짜
     * @param {string} status - 특정 상태만 삭제
     * @returns {Promise<Object>} 삭제 결과
     */
    async cleanupLogs(beforeDate, status = null) {
        const params = new URLSearchParams({ beforeDate });
        if (status) params.append('status', status);

        return await apiClient.delete(
            `${this.baseUrl}/logs/cleanup?${params}`
        );
    }

    /**
     * 로그 내보내기
     * @param {Object} filters - 필터 조건
     * @returns {Promise<Object>} 내보내기 데이터
     */
    async exportLogs(filters = {}) {
        return this.getLogs({ ...filters, export: true, limit: 1000 });
    }

    /**
     * 인기 라우트 분석
     * @param {number} limit - 결과 수 제한
     * @returns {Promise<Object>} 인기 라우트 데이터
     */
    async getPopularRoutes(limit = 100) {
        const data = await this.getLogs({ limit });
        const routeCounts = {};

        data.logs.forEach((log) => {
            const route = log.route || 'Unknown';
            routeCounts[route] = (routeCounts[route] || 0) + 1;
        });

        const sortedRoutes = Object.entries(routeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        return sortedRoutes;
    }

    /**
     * 에러 분석
     * @param {number} limit - 결과 수 제한
     * @returns {Promise<Object>} 에러 분석 데이터
     */
    async getErrorAnalysis(limit = 100) {
        const data = await this.getErrorLogs({ limit });
        const errorCounts = {};

        data.logs.forEach((log) => {
            const route = log.route || 'Unknown';
            errorCounts[route] = (errorCounts[route] || 0) + 1;
        });

        const sortedErrors = Object.entries(errorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        return sortedErrors;
    }
}

const logApi = new LogApiClient();
export default logApi;
