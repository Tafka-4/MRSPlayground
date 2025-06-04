import { Request, Response, RequestHandler } from 'express';
import { randomBytes } from 'crypto';
import { User } from '../models/User.js';
import { redisClient } from '../config/redis.js';
import { sendMail } from '../utils/sendMail.js';
import { generateKey } from '../utils/keygen.js';
import {
    AuthError,
    AuthEmailVerifyFailedError,
    AuthUserAlreadyAdminError,
    UserNotFoundError,
    UserNotValidPasswordError,
    UserError,
    UserNotLoginError,
    UserTokenVerificationFailedError,
    UserNotAdminError,
    UserAlreadyVerifiedError,
    UserNotVerifiedError
} from '../utils/errors.js';
import jwt from 'jsonwebtoken';

interface JwtPayloadWithUserId extends jwt.JwtPayload {
    userid: string;
}

export const registerUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { id, password, email, nickname } = req.body;
    if (!id || !password || !email) {
        throw new UserError('아이디, 비밀번호, 이메일은 필수 입력 항목입니다');
    }

    const isBot =
        id === process.env.BOT_ID &&
        email === process.env.BOT_EMAIL &&
        password === process.env.BOT_PW;

    if (isBot) {
        const existingBotById = await User.findOne({ id: process.env.BOT_ID });
        const existingBotByEmail = await User.findOne({
            email: process.env.BOT_EMAIL
        });
        if (existingBotById || existingBotByEmail) {
            throw new UserError('봇 계정이 이미 존재합니다');
        }
    }

    const existingUserById = await User.findOne({ id });
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserById || existingUserByEmail) {
        throw new UserError('이미 존재하는 아이디 또는 이메일입니다');
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

    if (!isBot) {
        const isVerified = await redisClient.get(`${email}:isVerified`);
        if (!isVerified) {
            throw new AuthError('이메일 인증이 완료되지 않았습니다');
        }
    }

    const userData = {
        id: id,
        password: password,
        email: email,
        nickname: nickname ? nickname : id,
        authority: (isBot ? 'bot' : 'user') as 'bot' | 'user',
        description: '',
        profileImage: ''
    };
    const user = await User.create(userData);
    res.status(201).json({
        success: true,
        message: '회원가입이 성공적으로 완료되었습니다',
        user: user.toJSON()
    });
};

export const loginUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    if (req.user) {
        throw new UserError('이미 로그인 상태입니다');
    }
    const { id, password } = req.body;

    if (!id || !password) {
        throw new UserError('아이디와 비밀번호를 입력해주세요');
    }
    const user = await User.findOne({ id });
    if (!user) {
        throw new UserNotValidPasswordError(
            '아이디 또는 비밀번호가 올바르지 않습니다'
        );
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new UserNotValidPasswordError(
            '아이디 또는 비밀번호가 올바르지 않습니다'
        );
    }

    const tokens = await user.generateTokens();

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        path: '/'
    });

    await redisClient.del(`${user.email}:isVerified`);
    await redisClient.del(`user:${user.userid}`);

    res.status(200).json({
        success: true,
        message: '로그인이 성공적으로 완료되었습니다',
        accessToken: tokens.accessToken,
        user: user.toJSON()
    });
};

export const logoutUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    try {
        const userData = (req as any).user;
        if (!userData || !userData.userid) {
            throw new UserNotFoundError('사용자를 찾을 수 없습니다');
        }

        const user = await User.findOne({ userid: userData.userid });
        if (!user) {
            throw new UserNotFoundError('사용자를 찾을 수 없습니다');
        }

        const isLogout = await user.logout();
        if (isLogout === 0) {
            throw new UserNotLoginError('로그인 상태가 아닙니다');
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: '로그아웃이 성공적으로 완료되었습니다'
        });
    } catch (error) {
        console.error('Logout error:', error);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        if (
            error instanceof UserNotFoundError ||
            error instanceof UserNotLoginError
        ) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: '로그아웃 중 서버 에러가 발생했습니다',
                details:
                    process.env.NODE_ENV === 'development'
                        ? String(error)
                        : 'Internal server error'
            });
        }
    }
};

