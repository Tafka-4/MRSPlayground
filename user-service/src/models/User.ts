import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import fs from 'fs';
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

        if (limit) {
            sql += ' LIMIT ?';
            values.push(limit);
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
            const actualFilePath = user.data.profileImage.replace(
                '/uploads/profile-image/',
                './uploads/profile/'
            );
            if (fs.existsSync(actualFilePath)) {
                fs.unlinkSync(actualFilePath);
            }
        }

        await redisClient.del(`${user.data.userid}:refreshToken`);
        await redisClient.del(`${user.data.userid}:favorites`);
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
        const accessToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
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
        const result = await redisClient.del(
            `${this.data.userid}:refreshToken`
        );
        return result;
    }

    async refresh(checkRefreshToken: string): Promise<string> {
        const refreshToken = await redisClient.get(
            `${this.data.userid}:refreshToken`
        );
        if (!refreshToken) throw new UserNotLoginError('Unauthorized');
        if (refreshToken !== checkRefreshToken)
            throw new UserTokenVerificationFailedError(
                'Token verification failed'
            );
        const accessToken = jwt.sign(
            { userid: this.data.userid },
            process.env.JWT_SECRET as string,
            { expiresIn: '15m' }
        );
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
        fs.writeFileSync(filePath, file.buffer);

        const webPath = `/uploads/profile-image/${filename}`;
        this.data.profileImage = webPath;
        await User.findOneAndUpdate(
            { userid: this.data.userid },
            { profileImage: webPath }
        );

        // 프로필 이미지 업데이트 후 캐시 무효화
        await redisClient.del(`user:${this.data.userid}`);

        return webPath;
    }

    async deleteProfileImage(): Promise<void> {
        if (!this.data.profileImage) {
            throw new UserImageDeleteFailedError('Profile image not found');
        }

        const actualFilePath = this.data.profileImage.replace(
            '/uploads/profile-image/',
            './uploads/profile/'
        );
        if (fs.existsSync(actualFilePath)) {
            fs.unlinkSync(actualFilePath);
        }

        this.data.profileImage = '';
        await User.findOneAndUpdate(
            { userid: this.data.userid },
            { profileImage: '' }
        );

        // 프로필 이미지 삭제 후 캐시 무효화
        await redisClient.del(`user:${this.data.userid}`);
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
