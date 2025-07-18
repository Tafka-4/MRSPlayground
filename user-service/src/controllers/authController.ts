import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { User } from '../models/User.js';
import { redisClient } from '../config/redis.js';
import { sendMail } from '../utils/sendMail.js';
import { generateKey } from '../utils/keygen.js';
import {
    AuthError,
    UserNotFoundError,
    UserNotValidPasswordError,
    UserError,
    UserNotLoginError,
    UserTokenVerificationFailedError,
    UserAlreadyVerifiedError,
    AuthUserAlreadyAdminError,
    UserNotAdminError,
    UserNotVerifiedError
} from '../utils/errors.js';
import jwt from 'jsonwebtoken';

interface JwtPayloadWithUserId extends jwt.JwtPayload {
    userid: string;
}

export const registerUser = async (req: Request, res: Response) => {
    const { id, password, email, nickname } = req.body;
    if (!id || !password || !email) {
        throw new UserError('아이디, 비밀번호, 이메일은 필수 입력 항목입니다');
    }

    const isBot =
        id === process.env.BOT_ID &&
        email === process.env.BOT_EMAIL &&
        password === process.env.BOT_PW;

    if (isBot) {
        const existingBot = await User.findOne({ id: process.env.BOT_ID });
        if (existingBot) {
            throw new UserError('봇 계정이 이미 존재합니다');
        }
    } else {
        const existingUserById = await User.findOne({ id });
        if (existingUserById) {
            throw new UserError('이미 존재하는 아이디입니다');
        }
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            throw new UserError('이미 존재하는 이메일입니다');
        }
    }

    if (!/^[a-zA-Z0-9!@#$%^&*()_]+$/.test(id)) {
        throw new UserError(
            '아이디는 영문자, 숫자, 특수문자(!@#$%^&*()_)만 사용할 수 있습니다'
        );
    }

    if (password.length < 8) {
        throw new UserError('비밀번호는 8자 이상이어야 합니다');
    }

    if (!/^[a-zA-Z0-9!@#$%^&*()_{}]+$/.test(password)) {
        throw new UserError(
            '비밀번호에 허용되지 않는 문자가 포함되어 있습니다. 영문자, 숫자, 특수문자(!@#$%^&*()_{})만 사용 가능합니다'
        );
    }

    if (!/[!@#$%^&*()_{}]/.test(password)) {
        throw new UserError(
            '비밀번호는 최소 하나의 특수문자(!@#$%^&*()_{})를 포함해야 합니다'
        );
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new UserError('올바르지 않은 이메일 형식입니다');
    }

    const isVerified = await redisClient.get(`${email}:isVerified`);
    if (!isBot && !isVerified) {
        throw new AuthError('이메일 인증이 완료되지 않았습니다');
    }

    const user = await User.create({
        id,
        password,
        email,
        nickname: nickname || id,
        authority: isBot ? 'bot' : 'user',
    });

    res.status(201).json({
        success: true,
        message: '회원가입이 성공적으로 완료되었습니다',
        user: user.toJSON()
    });
};

export const loginUser = async (req: Request, res: Response) => {
    const { id, password } = req.body;

    if (req.user) {
        throw new UserError('이미 로그인 상태입니다');
    }
    if (!id || !password) {
        throw new UserError('아이디와 비밀번호를 입력해주세요');
    }
    const user = await User.findOne({ id });
    if (!user || !(await user.comparePassword(password))) {
        throw new UserNotValidPasswordError('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    const tokens = await user.generateTokens();

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    
    await redisClient.del(`user:${user.userid}`);

    res.status(200).json({
        success: true,
        message: '로그인이 성공적으로 완료되었습니다',
        accessToken: tokens.accessToken,
        user: user.toJSON()
    });
};

export const deleteCurrentUser = async (req: Request, res: Response) => {
    const userData = req.user;
    if (!userData || !userData.userid) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다.');
    }

    const user = await User.findOne({ userid: userData.userid });
    if (!user) {
        throw new UserNotFoundError('데이터베이스에서 사용자를 찾을 수 없습니다.');
    }

    await User.deleteOne({ userid: userData.userid });

    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    
    res.status(200).json({
        success: true,
        message: '계정이 성공적으로 삭제되었습니다.'
    });
};

export const logoutUser = async (req: Request, res: Response) => {
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET as string) as JwtPayloadWithUserId;
            const ttl = Math.max(0, (decoded.exp ?? 0) - Math.floor(Date.now() / 1000));
            if (ttl > 0) {
                await redisClient.set(`blacklist:${accessToken}`, 'revoked', { EX: ttl });
            }
        } catch (error) {
            console.warn('Invalid access token during logout:', error);
        }
    }

    const affectedRows = await user.logout();
    if (affectedRows === 0) {
        throw new UserNotLoginError('로그인 상태가 아닙니다');
    }

    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(200).json({ success: true, message: '로그아웃이 성공적으로 완료되었습니다' });
};

