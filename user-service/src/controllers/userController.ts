import { Request, Response, RequestHandler } from "express";
import { escape } from "html-escaper";
import { User } from "../models/User.js";
import { UserError, UserNotFoundError, UserForbiddenError, UserImageDeleteFailedError } from "../utils/errors.js";

interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

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
        searchQuery = { nickname: { $regex: query } };
    }
    
    const users = await User.find(searchQuery, limitNumber);
    res.status(200).json(users.map(user => user.toJSON()));
}

// login required
export const updateUser: RequestHandler = async (req: Request, res: Response) => {
    const { nickname, description } = req.body;
    const currentUser = (req as any).user;
    const user = await User.findOneAndUpdate({ userid: currentUser?.userid }, { nickname, description }, { new: true });
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