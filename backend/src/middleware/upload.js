import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (/\.(pdf|md|txt)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Markdown (.md), or Plain Text (.txt) files are allowed.'));
    }
  }
});
