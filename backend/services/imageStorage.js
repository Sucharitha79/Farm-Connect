import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const getCloudinary = () => {
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
    throw new AppError(
      503,
      'Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env.'
    );
  }

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true
  });
  return cloudinary;
};

export const uploadImage = (buffer, folder) => {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
    }, (error, result) => {
      if (error) {
        const credentialsInvalid = [401, 403].includes(error.http_code);
        reject(new AppError(
          credentialsInvalid ? 503 : 502,
          credentialsInvalid
            ? 'Cloudinary authentication failed. Check the image storage credentials.'
            : 'Image upload failed. Please try again.'
        ));
        return;
      }
      if (!result?.secure_url || !result.public_id) {
        reject(new AppError(502, 'Cloudinary returned an incomplete image response.'));
        return;
      }
      resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
    });
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId) => {
  const client = getCloudinary();
  const result = await client.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true
  });
  if (!['ok', 'not found'].includes(result.result)) {
    throw new AppError(502, 'Cloudinary could not remove the previous image.');
  }
};
