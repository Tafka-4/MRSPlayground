import { RequestHandler } from "express";
import { randomBytes } from "crypto";
import { User } from "../models/User.js";
import { redisClient } from "../config/redis.js";
import { sendMail } from "../utils/sendMail.js";
import { AuthError, AuthEmailVerifyFailedError, AuthUserAlreadyAdminError, UserNotFoundError, UserNotValidPasswordError } from "../utils/errors.js";

// login required
export const sendVerificationEmail: RequestHandler = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (user.isVerified) {
        throw new AuthError("User already verified");
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`${email}:verificationCode`, verificationCode, { EX: 60 * 10 });
    const subject = "Email Verification";
    const content = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #333;">Email Verification</h2>
            <p style="font-size: 16px; color: #555;">
                Please use the following verification code to complete your signup:
            </p>
            <div style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; margin: 10px 0;">
                <strong style="font-size: 24px; color: #222;">${verificationCode}</strong>
            </div>
            <p style="font-size: 14px; color: #777;">
                If you didn't request this, you can ignore this email.
            </p>
        </div>
    `;
    await sendMail(email, subject, content);
    res.status(200).json({ message: "Verification email sent" });
}

// login required
export const verifyEmail: RequestHandler = async (req, res) => {
    const { email, verificationCode } = req.body;
    const verificationCodeFromRedis = await redisClient.get(`${email}:verificationCode`);
    if (verificationCodeFromRedis !== verificationCode) {
        throw new AuthEmailVerifyFailedError("Invalid verification code");
    }
    await User.findOneAndUpdate({ email }, { isVerified: true });
    res.status(200).json({ message: "Email verified successfully" });
}

//login required
export const changeEmail: RequestHandler = async (req, res) => {
    const { userid, newEmail } = req.body;
    const user = await User.findOneAndUpdate({ userid }, { email: newEmail, isVerified: false });
    if (!user) {
            throw new UserNotFoundError("User not found or new email is the same as the current email");
    }
    res.status(200).json({ message: "Email changed successfully" });
}

// login required
export const changePassword: RequestHandler = async (req, res) => {
    const { userid, oldPassword, newPassword } = req.body;
    let user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (!(await user.comparePassword(oldPassword))) {
        throw new UserNotValidPasswordError("Invalid old password");
    }
    await User.findOneAndUpdate({ userid }, { password: newPassword });
    res.status(200).json({ message: "Password changed successfully" });
}

export const resetPasswordMailSend: RequestHandler = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    const newPassword = randomBytes(32).toString("hex");
    await redisClient.set(`${email}:newPassword`, newPassword, { EX: 60 * 5 });
    await redisClient.set(`${email}:passwordResetAuthRemain`, 5, { EX: 60 * 5 });
    const subject = "Password Reset";
    const content = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #333;">Password Reset</h2>
            <p style="font-size: 16px; color: #555;">
                Your new password is ${newPassword}.
            </p>
            <p style="font-size: 14px; color: #777;">
                If you didn't request this, you can ignore this email.
            </p>
        </div>
        `;
    await sendMail(email, subject, content);
    res.status(200).json({ message: "Password reset email sent" });
}

export const resetPassword: RequestHandler = async (req, res) => {
    const { email, newPassword } = req.body;
    const newPasswordFromRedis = await redisClient.get(`${email}:newPassword`);
    if (newPasswordFromRedis !== newPassword) {
        const passwordResetAuthRemain = await redisClient.get(`${email}:passwordResetAuthRemain`);
        if (Number(passwordResetAuthRemain) === 0) {
            await redisClient.del(`${email}:newPassword`);
            await redisClient.del(`${email}:passwordResetAuthRemain`);
            throw new AuthError("Password reset authentication failed");
        }
        await redisClient.set(`${email}:passwordResetAuthRemain`, Number(passwordResetAuthRemain) - 1, { EX: 60 * 5 });
        throw new AuthError("Invalid new password");
    }
    await User.findOneAndUpdate({ email }, { password: newPassword });
    res.status(200).json({ message: "Password reset successfully" });
}

// admin required
export const setAdmin: RequestHandler = async (req, res) => {
    const { userid } = req.body;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (user.authority === "admin") {
        throw new AuthUserAlreadyAdminError("User is already an admin");
    }
    await User.findOneAndUpdate({ userid }, { authority: "admin" });
    res.status(200).json({ message: "Admin set successfully" });
} 