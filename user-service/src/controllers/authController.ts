import { Request, Response, RequestHandler } from "express";
import { randomBytes } from "crypto";
import { escape } from "html-escaper";
import { User } from "../models/User.js";
import { redisClient } from "../config/redis.js";
import { sendMail } from "../utils/sendMail.js";
import { AuthError, AuthEmailVerifyFailedError, AuthUserAlreadyAdminError, UserNotFoundError, UserNotValidPasswordError, UserError, UserNotLoginError, UserTokenVerificationFailedError } from "../utils/errors.js";
import jwt from "jsonwebtoken";

// Authentication methods
export const registerUser: RequestHandler = async (req: Request, res: Response) => {
    const { id, password, email, nickname } = req.body;
    if (!id || !password || !email) {
        throw new UserError("아이디, 비밀번호, 이메일은 필수 입력 항목입니다");
    }
    
    if (password.length < 8) {
        throw new UserError("비밀번호는 8자 이상이어야 합니다");
    }
    
    if (!/^[a-zA-Z0-9!@#$%^&*()_{}]+$/.test(password)) {
        throw new UserError("비밀번호에 허용되지 않는 문자가 포함되어 있습니다. 영문자, 숫자, 특수문자(!@#$%^&*()_{})만 사용 가능합니다");
    }
    
    if (!/[!@#$%^&*()_{}]/.test(password)) {
        throw new UserError("비밀번호는 최소 하나의 특수문자(!@#$%^&*()_{})를 포함해야 합니다");
    }
    
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new UserError("올바르지 않은 이메일 형식입니다");
    }
    const isVerified = await redisClient.get(`${email}:isVerified`);
    if (!isVerified) {
        throw new AuthError("이메일 인증이 완료되지 않았습니다");
    }
    const userData = {
        id: escape(id),
        password: password,
        email: email,
        nickname: nickname ? escape(nickname) : escape(id),
        authority: "user" as const,
        description: "",
        profileImage: ""
    }
    const user = await User.create(userData);
    res.status(201).json({ success: true, message: "회원가입이 성공적으로 완료되었습니다", user: user.toJSON() });
};

export const loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { id, password } = req.body;
    if (!id || !password) {
        throw new UserError("아이디와 비밀번호를 입력해주세요");
    }
    const user = await User.findOne({ id });
    if (!user) {
        throw new UserNotValidPasswordError("아이디 또는 비밀번호가 올바르지 않습니다");
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new UserNotValidPasswordError("아이디 또는 비밀번호가 올바르지 않습니다");
    }
    const tokens = await user.generateTokens();
    
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    
    res.status(200).json({ 
        success: true, 
        message: "로그인이 성공적으로 완료되었습니다",
        accessToken: tokens.accessToken,
        user: user.toJSON() 
    });
};

export const logoutUser: RequestHandler = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError("사용자를 찾을 수 없습니다");
    }
    const isLogout = await user.logout();
    if (isLogout === 0) {   
        throw new UserNotLoginError("로그인 상태가 아닙니다");
    }
    
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    
    res.status(200).json({ success: true, message: "로그아웃이 성공적으로 완료되었습니다" });
};

export const refreshToken: RequestHandler = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
        throw new UserNotLoginError("리프레시 토큰을 찾을 수 없습니다");
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const user = await User.findOne({ userid: decoded.userid });
        
        if (!user) {
            throw new UserNotFoundError("사용자를 찾을 수 없습니다");
        }

        const accessToken = await user.refresh(refreshToken);
        res.status(200).json({ success: true, accessToken });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UserTokenVerificationFailedError("유효하지 않은 리프레시 토큰입니다");
        }
        throw error;
    }
};

// Get current user info (login required)
export const getCurrentUser: RequestHandler = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ success: false, message: "로그인이 필요합니다" });
            return;
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const user = await User.findOne({ userid: decoded.userid });
        
        if (!user) {
            res.status(401).json({ success: false, message: "사용자를 찾을 수 없습니다" });
            return;
        }

        const storedRefreshToken = await redisClient.get(`${user.userid}:refreshToken`);
        if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
            res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다" });
            return;
        }

        res.status(200).json(user.toJSON());
    } catch (error) {
        res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다" });
    }
};