export const refreshToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new UserNotLoginError('리프레시 토큰을 찾을 수 없습니다');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string, {
        algorithms: ['HS256']
    }) as JwtPayloadWithUserId;

    const user = await User.findOne({ userid: decoded.userid });

    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    const accessToken = await user.refresh(refreshToken);
    res.status(200).json({ success: true, accessToken });
};

// Helper functions for checkToken
const getCachedOrFreshUser = async (userid: string, forceRefresh: boolean) => {
    if (forceRefresh) {
        return null;
    }

    const cachedUser = await redisClient.get(`user:${userid}`);
    return cachedUser ? JSON.parse(cachedUser) : null;
};

const fetchAndCacheUser = async (userid: string) => {
    const dbUser = await User.findOne({ userid });
    if (!dbUser) {
        return null;
    }

    const user = {
        ...dbUser.toJSON(),
        createdAt: (dbUser as any).data?.createdAt,
        updatedAt: (dbUser as any).data?.updatedAt
    };

    await redisClient.set(`user:${userid}`, JSON.stringify(user), {
        EX: 60 * 30
    });

    return { user, dbUser };
};

// login required
export const checkToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const accessToken = authHeader.substring(7);
            try {
                const isBlacklisted = await redisClient.get(`blacklist:${accessToken}`);
                if (isBlacklisted) {
                    throw new UserTokenVerificationFailedError('토큰이 만료되었습니다');
                }
                
                const decoded = await jwt.verify(accessToken, process.env.JWT_SECRET as string) as JwtPayloadWithUserId;
                
                const user = await User.findOne({ userid: decoded.userid });
                if (user) {
                    await user.logout();
                }
                
                throw new UserNotLoginError('리프레시 토큰이 없습니다. 다시 로그인해주세요.');
            } catch (error) {
                if (error instanceof jwt.JsonWebTokenError) {
                    throw new UserTokenVerificationFailedError('유효하지 않은 토큰입니다');
                }
                throw error;
            }
        }
        throw new UserNotLoginError('리프레시 토큰을 찾을 수 없습니다');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string, {
        algorithms: ['HS256']
    }) as JwtPayloadWithUserId;

    const forceRefresh = req.query.forceRefresh === 'true';

    let user = await getCachedOrFreshUser(decoded.userid, forceRefresh);
    let dbUser;

    if (!user) {
        const result = await fetchAndCacheUser(decoded.userid);
        if (!result) {
            throw new UserTokenVerificationFailedError(
                '유효하지 않은 토큰입니다'
            );
        }
        user = result.user;
        dbUser = result.dbUser;
    } else {
        dbUser = await User.findOne({ userid: decoded.userid });
        if (!dbUser) {
            throw new UserTokenVerificationFailedError(
                '유효하지 않은 토큰입니다'
            );
        }
    }

    const isValidToken = await dbUser.validateRefreshToken(refreshToken);
    if (!isValidToken) {
        throw new UserTokenVerificationFailedError('유효하지 않은 토큰입니다');
    }

    res.status(200).json({
        success: true,
        user: user
    });
};

// login required
export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            throw new UserNotFoundError('사용자를 찾을 수 없습니다');
        }
        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: '유효하지 않은 토큰입니다'
        });
    }
};

// email verification methods
export const sendVerificationEmail = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new UserError('Email is required');
    }

    const verificationCode = randomBytes(3).toString('hex').toUpperCase();
    await redisClient.set(`${email}:verify`, verificationCode, { EX: 180 });

    const mailHtml = `<h1>이메일 인증 코드</h1><p>코드: <strong>${verificationCode}</strong></p><p>이 코드는 3분 동안 유효합니다.</p>`;
    await sendMail(email, '이메일 인증 코드', mailHtml);

    res.status(200).json({ success: true, message: 'Verification email sent' });
};

export const verifyEmail = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) {
        throw new UserError('Email and code are required');
    }

    const storedCode = await redisClient.get(`${email}:verify`);
    if (storedCode !== code) {
        throw new AuthError('Invalid verification code');
    }

    await redisClient.set(`${email}:isVerified`, 'true', { EX: 600 });
    await redisClient.del(`${email}:verify`);

    res.status(200).json({ success: true, message: 'Email verified successfully' });
};

