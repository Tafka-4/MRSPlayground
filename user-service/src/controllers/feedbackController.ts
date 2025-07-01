import { Request, Response, RequestHandler } from 'express';
import { escape } from 'html-escaper';
import { pool } from '../config/database.js';
import { UserError, UserNotFoundError, UserForbiddenError } from '../utils/errors.js';
import { sendMail } from '../utils/sendMail.js';

interface FeedbackSubmission {
    title: string;
    type: 'bug' | 'feature' | 'improvement' | 'vulnerability' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    steps_to_reproduce?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    browser_info?: string;
    screenshot_url?: string;
}

interface FeedbackQuery {
    page?: number;
    limit?: number;
    type?: 'bug' | 'feature' | 'improvement' | 'vulnerability' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'pending' | 'confirmed' | 'in_progress' | 'testing' | 'resolved' | 'closed' | 'rejected';
}

export const submitFeedback: RequestHandler = async (req: Request, res: Response) => {
    const {
        title,
        type,
        priority = 'medium',
        description,
        steps_to_reproduce,
        expected_behavior,
        actual_behavior,
        browser_info,
        screenshot_url
    }: FeedbackSubmission = req.body;
    
    const currentUser = (req as any).user;

    if (!title || !type || !description) {
        throw new UserError('제목, 유형, 설명은 필수 입력 사항입니다.');
    }

    if (title.length > 500) {
        throw new UserError('제목은 500자를 초과할 수 없습니다.');
    }

    if (description.length > 10000) {
        throw new UserError('설명은 10000자를 초과할 수 없습니다.');
    }

    const validTypes = ['bug', 'feature', 'improvement', 'vulnerability', 'other'];
    if (!validTypes.includes(type)) {
        throw new UserError('올바른 유형을 선택해주세요.');
    }
    
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
        throw new UserError('올바른 우선순위를 선택해주세요.');
    }

    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
        `INSERT INTO feedback (
            title, type, priority, description, steps_to_reproduce,
            expected_behavior, actual_behavior, browser_info, screenshot_url, userid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            escape(title),
            type,
            priority,
            escape(description),
            steps_to_reproduce ? escape(steps_to_reproduce) : null,
            expected_behavior ? escape(expected_behavior) : null,
            actual_behavior ? escape(actual_behavior) : null,
            browser_info ? escape(browser_info) : null,
            screenshot_url ? escape(screenshot_url) : null,
            currentUser?.userid || null
        ]
    );

    connection.release();

    res.status(201).json({
        success: true,
        message: '피드백이 성공적으로 접수되었습니다.',
        feedbackId: (result as any).insertId
    });
};

// login required
export const getMyFeedback: RequestHandler = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('로그인이 필요합니다.');
    }

    const { page = 1, limit = 10 }: FeedbackQuery = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const connection = await pool.getConnection();

    const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM feedback WHERE userid = ?',
        [currentUser.userid]
    );

    const [feedback] = await connection.execute(
        `SELECT id, title, type, priority, status, createdAt, updatedAt
         FROM feedback 
         WHERE userid = ? 
         ORDER BY createdAt DESC 
         LIMIT ? OFFSET ?`,
        [currentUser.userid, Number(limit), offset]
    );

    connection.release();

    const total = (countResult as any)[0].total;

    res.status(200).json({
        success: true,
        feedback,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
        }
    });
};

// login required
export const getFeedbackDetails: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
        throw new UserNotFoundError('로그인이 필요합니다.');
    }

    const connection = await pool.getConnection();

    const [feedback] = await connection.execute(
        `SELECT f.*, u.nickname as admin_nickname
         FROM feedback f
         LEFT JOIN users u ON f.admin_userid = u.userid
         WHERE f.id = ? AND f.userid = ?`,
        [id, currentUser.userid]
    );

    connection.release();

    if (!Array.isArray(feedback) || feedback.length === 0) {
        throw new UserNotFoundError('피드백을 찾을 수 없습니다.');
    }

    res.status(200).json({
        success: true,
        feedback: feedback[0]
    });
};

export const getPublicFeedback: RequestHandler = async (req: Request, res: Response) => {
    const { page = 1, limit = 20, type, status }: FeedbackQuery = req.query;
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const filterParams: any[] = [];

    whereClause += ' WHERE f.status IN (?, ?, ?, ?)';
    filterParams.push('confirmed', 'in_progress', 'testing', 'resolved');

    if (type) {
        whereClause += ' AND f.type = ?';
        filterParams.push(type);
    }

    if (status && ['confirmed', 'in_progress', 'testing', 'resolved'].includes(status)) {
        whereClause += ' AND f.status = ?';
        filterParams.push(status);
    }

    const connection = await pool.getConnection();

    const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM feedback f${whereClause}`,
        filterParams
    );

    const [feedback] = await connection.execute(
        `SELECT f.id, f.title, f.type, f.priority, f.status, f.createdAt, f.updatedAt,
                u.nickname as user_nickname
         FROM feedback f
         LEFT JOIN users u ON f.userid = u.userid
         ${whereClause}
         ORDER BY f.createdAt DESC 
         LIMIT ? OFFSET ?`,
        [...filterParams, limitNum, offset]
    );

    connection.release();

    const total = (countResult as any)[0].total;

    res.status(200).json({
        success: true,
        feedback,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
        }
    });
};

