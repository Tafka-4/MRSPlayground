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

export interface IUser {
    userid: string;
    id: string;
    nickname: string;
    password: string;
    email: string;
    isVerified: boolean;
    authority: 'user' | 'admin';
    description?: string;
    profileImage?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class User {
    private data: IUser;

    constructor(userData: IUser) {
        this.data = userData;
    }

    static async create(
        userData: Omit<IUser, 'userid' | 'isVerified'>
    ): Promise<User> {
        const userid = uuidv4();
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const [result] = await pool.execute(
            `INSERT INTO users (userid, id, nickname, password, email, authority, description, profileImage) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userid,
                userData.id,
                userData.nickname,
                hashedPassword,
                userData.email,
                userData.authority || 'user',
                userData.description || '',
                userData.profileImage || ''
            ]
        );

        const newUser: IUser = {
            userid,
            id: userData.id,
            nickname: userData.nickname,
            password: hashedPassword,
            email: userData.email,
            isVerified: false,
            authority: userData.authority || 'user',
            description: userData.description || '',
            profileImage: userData.profileImage || ''
        };

        return new User(newUser);
    }

    static async findOne(query: Partial<IUser>): Promise<User | null> {
        let sql = 'SELECT * FROM users WHERE ';
        const conditions: string[] = [];
        const values: any[] = [];

        Object.entries(query).forEach(([key, value]) => {
            conditions.push(`${key} = ?`);
            values.push(value);
        });

        sql += conditions.join(' AND ');

        const [rows] = await pool.execute(sql, values);
        const users = rows as IUser[];

        if (users.length === 0) return null;

        const userData = users[0];

        return new User(userData);
    }

    static async find(
        query: Partial<IUser> & { nickname?: { $regex: string } },
        limit?: number
    ): Promise<User[]> {
        let sql = 'SELECT * FROM users';
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            sql += ' WHERE ';
            const conditions: string[] = [];

            Object.entries(query).forEach(([key, value]) => {
                if (
                    key === 'nickname' &&
                    typeof value === 'object' &&
                    value &&
                    '$regex' in value
                ) {
                    conditions.push(`${key} LIKE ?`);
                    values.push(`%${value.$regex}%`);
                } else {
                    conditions.push(`${key} = ?`);
                    values.push(value);
                }
            });

            sql += conditions.join(' AND ');
        }

        if (limit && limit > 0) {
            const limitValue = Number(limit);
            if (!isNaN(limitValue) && limitValue >= 1) {
                sql += ` LIMIT ${Math.floor(limitValue)}`;
            }
        }

        const [rows] = await pool.execute(sql, values);
        const users = rows as IUser[];

        return users.map((userData) => {
            return new User(userData);
        });
    }

    static async findOneAndUpdate(
        query: Partial<IUser>,
        update: Partial<IUser>,
        options?: { new?: boolean }
    ): Promise<User | null> {
        const user = await User.findOne(query);
        if (!user) return null;

        const updateFields: string[] = [];
        const values: any[] = [];

        Object.entries(update).forEach(([key, value]) => {
            if (key === 'password') {
                updateFields.push(`${key} = ?`);
                values.push(bcrypt.hashSync(value as string, 10));
            } else {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updateFields.length === 0) return user;

        values.push(user.data.userid);

        await pool.execute(
            `UPDATE users SET ${updateFields.join(
                ', '
            )}, updatedAt = CURRENT_TIMESTAMP WHERE userid = ?`,
            values
        );

        await redisClient.del(`user:${user.data.userid}`);

        if (options?.new) {
            return await User.findOne({ userid: user.data.userid });
        }

        return user;
    }

    static async deleteOne(query: Partial<IUser>): Promise<void> {
        const user = await User.findOne(query);
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

        await pool.execute('DELETE FROM users WHERE userid = ?', [
            user.data.userid
        ]);
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
            { expiresIn: '5m' }
        );
        const refreshToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
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
            return jwt.verify(
                token,
                process.env.JWT_SECRET as string
            ) as jwt.JwtPayload;
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
                { expiresIn: '15m' }
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
            { expiresIn: '15m' }
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
        await User.findOneAndUpdate(
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
        await User.findOneAndUpdate(
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
}
