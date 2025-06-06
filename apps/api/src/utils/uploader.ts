import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using the URL format (more convenient)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  // Fallback to individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload an asset to Cloudinary
 * @param buffer File buffer to upload
 * @param folder Folder to upload to
 * @param filename Filename to use
 * @returns Object with public_id and secure_url
 */
export const uploadAsset = async (
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<{ public_id: string; secure_url: string }> => {
  return new Promise((resolve, reject) => {
    // Create a readable stream from the buffer
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Upload failed'));
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
        });
      }
    );

    // Write the buffer to the stream
    stream.write(buffer);
    stream.end();
  });
};

/**
 * Delete an asset from Cloudinary
 * @param publicId Public ID of the asset to delete
 */
export const deleteAsset = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
};

export default {
  uploadAsset,
  deleteAsset,
}; 