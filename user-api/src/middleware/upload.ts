import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const storage = multer.memoryStorage();


function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    if (!file.mimetype.startsWith('image/')) {
        return false;
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

export default upload; 