export const refreshToken: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new UserNotLoginError('리프레시 토큰을 찾을 수 없습니다');
    }

    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
    ) as JwtPayloadWithUserId;

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
export const checkToken: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new UserNotLoginError('리프레시 토큰을 찾을 수 없습니다');
    }

    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
    ) as JwtPayloadWithUserId;

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
export const getCurrentUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    try {
        const user = (req as any).user;
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
export const sendVerificationEmail: RequestHandler = async (req, res) => {
    const { email } = req.body;
    const isVerified = await redisClient.get(`${email}:isVerified`);
    const isDuplicate = await User.findOne({ email });
    if (isVerified || isDuplicate) {
        throw new AuthError('이미 인증된 이메일입니다');
    }
    const verificationCode = Math.floor(
        100000 + Math.random() * 900000
    ).toString();
    await redisClient.set(`${email}:verificationCode`, verificationCode, {
        EX: 60 * 10
    });
    const subject = '이메일 인증';
    const content = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #333;">이메일 인증</h2>
            <p style="font-size: 16px; color: #555;">
                회원가입을 완료하려면 다음 인증 코드를 입력해주세요:
            </p>
            <div style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; margin: 10px 0;">
                <strong style="font-size: 24px; color: #222;">${verificationCode}</strong>
            </div>
            <p style="font-size: 14px; color: #777;">
                본인이 요청하지 않았다면 이 이메일을 무시하세요.
            </p>
        </div>
    `;
    await sendMail(email, subject, content);
    res.status(200).json({
        success: true,
        message: '인증 이메일이 발송되었습니다'
    });
};

export const verifyEmail: RequestHandler = async (req, res) => {
    const { email, pin } = req.body;
    const verificationCode = pin || req.body.verificationCode;
    const verificationCodeFromRedis = await redisClient.get(
        `${email}:verificationCode`
    );
    if (verificationCodeFromRedis !== verificationCode) {
        throw new AuthEmailVerifyFailedError('인증 코드가 올바르지 않습니다');
    }
    await redisClient.del(`${email}:verificationCode`);
    await redisClient.set(`${email}:isVerified`, 'true', { EX: 60 * 60 * 24 });
    res.status(200).json({
        success: true,
        message: '이메일 인증이 성공적으로 완료되었습니다'
    });
};

//login required
export const changeEmail: RequestHandler = async (req, res) => {
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
export const changePassword: RequestHandler = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }

    if (!currentPassword || !newPassword) {
        throw new UserError('현재 비밀번호와 새 비밀번호를 입력해주세요');
    }

    if (newPassword.length < 8) {
        throw new UserError('새 비밀번호는 8자 이상이어야 합니다');
    }

    if (!/^[a-zA-Z0-9!@#$%^&*()_{}]+$/.test(newPassword)) {
        throw new UserError(
            '새 비밀번호에 허용되지 않는 문자가 포함되어 있습니다. 영문자, 숫자, 특수문자(!@#$%^&*()_{})만 사용 가능합니다'
        );
    }

    if (!/[!@#$%^&*()_{}]/.test(newPassword)) {
        throw new UserError(
            '새 비밀번호는 최소 하나의 특수문자(!@#$%^&*()_{})를 포함해야 합니다'
        );
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
        throw new UserError('새 비밀번호는 영문자를 포함해야 합니다');
    }

    if (!/[0-9]/.test(newPassword)) {
        throw new UserError('새 비밀번호는 숫자를 포함해야 합니다');
    }

    if (!(await currentUser.comparePassword(currentPassword))) {
        throw new UserNotValidPasswordError(
            '현재 비밀번호가 올바르지 않습니다'
        );
    }

    if (currentPassword === newPassword) {
        throw new UserError('새 비밀번호는 현재 비밀번호와 달라야 합니다');
    }

    await User.findOneAndUpdate(
        { userid: currentUser.userid },
        { password: newPassword }
    );

    // Revoke all refresh tokens for security after password change
    await currentUser.revokeAllRefreshTokens();

    // Clear current session cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });

    res.status(200).json({
        success: true,
        message:
            '비밀번호가 성공적으로 변경되었습니다. 보안을 위해 다시 로그인해주세요.'
    });
};

export const resetPasswordMailSend: RequestHandler = async (req, res) => {
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
export const verifyUserWithKey: RequestHandler = async (req, res) => {
    const { key } = req.body;
    const user = (req as any).user;
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
export const setAdmin: RequestHandler = async (req, res) => {
    const { target } = req.params;
    const user = await User.findOne({ userid: target });
    if (!user) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다');
    }
    if (user.authority === 'admin' || user.authority === 'bot') {
        throw new AuthUserAlreadyAdminError(
            '이미 관리자 권한을 가진 사용자입니다'
        );
    }
    await User.findOneAndUpdate({ userid: target }, { authority: 'admin' });
    res.status(200).json({
        success: true,
        message: '관리자 권한이 성공적으로 설정되었습니다'
    });
};

//admin required
export const unSetAdmin: RequestHandler = async (req, res) => {
    const { target } = req.params;
    const adminUser = (req as any).user;
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
    if (targetUser.authority !== 'admin' && targetUser.authority !== 'bot') {
        throw new UserNotAdminError('대상 사용자가 관리자가 아닙니다');
    }
    await User.findOneAndUpdate({ userid: target }, { authority: 'user' });
    res.status(200).json({
        success: true,
        message: '관리자 권한이 성공적으로 제거되었습니다'
    });
};

export const verifyUser: RequestHandler = async (req, res) => {
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
export const unVerifyUser: RequestHandler = async (req, res) => {
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
export const adminUserDelete: RequestHandler = async (req, res) => {
    const { target } = req.params;
    const user = (req as any).user;
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
export const adminUserList: RequestHandler = async (req, res) => {
    const user = (req as any).user;
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
export const getActiveTokens: RequestHandler = async (req, res) => {
    const currentUser = (req as any).user;
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
export const revokeAllOtherTokens: RequestHandler = async (req, res) => {
    const currentUser = (req as any).user;
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
export const adminRevokeUserTokens: RequestHandler = async (req, res) => {
    const { userid } = req.body;
    const adminUser = (req as any).user;

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
export const systemCleanup: RequestHandler = async (req, res) => {
    const user = (req as any).user;

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
export const getCurrentKey: RequestHandler = async (req, res) => {
    const user = (req as any).user;
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
