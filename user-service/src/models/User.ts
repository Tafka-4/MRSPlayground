import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import fs from 'fs';
import path from 'path';
import { redisClient } from '../config/redis.js';
import {
    UserError,
    UserNotValidPasswordError,
    UserNotFoundError,
    UserNotLoginError,
    UserTokenVerificationFailedError,
    UserImageUploadFailedError,
    UserImageDeleteFailedError
} from '../utils/errors.js';
import { BaseModel } from './BaseModel.js';
import { RowDataPacket } from 'mysql2';

export interface IUser {
    userid: string;
    id: string;
    nickname: string;
    password: string;
    email: string;
    isVerified: boolean;
    authority: 'user' | 'admin' | 'bot';
    description?: string;
    profileImage?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class User {
    private static tableName = 'users';

    private data: IUser;

    constructor(userData: IUser) {
        this.data = userData;
    }
    
    private static getContext() {
        return {
            model: User,
            tableName: this.tableName,
            buildWhereClause: BaseModel.buildWhereClause
        };
    }

    static async create(
        userData: Omit<IUser, 'userid' | 'isVerified'>
    ): Promise<User> {
        const userid = uuidv4();
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser: IUser = {
            ...userData,
            userid,
            password: hashedPassword,
            isVerified: false,
            authority: userData.authority || 'user',
            description: userData.description || '',
            profileImage: userData.profileImage || ''
        };
        
        const {isVerified, ...insertData} = newUser;

        const columns = Object.keys(insertData)
            .map((key) => pool.escapeId(key))
            .join(', ');
        const placeholders = Object.keys(insertData)
            .map(() => '?')
            .join(', ');
        const values = Object.values(insertData);

        await pool.execute(
            `INSERT INTO users (${columns}) VALUES (${placeholders})`,
            values
        );

        return new User(newUser);
    }
    
    static async find(query: Partial<IUser> & { nickname?: { $regex: string; }; }, limit?: number, page?: number): Promise<User[]> {
        let sql = `SELECT * FROM ${this.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = BaseModel.buildWhereClause(query, values, pool);
            sql += ` WHERE ${conditions}`;
        }

        sql += ` ORDER BY createdAt DESC`;

        if (limit && limit > 0) {
            const limitValue = Math.max(1, Math.min(100, Number(limit) || 10));
            const pageValue = Math.max(1, Number(page) || 1);
            const offset = (pageValue - 1) * limitValue;
            sql += ` LIMIT ? OFFSET ?`;
            values.push(limitValue, offset);
        }

        const [rows] = await pool.query(sql, values);
        return (rows as RowDataPacket[]).map((row) => new User(row as IUser));
    }

    static async findOne(query: Partial<IUser>): Promise<User | null> {
        let sql = `SELECT * FROM ${this.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = BaseModel.buildWhereClause(query, values, pool);
            sql += ` WHERE ${conditions}`;
        }
        sql += ` LIMIT 1`;

        const [rows] = await pool.query(sql, values);
        if ((rows as RowDataPacket[]).length === 0) {
            return null;
        }
        return new User((rows as RowDataPacket[])[0] as IUser);
    }

    static async count(query: Partial<IUser> & { nickname?: { $regex: string; }; }): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = BaseModel.buildWhereClause(query, values, pool);
            sql += ` WHERE ${conditions}`;
        }

