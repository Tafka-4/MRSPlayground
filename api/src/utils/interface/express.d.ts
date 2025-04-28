import { IUser } from "../../model/userModel.ts";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}