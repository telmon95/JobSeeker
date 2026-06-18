import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (_req, file, cb) => {
    cb(null, `cv-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const ALLOWED_EXTENSIONS = /\.(pdf|docx?|odt|rtf|txt|md|csv|jpe?g|png|webp|heic)$/i;

const MIME_MAP: Record<string, RegExp> = {
  '.pdf': /pdf/,
  '.doc': /msword|word/,
  '.docx': /wordprocessingml|officedocument/,
  '.odt': /opendocument|oasis/,
  '.rtf': /rtf|plain/,
  '.txt': /text\/plain/,
  '.md': /text\/(plain|markdown)/,
  '.csv': /text\/(plain|csv)/,
  '.jpg': /jpeg/,
  '.jpeg': /jpeg/,
  '.png': /png/,
  '.webp': /webp/,
  '.heic': /heic|heif/,
};

function checkFileType(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.test(ext)) {
    return cb(
      new Error(
        'Unsupported format. Upload PDF, Word (.doc/.docx), ODT, RTF, TXT, MD, or image (JPG/PNG).'
      )
    );
  }

  const mimePattern = MIME_MAP[ext];
  if (mimePattern && !mimePattern.test(file.mimetype)) {
    if (file.mimetype !== 'application/octet-stream') {
      return cb(new Error(`Invalid file type for ${ext}. Please upload a valid document.`));
    }
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: checkFileType,
});
