import { Request, Response, RequestHandler } from "express";
import { escape } from "html-escaper";
import { User } from "../models/User.js";
import { UserError, UserNotValidPasswordError, UserNotFoundError, UserNotLoginError, UserForbiddenError, UserImageDeleteFailedError } from "../utils/errors.js";

interface RequestWithFile extends Request {
    file?: {
        originalname: string;
        buffer: Buffer;
    };
}

export const registerUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, password, email, description } = req.body;
    if (!username || !password || !email) {
        throw new UserError("Username, password, and email are required");
    }
    if (password.length < 8) {
        throw new UserError("Password must be at least 8 characters long");
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new UserError("Invalid email address");
    }
    const userData = {
        username: escape(username),
        password: password,
        email: email,
        authority: "user" as const,
        description: description ? escape(description) : "",
        profileImage: ""
    }
    const user = await User.create(userData);
    res.status(201).json(user.toJSON());
};

export const loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new UserError("Email and password are required");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new UserNotValidPasswordError("Invalid email or password");
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new UserNotValidPasswordError("Invalid email or password");
    }
    const tokens = await user.generateTokens();
    res.status(200).json({ tokens, user: user.toJSON() });
};

// login required
export const logoutUser: RequestHandler = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    const isLogout = await user.logout();
    if (isLogout === 0) {   
        throw new UserNotLoginError("User not logged in");
    }
    res.status(200).json({ message: "Logged out successfully" });
};

export const refreshToken: RequestHandler = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const refreshToken = req.body.refreshToken;
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    const accessToken = await user.refresh(refreshToken);
    res.status(200).json({ accessToken });
};

export const getUser: RequestHandler = async (req: Request, res: Response) => {
    const { userid } = req.params;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    res.status(200).json(user.toJSON());
};

export const getUserList: RequestHandler = async (req: Request, res: Response) => {
    const { query, limit } = req.query;
    const limitNumber = parseInt(limit as string) || 10;
    if (limitNumber < 1 || limitNumber > 100) {
        throw new UserError("Limit number must be between 1 and 100");
    }
    
    let searchQuery: any = {};
    if (query && typeof query === 'string') {
        searchQuery = { username: { $regex: query } };
    }
    
    const users = await User.find(searchQuery, limitNumber);
    res.status(200).json(users.map(user => user.toJSON()));
}

// login required
export const updateUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, description } = req.body;
    const currentUser = (req as any).user;
    const user = await User.findOneAndUpdate({ userid: currentUser?.userid }, { username, description }, { new: true });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (user.userid !== currentUser?.userid) {
        throw new UserForbiddenError("You are not allowed to update this user");
    }
    res.status(200).json(user.toJSON());
}

// login required
export const uploadUserProfileImage: RequestHandler = async (req: RequestWithFile, res: Response) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (!req.file) {
        throw new UserError("No file uploaded");
    }

    await user.uploadProfileImage(req.file);
    res.status(200).json({ message: "Profile image updated successfully", profileImage: user.profileImage });
}

// login required
export const deleteUserProfileImage: RequestHandler = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    if (!user.profileImage) {
        throw new UserImageDeleteFailedError("No profile image to delete");
    }
    await user.deleteProfileImage();
    res.status(200).json({ message: "Profile image deleted successfully" });
}

// login required
export const deleteUser: RequestHandler = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError("User not found");
    }
    await User.deleteOne({ userid: user.userid });
    res.status(200).json({ message: "User deleted successfully" });
} 