//login required
export const changeEmail = async (req: Request, res: Response) => {
    const { userid, newEmail } = req.body;
    const user = await User.findOneAndUpdate(
        { userid },
        { email: newEmail, isVerified: false }
    );
    if (!user) {
        throw new UserNotFoundError(
            '사용자를 찾을 수 없거나 새 이메일이 현재 이메일과 동일합니다'
        );
    }
    res.status(200).json({
        success: true,
        message: '이메일이 성공적으로 변경되었습니다'
    });
};

// login required
export const changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userid = req.user?.userid;

    if (!currentPassword || !newPassword) {
        throw new UserError('Current and new passwords are required');
    }

    const user = await User.findOne({ userid });
    if (!user || !(await user.comparePassword(currentPassword))) {
        throw new UserNotValidPasswordError('Invalid current password');
    }

    await User.findOneAndUpdate({ userid }, { password: newPassword });
    res.status(200).json({ success: true, message: 'Password changed successfully' });
};

export const resetPasswordMailSend = async (req: Request, res: Response) => {
    let { email, id } = req.body;
    let user;

    if (!email && !id) {
        throw new UserError('이메일 또는 아이디를 입력해주세요');
    }

    if (email) {
        user = await User.findOne({ email });
    } else if (id) {
        user = await User.findOne({ id });
        email = user?.email;
    }

    if (!user) {
        throw new UserNotFoundError(
            '해당 정보로 가입된 사용자를 찾을 수 없습니다'
        );
    }

    const newPassword = 'flag{' + randomBytes(32).toString('hex') + '}';
    const subject = '임시 비밀번호 발급';
    const content = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #333;">임시 비밀번호 발급</h2>
            <p style="font-size: 16px; color: #555;">
                요청하신 임시 비밀번호입니다:
            </p>
            <div style="background-color: #f4f4f4; padding: 15px; display: inline-block; border-radius: 5px; margin: 10px 0; border: 2px solid #ddd;">
                <strong style="font-size: 20px; color: #222; font-family: monospace;">${newPassword}</strong>
            </div>
            <p style="font-size: 14px; color: #777; margin-top: 15px;">
                보안을 위해 로그인 후 반드시 비밀번호를 변경해주세요.<br>
                이 임시 비밀번호는 10분 후 만료됩니다.
            </p>
            <p style="font-size: 12px; color: #999;">
                본인이 요청하지 않았다면 이 이메일을 무시하세요.
            </p>
        </div>
    `;
    await sendMail(email, subject, content);
    await User.findOneAndUpdate({ email }, { password: newPassword });
    await redisClient.set(`${email}:tempPassword`, newPassword, { EX: 60 * 5 });
    res.status(200).json({
        success: true,
        message: '임시 비밀번호가 이메일로 발송되었습니다'
    });
};

// login required
export const verifyUserWithKey = async (req: Request, res: Response) => {
    const { key } = req.body;
    const user = req.user;
    if (!user || !key) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    const verifiedKey = generateKey();
    if (verifiedKey !== key) {
        throw new UserError('유효하지 않은 키입니다');
    }

    await User.findOneAndUpdate({ userid: user.userid }, { isVerified: true });
    res.status(200).json({
        success: true,
        message: '사용자가 성공적으로 인증되었습니다'
    });
};

// admin required
export const setAdmin = async (req: Request, res: Response) => {
    const { target } = req.params;
    const targetUser = await User.findOne({ userid: target });

    if (!targetUser) {
        throw new UserNotFoundError('대상 사용자를 찾을 수 없습니다.');
    }
    if (targetUser.authority === 'admin') {
        throw new AuthUserAlreadyAdminError('이미 관리자입니다.');
    }

    await User.findOneAndUpdate({ userid: target }, { authority: 'admin' });
    res.status(200).json({ success: true, message: '관리자로 설정되었습니다.' });
};

//admin required
export const unSetAdmin = async (req: Request, res: Response) => {
    const { target } = req.params;
    const adminUser = req.user;
    const targetUser = await User.findOne({ userid: target });
    if (!targetUser) {
        throw new UserNotFoundError('대상 사용자를 찾을 수 없습니다');
    }
    if (!adminUser) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (adminUser.authority !== 'admin' && adminUser.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }
    if (target === adminUser.userid) {
        throw new UserError('자신의 권한을 해제할 수 없습니다');
    }
    if (targetUser.authority !== 'admin' && targetUser.authority !== 'bot') {
        throw new UserNotAdminError('대상 사용자가 관리자가 아닙니다');
    }
    await User.findOneAndUpdate({ userid: target }, { authority: 'user' });
    res.status(200).json({
        success: true,
        message: '관리자 권한이 성공적으로 제거되었습니다'
    });
};

export const verifyUser = async (req: Request, res: Response) => {
    const { target } = req.params;
    const user = await User.findOne({ userid: target });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (user.isVerified) {
        throw new UserAlreadyVerifiedError('이미 인증된 사용자입니다');
    }
    await User.findOneAndUpdate({ userid: target }, { isVerified: true });
    res.status(200).json({
        success: true,
        message: '사용자가 성공적으로 인증되었습니다'
    });
};

//admin required
export const unVerifyUser = async (req: Request, res: Response) => {
    const { target } = req.params;
    const user = await User.findOne({ userid: target });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (!user.isVerified) {
        throw new UserNotVerifiedError('인증되지 않은 사용자입니다');
    }
    await User.findOneAndUpdate({ userid: target }, { isVerified: false });
    res.status(200).json({
        success: true,
        message: '사용자가 성공적으로 인증 해제되었습니다'
    });
};

//admin required
export const adminUserDelete = async (req: Request, res: Response) => {
    const { target } = req.params;
    const user = req.user;
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (user.authority !== 'admin' && user.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }
    if (!target) {
        throw new UserError('삭제할 사용자의 userid를 입력해주세요');
    }
    if (target === user.userid) {
        throw new UserError('자신의 계정을 삭제할 수 없습니다');
    }
    await User.deleteOne({ userid: target });

    res.status(200).json({
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다'
    });
};

//admin required
export const adminUserList = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (user.authority !== 'admin' && user.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }
    const adminUsers = await User.find({ authority: 'admin' });
    const botUsers = await User.find({ authority: 'bot' });
    const users = [...adminUsers, ...botUsers];
    res.status(200).json({
        success: true,
        message: '관리자 목록',
        users: users.map((user) => user.toJSON())
    });
};

// login required
export const getActiveTokens = async (req: Request, res: Response) => {
    const currentUser = req.user;
    if (!currentUser) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    const activeTokens = await user.getActiveRefreshTokens();
    res.status(200).json({
        success: true,
        message: '활성 토큰 목록',
        tokens: activeTokens
    });
};

// login required
export const revokeAllOtherTokens = async (req: Request, res: Response) => {
    const currentUser = req.user;
    const currentRefreshToken = req.cookies.refreshToken;

    if (!currentUser) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    if (!currentRefreshToken) {
        throw new UserNotLoginError('현재 토큰을 찾을 수 없습니다');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    try {
        await user.refresh(currentRefreshToken);
    } catch (error) {
        throw new UserTokenVerificationFailedError(
            '현재 토큰이 유효하지 않습니다'
        );
    }

    await user.revokeAllRefreshTokens();
    const tokens = await user.generateTokens();

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        path: '/'
    });

    res.status(200).json({
        success: true,
        message: '다른 모든 세션이 종료되었습니다',
        accessToken: tokens.accessToken
    });
};

// admin required
export const adminRevokeUserTokens = async (req: Request, res: Response) => {
    const { userid } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    if (adminUser.authority !== 'admin' && adminUser.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }

    const targetUser = await User.findOne({ userid });
    if (!targetUser) {
        throw new UserNotFoundError('대상 사용자를 찾을 수 없습니다');
    }

    await targetUser.revokeAllRefreshTokens();

    res.status(200).json({
        success: true,
        message: `사용자 ${targetUser.nickname}의 모든 세션이 강제 종료되었습니다`
    });
};

// admin required
export const systemCleanup = async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    if (user.authority !== 'admin' && user.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }

    const result = await User.performMaintenanceCleanup();

    res.status(200).json({
        success: true,
        message: '시스템 정리가 완료되었습니다',
        result: {
            revokedExpiredTokens: result.revokedExpiredTokens,
            deletedOldTokens: result.deletedTokens
        }
    });
};

// admin required
export const checkEmailVerificationStatus = async (req: Request, res: Response) => {
    const { email } = req.body;
    const isVerified = await redisClient.get(`${email}:isVerified`);
    const isDuplicate = await User.findOne({ email });
    
    res.status(200).json({
        success: true,
        isVerified: !!(isVerified || isDuplicate)
    });
};

export const getCurrentKey = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (user.authority !== 'admin' && user.authority !== 'bot') {
        throw new UserNotAdminError('관리자 권한이 없습니다');
    }

    const currentKey = generateKey();
    res.status(200).json({
        success: true,
        message: '현재 키를 성공적으로 가져왔습니다',
        key: currentKey
    });
};