        const [rows] = await pool.query(sql, values);
        return (rows as any[])[0].count;
    }

    static async findOneAndUpdate(
        query: Partial<IUser>,
        update: Partial<IUser>,
        options?: { new?: boolean }
    ): Promise<User | null> {
        const user = await this.findOne(query);
        if (!user) return null;

        const updateData = { ...update };

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        if (Object.keys(updateData).length === 0) return user;
        
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        await BaseModel.update(context, query, updateData);

        if (user) {
            await redisClient.del(`user:${user.data.userid}`);
            if (options?.new) {
                return await this.findOne({ userid: user.data.userid });
            }
        }
        
        const updatedUser = await this.findOne(query);
        return updatedUser;
    }

    static async deleteOne(query: Partial<IUser>): Promise<void> {
        const user = await this.findOne(query);
        if (!user) return;

        if (user.data.profileImage) {
            try {
                const actualFilePath = user.data.profileImage.replace(
                    '/uploads/profile-image/',
                    './uploads/profile/'
                );
                if (fs.existsSync(actualFilePath)) {
                    fs.unlinkSync(actualFilePath);
                }
            } catch (error) {
                console.warn(`Failed to delete profile image: ${error}`);
            }
        }
        await pool.execute('DELETE FROM refresh_tokens WHERE userid = ?', [
            user.data.userid
        ]);
        await redisClient.del(`${user.data.userid}:refreshToken`);
        await redisClient.del(`user:${user.data.userid}`);

        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        await BaseModel.delete(context, { userid: user.data.userid });
    }

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return await bcrypt.compare(candidatePassword, this.data.password);
    }

    async generateTokens(): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        await redisClient.del(`user:${this.data.userid}`);
        const accessToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '5m', algorithm: 'HS256' }
        );
        const refreshToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE userid = ? AND is_revoked = FALSE',
            [this.data.userid]
        );

        await pool.execute(
            'INSERT INTO refresh_tokens (userid, refresh_token, expires_at) VALUES (?, ?, ?)',
            [this.data.userid, refreshToken, expiresAt]
        );

        await redisClient.set(
            `${this.data.userid}:refreshToken`,
            refreshToken,
            { EX: 60 * 60 * 24 * 7 }
        );

        return { accessToken, refreshToken };
    }

    async verifyToken(token: string): Promise<jwt.JwtPayload> {
        try {
            return jwt.verify(token, process.env.JWT_SECRET as string, {
                algorithms: ['HS256']
            }) as jwt.JwtPayload;
        } catch (error) {
            throw new UserTokenVerificationFailedError(
                'Token verification failed'
            );
        }
    }

    async logout(): Promise<number> {
        const [result] = (await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE userid = ? AND is_revoked = FALSE',
            [this.data.userid]
        )) as any;

        await redisClient.del(`${this.data.userid}:refreshToken`);
        await redisClient.del(`user:${this.data.userid}`);

        return result.affectedRows || 0;
    }

    async refresh(checkRefreshToken: string): Promise<string> {
        let refreshToken = await redisClient.get(
            `${this.data.userid}:refreshToken`
        );

        if (refreshToken && refreshToken === checkRefreshToken) {
            const accessToken = jwt.sign(
                { userid: this.data.userid },
                process.env.JWT_SECRET as string,
                { expiresIn: '15m', algorithm: 'HS256' }
            );
            await redisClient.del(`user:${this.data.userid}`);
            return accessToken;
        }

        const [rows] = (await pool.execute(
            `SELECT refresh_token, expires_at, is_revoked 
             FROM refresh_tokens 
             WHERE userid = ? AND refresh_token = ? AND is_revoked = FALSE
             ORDER BY issued_at DESC LIMIT 1`,
            [this.data.userid, checkRefreshToken]
        )) as any;

        if (rows.length === 0) {
            throw new UserNotLoginError('Unauthorized');
        }

        const tokenData = rows[0];

        if (new Date() > new Date(tokenData.expires_at)) {
            await pool.execute(
                'UPDATE refresh_tokens SET is_revoked = TRUE WHERE userid = ? AND refresh_token = ?',
                [this.data.userid, checkRefreshToken]
            );
            throw new UserTokenVerificationFailedError('Token has expired');
        }

        await redisClient.set(
            `${this.data.userid}:refreshToken`,
            checkRefreshToken,
            {
                EX: Math.floor(
                    (new Date(tokenData.expires_at).getTime() - Date.now()) /
                        1000
                )
            }
        );

        const accessToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '15m', algorithm: 'HS256' }
        );
        await redisClient.del(`user:${this.data.userid}`);
        return accessToken;
    }

    async uploadProfileImage(file: Express.Multer.File): Promise<string> {
        const extension = file.originalname.split('.').pop();
        if (!extension) {
            throw new UserImageUploadFailedError('Invalid file extension');
        }
        if (
            extension !== 'png' &&
            extension !== 'jpg' &&
            extension !== 'jpeg'
        ) {
            throw new UserImageUploadFailedError('Invalid file extension');
        }
        const filename = `${createHmac(
            'sha256',
            process.env.JWT_SECRET as string
        )
            .update(this.data.userid)
            .digest('hex')}.${extension}`;
        const filePath = `./uploads/profile/${filename}`;

        try {
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            fs.writeFileSync(filePath, file.buffer);
        } catch (error) {
            throw new UserImageUploadFailedError(
                'Failed to save profile image'
            );
        }

        const webPath = `/uploads/profile-image/${filename}`;
        this.data.profileImage = webPath;
        const context = { tableName: User.tableName, buildWhereClause: BaseModel.buildWhereClause };
        await BaseModel.update(
            context,
            { userid: this.data.userid },
            { profileImage: webPath }
        );

        await redisClient.del(`user:${this.data.userid}`);

        return webPath;
    }

    async deleteProfileImage(): Promise<void> {
        if (!this.data.profileImage) {
            throw new UserImageDeleteFailedError('Profile image not found');
        }

        try {
            const actualFilePath = this.data.profileImage.replace(
                '/uploads/profile-image/',
                './uploads/profile/'
            );
            if (fs.existsSync(actualFilePath)) {
                fs.unlinkSync(actualFilePath);
            }
        } catch (error) {
            throw new UserImageDeleteFailedError(
                'Failed to delete profile image'
            );
        }

        this.data.profileImage = '';
        const context = { tableName: User.tableName, buildWhereClause: BaseModel.buildWhereClause };
        await BaseModel.update(
            context,
            { userid: this.data.userid },
            { profileImage: '' }
        );

        await redisClient.del(`user:${this.data.userid}`);
    }

    async revokeAllRefreshTokens(): Promise<void> {
        await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE userid = ? AND is_revoked = FALSE',
            [this.data.userid]
        );
        await redisClient.del(`${this.data.userid}:refreshToken`);
    }

    async cleanupExpiredTokens(): Promise<void> {
        await pool.execute(
            'DELETE FROM refresh_tokens WHERE userid = ? AND (expires_at < NOW() OR is_revoked = TRUE)',
            [this.data.userid]
        );
    }

    static async cleanupAllExpiredTokens(): Promise<void> {
        await pool.execute(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = TRUE'
        );
    }

    static async performMaintenanceCleanup(): Promise<{
        deletedTokens: number;
        revokedExpiredTokens: number;
    }> {
        const [revokeResult] = (await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE expires_at < NOW() AND is_revoked = FALSE'
        )) as any;

        const [deleteResult] = (await pool.execute(
            'DELETE FROM refresh_tokens WHERE is_revoked = TRUE AND issued_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
        )) as any;

        return {
            revokedExpiredTokens: revokeResult.affectedRows || 0,
            deletedTokens: deleteResult.affectedRows || 0
        };
    }

    async getActiveRefreshTokens(): Promise<any[]> {
        const [rows] = (await pool.execute(
            'SELECT id, issued_at, expires_at FROM refresh_tokens WHERE userid = ? AND is_revoked = FALSE AND expires_at > NOW() ORDER BY issued_at DESC',
            [this.data.userid]
        )) as any;
        return rows;
    }

    async validateRefreshToken(checkRefreshToken: string): Promise<boolean> {
        try {
            const cachedToken = await redisClient.get(
                `${this.data.userid}:refreshToken`
            );

            if (cachedToken && cachedToken === checkRefreshToken) {
                return true;
            }

            const [rows] = (await pool.execute(
                `SELECT refresh_token, expires_at, is_revoked 
                 FROM refresh_tokens 
                 WHERE userid = ? AND refresh_token = ? AND is_revoked = FALSE
                 ORDER BY issued_at DESC LIMIT 1`,
                [this.data.userid, checkRefreshToken]
            )) as any;

            if (rows.length === 0) {
                return false;
            }

            const tokenData = rows[0];

            if (new Date() > new Date(tokenData.expires_at)) {
                await pool.execute(
                    'UPDATE refresh_tokens SET is_revoked = TRUE WHERE userid = ? AND refresh_token = ?',
                    [this.data.userid, checkRefreshToken]
                );
                return false;
            }

            await redisClient.set(
                `${this.data.userid}:refreshToken`,
                checkRefreshToken,
                {
                    EX: Math.floor(
                        (new Date(tokenData.expires_at).getTime() -
                            Date.now()) /
                            1000
                    )
                }
            );

            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    toJSON(): Omit<IUser, 'password'> {
        const { password, ...userWithoutPassword } = this.data;
        return userWithoutPassword;
    }

    get userid() {
        return this.data.userid;
    }
    get id() {
        return this.data.id;
    }
    get nickname() {
        return this.data.nickname;
    }
    get username() {
        return this.data.nickname;
    }
    get email() {
        return this.data.email;
    }
    get isVerified() {
        return this.data.isVerified;
    }
    get authority() {
        return this.data.authority;
    }
    get description() {
        return this.data.description;
    }
    get profileImage() {
        return this.data.profileImage;
    }
    get createdAt() {
        return this.data.createdAt;
    }
    get updatedAt() {
        return this.data.updatedAt;
    }
}
