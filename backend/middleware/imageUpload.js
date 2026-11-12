import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { AppError, badRequest } from '../utils/errors.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(badRequest('Upload a JPG, JPEG, PNG, or WEBP image.'));
      return;
    }
    callback(null, true);
  }
});

export const imageUpload = (req, res, next) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(new AppError(
          tooLarge ? 413 : 400,
          tooLarge
            ? 'Image must be 5 MB or smaller.'
            : 'Upload one image using the image field.'
        ));
        return;
      }
      next(error);
      return;
    }

    if (req.file) {
      try {
        const detectedType = await fileTypeFromBuffer(req.file.buffer);
        if (!detectedType || detectedType.mime !== req.file.mimetype || !allowedMimeTypes.has(detectedType.mime)) {
          next(badRequest('The uploaded file is not a valid JPG, JPEG, PNG, or WEBP image.'));
          return;
        }
      } catch {
        next(badRequest('The uploaded file is not a valid JPG, JPEG, PNG, or WEBP image.'));
        return;
      }
    }
    next();
  });
};
