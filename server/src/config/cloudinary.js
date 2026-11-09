import { v2 as cloudinary } from 'cloudinary';
import { env } from './environment.js';
import fs from 'fs';
import path from 'path';

let isConfigured = false;

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  isConfigured = true;
}

export const uploadFile = async (filePath, folder = 'jobpilot') => {
  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      console.warn(`[Cloudinary] Upload failed, falling back to local file reference: ${error.message}`);
    }
  }

  // Fallback to local file path representation
  const fileName = path.basename(filePath);
  const parentFolder = path.basename(path.dirname(filePath));
  const resolvedFolder = parentFolder && parentFolder !== '.' && parentFolder !== 'uploads' ? parentFolder : folder;

  return {
    url: `/uploads/${resolvedFolder}/${fileName}`,
    publicId: `local_${Date.now()}_${fileName}`,
    format: path.extname(filePath).replace('.', ''),
    bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
    isLocalFallback: true,
  };
};

export default cloudinary;

