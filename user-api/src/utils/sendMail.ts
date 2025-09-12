import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { IContact } from '../models/Contact.js';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

export const sendContactReceipt = async (to: string, subject: string): Promise<void> => {
    const receiptHtml = `
        <h1>문의가 성공적으로 접수되었습니다.</h1>
        <p>안녕하세요, 문의해주셔서 감사합니다.</p>
        <p><strong>제목:</strong> ${subject}</p>
        <p>최대한 빨리 확인 후 답변드리겠습니다.</p>
    `;
    await sendMail(to, `문의 접수 확인: ${subject}`, receiptHtml);
};

export const sendContactNotificationToAdmin = async (subject: string, contact: IContact): Promise<void> => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
        console.error('Admin email not configured.');
        return;
    }

    const notificationHtml = `
        <h1>새로운 문의가 접수되었습니다.</h1>
        <p><strong>ID:</strong> ${contact.id}</p>
        <p><strong>작성자 이메일:</strong> ${contact.email}</p>
        <p><strong>카테고리:</strong> ${contact.category}</p>
        <p><strong>제목:</strong> ${contact.subject}</p>
        <p><strong>내용:</strong></p>
        <p>${contact.message}</p>
    `;
    await sendMail(adminEmail, subject, notificationHtml);
}; 