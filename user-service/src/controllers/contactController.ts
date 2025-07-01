import { Request, Response, RequestHandler } from 'express';
import { escape } from 'html-escaper';
import { pool } from '../config/database.js';
import { UserError, UserNotFoundError, UserForbiddenError } from '../utils/errors.js';
import { sendMail } from '../utils/sendMail.js';

interface ContactSubmission {
    subject: string;
    category: 'general' | 'technical' | 'feature' | 'account' | 'other';
    email: string;
    message: string;
}

interface ContactQuery {
    page?: number;
    limit?: number;
    status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
    category?: 'general' | 'technical' | 'feature' | 'account' | 'other';
}

export const submitContact: RequestHandler = async (req: Request, res: Response) => {
    const { subject, category, email, message }: ContactSubmission = req.body;
    const currentUser = (req as any).user;

    if (!subject || !category || !email || !message) {
        throw new UserError('모든 필드를 입력해주세요.');
    }

    if (subject.length > 500) {
        throw new UserError('제목은 500자를 초과할 수 없습니다.');
    }

    if (message.length > 5000) {
        throw new UserError('메시지는 5000자를 초과할 수 없습니다.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new UserError('올바른 이메일 형식을 입력해주세요.');
    }

    const validCategories = ['general', 'technical', 'feature', 'account', 'other'];
    if (!validCategories.includes(category)) {
        throw new UserError('올바른 카테고리를 선택해주세요.');
    }

    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
        `INSERT INTO contacts (subject, category, email, message, userid) 
         VALUES (?, ?, ?, ?, ?)`,
        [
            escape(subject),
            category,
            escape(email),
            escape(message),
            currentUser?.userid || null
        ]
    );

    connection.release();

    res.status(201).json({
        success: true,
        message: '문의가 성공적으로 접수되었습니다.',
        contactId: (result as any).insertId
    });
};

// login required
export const getMyContacts: RequestHandler = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('로그인이 필요합니다.');
    }

    const { page = 1, limit = 10 }: ContactQuery = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const connection = await pool.getConnection();

    const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM contacts WHERE userid = ?',
        [currentUser.userid]
    );
    
    const [contacts] = await connection.execute(
        `SELECT id, subject, category, email, message, status, createdAt, updatedAt
         FROM contacts 
         WHERE userid = ? 
         ORDER BY createdAt DESC 
         LIMIT ? OFFSET ?`,
        [currentUser.userid, Number(limit), offset]
    );

    connection.release();

    const total = (countResult as any)[0].total;

    res.status(200).json({
        success: true,
        contacts,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
        }
    });
};

// login required
export const getContactDetails: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
        throw new UserNotFoundError('로그인이 필요합니다.');
    }

    const connection = await pool.getConnection();

    const [contacts] = await connection.execute(
        `SELECT c.*, u.nickname as admin_nickname
         FROM contacts c
         LEFT JOIN users u ON c.admin_userid = u.userid
         WHERE c.id = ? AND c.userid = ?`,
        [id, currentUser.userid]
    );

    connection.release();

    if (!Array.isArray(contacts) || contacts.length === 0) {
        throw new UserNotFoundError('문의를 찾을 수 없습니다.');
    }

    res.status(200).json({
        success: true,
        contact: contacts[0]
    });
};

// admin required
export const getAllContacts: RequestHandler = async (req: Request, res: Response) => {
    console.log('=== getAllContacts 함수 시작 ===');
    
    const { page = 1, limit = 20, status, category }: ContactQuery = req.query;
    console.log('Query params:', { page, limit, status, category });
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;
    
    console.log('Processed params:', { pageNum, limitNum, offset });

    const connection = await pool.getConnection();
    console.log('Database connection obtained');

    try {
        console.log('Checking if contacts table exists...');
        const [tableCheck] = await connection.execute('SHOW TABLES LIKE "contacts"');
        console.log('Table check result:', tableCheck);
        
        if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
            console.log('Contacts table does not exist!');
            throw new Error('Contacts table does not exist');
        }

        console.log('Executing simple count query...');
        const [simpleCount] = await connection.execute('SELECT COUNT(*) as total FROM contacts');
        console.log('Simple count result:', simpleCount);

        console.log('Executing basic select query with JOIN...');
        const [allContacts] = await connection.execute(
            `SELECT c.*, 
                    u.nickname as user_nickname, 
                    a.nickname as admin_nickname
             FROM contacts c
             LEFT JOIN users u ON c.userid = u.userid
             LEFT JOIN users a ON c.admin_userid = a.userid
             ORDER BY c.createdAt DESC`
        );
        console.log('All contacts result:', Array.isArray(allContacts) ? allContacts.length : 'not array');
        
        const basicContacts = Array.isArray(allContacts) ? allContacts.slice(offset, offset + limitNum) : [];
        console.log('Basic contacts result count:', Array.isArray(basicContacts) ? basicContacts.length : 'not array');

        const total = (simpleCount as any)[0].total;
        console.log('Total contacts:', total);

        res.status(200).json({
            success: true,
            contacts: basicContacts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error in getAllContacts:', error);
        throw error;
    } finally {
        connection.release();
        console.log('Database connection released');
    }
};

// admin required
export const updateContactStatus: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser || currentUser.authority !== 'admin') {
        throw new UserForbiddenError('관리자 권한이 필요합니다.');
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        throw new UserError('올바른 상태를 선택해주세요.');
    }

    const connection = await pool.getConnection();

    const [result] = await connection.execute(
        `UPDATE contacts 
         SET status = ?, admin_notes = ?, admin_userid = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, adminNotes || null, currentUser.userid, id]
    );

    connection.release();

    if ((result as any).affectedRows === 0) {
        throw new UserNotFoundError('문의를 찾을 수 없습니다.');
    }

    res.status(200).json({
        success: true,
        message: '문의 상태가 업데이트되었습니다.'
    });
};

// admin required
export const sendReplyEmail: RequestHandler = async (req: Request, res: Response) => {
    const { contactId } = req.params;
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
        const [contacts] = await connection.execute(
            'SELECT * FROM contacts WHERE id = ?',
            [contactId]
        );

        if (!Array.isArray(contacts) || contacts.length === 0) {
            throw new UserNotFoundError('문의를 찾을 수 없습니다.');
        }

        const contact = contacts[0] as any;

        const categoryNames = {
            'general': '일반 문의',
            'technical': '기술적 문제',
            'feature': '기능 요청',
            'account': '계정 관련',
            'other': '기타'
        };

        const emailSubject = `Re: ${contact.subject}`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">문의 답변</h2>
                <p>안녕하세요,</p>
                <p>문의해주신 내용에 대해 답변드립니다.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <h3 style="margin-top: 0; color: #555;">원본 문의</h3>
                    <p><strong>제목:</strong> ${contact.subject}</p>
                    <p><strong>카테고리:</strong> ${(categoryNames as any)[contact.category] || contact.category}</p>
                    <p><strong>내용:</strong></p>
                    <p style="white-space: pre-wrap;">${contact.message}</p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3 style="margin-top: 0; color: #555;">답변</h3>
                    <p style="white-space: pre-wrap;">${escape(replyMessage)}</p>
                </div>
                
                <p>추가 문의가 있으시면 언제든지 연락주세요.</p>
                <p>감사합니다.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #888;">
                    이 메일은 자동으로 발송된 메일입니다.
                </p>
            </div>
        `;

        await sendMail(contact.email, emailSubject, emailHtml);

        res.status(200).json({
            success: true,
            message: '답변 이메일이 성공적으로 전송되었습니다.'
        });

    } finally {
        connection.release();
    }
}; 