// admin required
export const getAllFeedback: RequestHandler = async (req: Request, res: Response) => {
    const { page = 1, limit = 20, type, priority, status }: FeedbackQuery = req.query;
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const filterParams: any[] = [];

    if (type) {
        whereClause += ' WHERE f.type = ?';
        filterParams.push(type);
    }

    if (priority) {
        whereClause += whereClause ? ' AND f.priority = ?' : ' WHERE f.priority = ?';
        filterParams.push(priority);
    }

    if (status) {
        whereClause += whereClause ? ' AND f.status = ?' : ' WHERE f.status = ?';
        filterParams.push(status);
    }

    const connection = await pool.getConnection();

    try {
        const [countResult] = await connection.execute(
            `SELECT COUNT(*) as total FROM feedback f${whereClause}`,
            filterParams
        );

        const [allFeedback] = await connection.execute(
            `SELECT f.*, u.nickname as user_nickname, a.nickname as admin_nickname
             FROM feedback f
             LEFT JOIN users u ON f.userid = u.userid
             LEFT JOIN users a ON f.admin_userid = a.userid
             ${whereClause}
             ORDER BY f.createdAt DESC`,
            filterParams
        );

        const feedback = Array.isArray(allFeedback) ? allFeedback.slice(offset, offset + limitNum) : [];
        const total = (countResult as any)[0].total;

        res.status(200).json({
            success: true,
            feedback,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } finally {
        connection.release();
    }
};

// admin required
export const updateFeedbackStatus: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, priority, adminNotes } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser || currentUser.authority !== 'admin') {
        throw new UserForbiddenError('관리자 권한이 필요합니다.');
    }

    const validStatuses = ['pending', 'confirmed', 'in_progress', 'testing', 'resolved', 'closed', 'rejected'];
    if (status && !validStatuses.includes(status)) {
        throw new UserError('올바른 상태를 선택해주세요.');
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (priority && !validPriorities.includes(priority)) {
        throw new UserError('올바른 우선순위를 선택해주세요.');
    }

    const connection = await pool.getConnection();

    let updateQuery = 'UPDATE feedback SET updatedAt = CURRENT_TIMESTAMP, admin_userid = ?';
    const updateParams: any[] = [currentUser.userid];

    if (status) {
        updateQuery += ', status = ?';
        updateParams.push(status);
    }

    if (priority) {
        updateQuery += ', priority = ?';
        updateParams.push(priority);
    }

    if (adminNotes !== undefined) {
        updateQuery += ', admin_notes = ?';
        updateParams.push(adminNotes || null);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    const [result] = await connection.execute(updateQuery, updateParams);

    connection.release();

    if ((result as any).affectedRows === 0) {
        throw new UserNotFoundError('피드백을 찾을 수 없습니다.');
    }

    res.status(200).json({
        success: true,
        message: '피드백이 업데이트되었습니다.'
    });
};

// admin required
export const sendFeedbackReply: RequestHandler = async (req: Request, res: Response) => {
    const { feedbackId } = req.params;
    const { replyMessage } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser || currentUser.authority !== 'admin') {
        throw new UserForbiddenError('관리자 권한이 필요합니다.');
    }

    if (!replyMessage || replyMessage.trim().length === 0) {
        throw new UserError('답변 내용을 입력해주세요.');
    }

    const connection = await pool.getConnection();

    try {
        const [feedbacks] = await connection.execute(
            `SELECT f.*, u.email as user_email, u.nickname as user_nickname
             FROM feedback f
             LEFT JOIN users u ON f.userid = u.userid
             WHERE f.id = ?`,
            [feedbackId]
        );

        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
            throw new UserNotFoundError('피드백을 찾을 수 없습니다.');
        }

        const feedback = feedbacks[0] as any;

        if (!feedback.user_email) {
            throw new UserError('사용자의 이메일 정보가 없어서 답변을 전송할 수 없습니다.');
        }

        const typeNames = {
            'bug': '버그 신고',
            'feature': '기능 요청',
            'improvement': '개선 제안',
            'vulnerability': '보안 취약점',
            'other': '기타'
        };

        const priorityNames = {
            'low': '낮음',
            'medium': '보통',
            'high': '높음',
            'critical': '긴급'
        };

        const emailSubject = `Re: [피드백] ${feedback.title}`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">피드백 답변</h2>
                <p>안녕하세요${feedback.user_nickname ? ` ${feedback.user_nickname}님` : ''},</p>
                <p>제출해주신 피드백에 대해 답변드립니다.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <h3 style="margin-top: 0; color: #555;">원본 피드백</h3>
                    <p><strong>제목:</strong> ${feedback.title}</p>
                    <p><strong>유형:</strong> ${(typeNames as any)[feedback.type] || feedback.type}</p>
                    <p><strong>우선순위:</strong> ${(priorityNames as any)[feedback.priority] || feedback.priority}</p>
                    <p><strong>내용:</strong></p>
                    <p style="white-space: pre-wrap;">${feedback.description}</p>
                    ${feedback.steps_to_reproduce ? `
                    <p><strong>재현 단계:</strong></p>
                    <p style="white-space: pre-wrap;">${feedback.steps_to_reproduce}</p>
                    ` : ''}
                    ${feedback.expected_behavior ? `
                    <p><strong>예상 동작:</strong></p>
                    <p style="white-space: pre-wrap;">${feedback.expected_behavior}</p>
                    ` : ''}
                    ${feedback.actual_behavior ? `
                    <p><strong>실제 동작:</strong></p>
                    <p style="white-space: pre-wrap;">${feedback.actual_behavior}</p>
                    ` : ''}
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3 style="margin-top: 0; color: #555;">답변</h3>
                    <p style="white-space: pre-wrap;">${escape(replyMessage)}</p>
                </div>
                
                <p>추가 문의나 의견이 있으시면 언제든지 연락주세요.</p>
                <p>소중한 피드백을 보내주셔서 감사합니다.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #888;">
                    이 메일은 자동으로 발송된 메일입니다.
                </p>
            </div>
        `;

        await sendMail(feedback.user_email, emailSubject, emailHtml);

        res.status(200).json({
            success: true,
            message: '답변 이메일이 성공적으로 전송되었습니다.'
        });

    } finally {
        connection.release();
    }
}; 