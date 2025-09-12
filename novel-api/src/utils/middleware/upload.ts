import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const storage = multer.memoryStorage();


function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    console.log('[upload:fileFilter] called', {
        url: (req as any)?.originalUrl,
        method: (req as any)?.method,
        mimetype: file?.mimetype,
        originalname: file?.originalname
    });
    if (!file.mimetype.startsWith('image/')) {
        console.log('[upload:fileFilter] reject: not image mimetype', { mimetype: file.mimetype });
        return cb(null, false);
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const fileExtension = path.extname(file.originalname || '').toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
        console.log('[upload:fileFilter] accept', { ext: fileExtension });
        cb(null, true);
    } else {
        console.log('[upload:fileFilter] reject: invalid extension', { ext: fileExtension });
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