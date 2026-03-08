import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

const resolveResourceType = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
};

export const uploadToCloudinary = (buffer, folder, mimeType = '') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `nexusboard/${folder}`,
        // Force non-image documents (PDF/docx/etc.) into raw storage for reliable delivery.
        resource_type: resolveResourceType(mimeType)
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};