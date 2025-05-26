export interface IUser {
    userid: string;
    username: string;
    email: string;
    authority: 'user' | 'admin';
    isVerified: boolean;
    description?: string;
    profileImage?: string;
    wroteNovels: string[];
    favoriteNovels: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}