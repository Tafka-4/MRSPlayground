import { Request, Response, RequestHandler } from "express";
import { escape } from "html-escaper";
import User from "../model/userModel.js";
import userError from "../utils/error/userError.js";

export const registerUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, password, email, description } = req.body;
    if (!username || !password || !email) {
        throw new userError.UserError("Username, password, and email are required");
    }
    if (password.length < 8) {
        throw new userError.UserError("Password must be at least 8 characters long");
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new userError.UserError("Invalid email address");
    }
    const userData = {
        username: escape(username),
        password: password,
        email: email,
        authority: "user",
        description: description ? escape(description) : "",
        profileImage: ""
    }
    const user = await User.create(userData);
    res.status(201).json(user);
};

export const loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new userError.UserError("Email and password are required");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new userError.UserNotValidPasswordError("Invalid email or password");
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new userError.UserNotValidPasswordError("Invalid email or password");
    }
    const tokens = await user.generateTokens();
    res.status(200).json({ tokens, user: user.toJSON() });
};

// login required
export const logoutUser: RequestHandler = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    const isLogout = await user.logout();
    if (isLogout === 0) {   
        throw new userError.UserNotLoginError("User not logged in");
    }
    res.status(200).json({ message: "Logged out successfully" });
};

export const refreshToken: RequestHandler = async (req: Request, res: Response) => {
    const user = req.user;
    const refreshToken = req.body.refreshToken;
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    const accessToken = await user.refresh(refreshToken);
    res.status(200).json({ accessToken });
};

export const getUser: RequestHandler = async (req: Request, res: Response) => {
    const { userid } = req.params;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    res.status(200).json(user);
};

export const getUserList: RequestHandler = async (req: Request, res: Response) => {
    const { query, limit } = req.query;
    const limitNumber = parseInt(limit as string) || 10;
    if (limitNumber < 1 || limitNumber > 100) {
        throw new userError.UserError("Limit number must be between 1 and 100");
    }
    const users = await User.find({ username: { $regex: query, $options: "i" } }).limit(limitNumber);
    res.status(200).json(users);
}

// login required
export const updateUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, description } = req.body;
    const user = await User.findOneAndUpdate({ userid: req.user?.userid }, { username, description }, { new: true });
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    if (user.userid !== req.user?.userid) {
        throw new userError.UserForbiddenError("You are not allowed to update this user");
    }
    res.status(200).json(user);
}

// login required
export const uploadUserProfileImage: RequestHandler = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    if (!req.file) {
        throw new userError.UserError("No file uploaded");
    }

    await user.uploadProfileImage(req.file);
    res.status(200).json({ message: "Profile image updated successfully", profileImage: user.profileImage });
}

// login required
export const deleteUserProfileImage: RequestHandler = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    if (!user.profileImage) {
        throw new userError.UserImageDeleteFailedError("No profile image to delete");
    }
    await user.deleteProfileImage();
    res.status(200).json({ message: "Profile image deleted successfully" });
}

// login required
export const deleteUser: RequestHandler = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    await User.deleteOne({ userid: user.userid });
    res.status(200).json({ message: "User deleted successfully" });
}