// Email verification methods
export const sendVerificationEmail: RequestHandler = async (req, res) => {
    const { email } = req.body;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`${email}:verificationCode`, verificationCode, { EX: 60 * 10 });
    const subject = "이메일 인증";
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
    res.status(200).json({ success: true, message: "인증 이메일이 발송되었습니다" });
}

export const verifyEmail: RequestHandler = async (req, res) => {
    const { email, pin } = req.body;
    const verificationCode = pin || req.body.verificationCode;
    const verificationCodeFromRedis = await redisClient.get(`${email}:verificationCode`);
    if (verificationCodeFromRedis !== verificationCode) {
        throw new AuthEmailVerifyFailedError("인증 코드가 올바르지 않습니다");
    }
    await redisClient.del(`${email}:verificationCode`);
    await redisClient.set(`${email}:isVerified`, "true", { EX: 60 * 60 * 24 });
    res.status(200).json({ success: true, message: "이메일 인증이 성공적으로 완료되었습니다" });
}

//login required
export const changeEmail: RequestHandler = async (req, res) => {
    const { userid, newEmail } = req.body;
    const user = await User.findOneAndUpdate({ userid }, { email: newEmail, isVerified: false });
    if (!user) {
            throw new UserNotFoundError("사용자를 찾을 수 없거나 새 이메일이 현재 이메일과 동일합니다");
    }
    res.status(200).json({ success: true, message: "이메일이 성공적으로 변경되었습니다" });
}

// login required
export const changePassword: RequestHandler = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const currentUser = (req as any).user;
    
    if (!currentUser) {
        throw new UserNotFoundError("사용자를 찾을 수 없습니다");
    }
    
    if (!currentPassword || !newPassword) {
        throw new UserError("현재 비밀번호와 새 비밀번호를 입력해주세요");
    }
    
    if (newPassword.length < 8) {
        throw new UserError("새 비밀번호는 8자 이상이어야 합니다");
    }
    
    if (!/^[a-zA-Z0-9!@#$%^&*()_{}]+$/.test(newPassword)) {
        throw new UserError("새 비밀번호에 허용되지 않는 문자가 포함되어 있습니다. 영문자, 숫자, 특수문자(!@#$%^&*()_{})만 사용 가능합니다");
    }
    
    if (!/[!@#$%^&*()_{}]/.test(newPassword)) {
        throw new UserError("새 비밀번호는 최소 하나의 특수문자(!@#$%^&*()_{})를 포함해야 합니다");
    }
    
    if (!/[a-zA-Z]/.test(newPassword)) {
        throw new UserError("새 비밀번호는 영문자를 포함해야 합니다");
    }
    
    if (!/[0-9]/.test(newPassword)) {
        throw new UserError("새 비밀번호는 숫자를 포함해야 합니다");
    }
    
    if (!(await currentUser.comparePassword(currentPassword))) {
        throw new UserNotValidPasswordError("현재 비밀번호가 올바르지 않습니다");
    }
    
    if (currentPassword === newPassword) {
        throw new UserError("새 비밀번호는 현재 비밀번호와 달라야 합니다");
    }
    
    await User.findOneAndUpdate({ userid: currentUser.userid }, { password: newPassword });
    res.status(200).json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다" });
}

export const resetPasswordMailSend: RequestHandler = async (req, res) => {
    let { email, id } = req.body;
    let user;
    
    if (!email && !id) {
        throw new UserError("이메일 또는 아이디를 입력해주세요");
    }
    
    if (email) {
        user = await User.findOne({ email });
    } else if (id) {
        user = await User.findOne({ id });
        email = user?.email;
    }
    
    if (!user) {
        throw new UserNotFoundError("해당 정보로 가입된 사용자를 찾을 수 없습니다");
    }
    
    const newPassword = "flag{" + randomBytes(32).toString("hex") + "}";
    const subject = "임시 비밀번호 발급";
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
    res.status(200).json({ success: true, message: "임시 비밀번호가 이메일로 발송되었습니다" });
}

// admin required
export const setAdmin: RequestHandler = async (req, res) => {
    const { userid } = req.body;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError("사용자를 찾을 수 없습니다");
    }
    if (user.authority === "admin") {
        throw new AuthUserAlreadyAdminError("이미 관리자 권한을 가진 사용자입니다");
    }
    await User.findOneAndUpdate({ userid }, { authority: "admin" });
    res.status(200).json({ success: true, message: "관리자 권한이 성공적으로 설정되었습니다" });
}