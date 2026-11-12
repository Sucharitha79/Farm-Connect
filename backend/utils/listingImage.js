import { badRequest } from './errors.js';
import { deleteImage, uploadImage } from '../services/imageStorage.js';

export const rejectImageUrl = (body) => {
  if (body && Object.hasOwn(body, 'imageUrl')) {
    throw badRequest('Upload an image file instead of sending an image URL.');
  }
};

export const resolveListingImage = async (req, existing, folder) => {
  const removeValue = req.body?.removeImage;
  if (
    removeValue !== undefined &&
    removeValue !== true &&
    removeValue !== false &&
    removeValue !== 'true' &&
    removeValue !== 'false'
  ) {
    throw badRequest('removeImage must be true or false.');
  }

  const removeRequested = removeValue === true || removeValue === 'true';
  if (req.file && removeRequested) {
    throw badRequest('Upload a replacement image or remove the current image, not both.');
  }

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer, folder);
    return {
      ...uploaded,
      previousImagePublicId: existing?.imagePublicId || ''
    };
  }

  if (removeRequested) {
    return {
      imageUrl: '',
      imagePublicId: '',
      previousImagePublicId: existing?.imagePublicId || ''
    };
  }

  return {
    imageUrl: existing?.imageUrl || '',
    imagePublicId: existing?.imagePublicId || '',
    previousImagePublicId: ''
  };
};

export const cleanupListingImage = async (publicId) => {
  if (!publicId) return;
  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error('Failed to clean up a Cloudinary listing image.', error);
  }
};
