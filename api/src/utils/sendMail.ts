import nodemailer from "nodemailer";
import dotenv from "dotenv";
import authError from "./error/authError.js";
dotenv.config();

export const sendMail = async (email: string, subject: string, content: string) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: content,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new authError.AuthError("Failed to send verification email");
    }
};
