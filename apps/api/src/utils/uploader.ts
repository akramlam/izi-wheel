import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with multiple fallbacks
let configurationAttempted = false;

const configureCloudinary = () => {
  if (configurationAttempted) return;
  configurationAttempted = true;

  try {
    // Try individual variables first (more reliable)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      console.log('Cloudinary configured with individual variables:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: '***configured***',
        api_secret: '***configured***'
      });
      return;
    }

    // Fallback to URL format
    if (process.env.CLOUDINARY_URL) {
      // Parse the CLOUDINARY_URL manually for better error handling
      const cloudinaryUrl = process.env.CLOUDINARY_URL;
      const urlMatch = cloudinaryUrl.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
      
      if (urlMatch) {
        const [, api_key, api_secret, cloud_name] = urlMatch;
        
        cloudinary.config({
          cloud_name,
          api_key,
          api_secret,
          secure: true
        });
        
        console.log('Cloudinary configured with URL (parsed):', {
          cloud_name,
          api_key: '***configured***',
          api_secret: '***configured***'
        });
      } else {
        // Direct URL configuration as last resort
        cloudinary.config(process.env.CLOUDINARY_URL);
        console.log('Cloudinary configured with URL (direct)');
      }
    } else {
      throw new Error('No Cloudinary configuration found');
    }

  } catch (error) {
    console.error('Cloudinary configuration error:', error);
    throw new Error('Failed to configure Cloudinary: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

// Configure on module load
configureCloudinary();

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
  // Ensure configuration is loaded
  configureCloudinary();

  return new Promise((resolve, reject) => {
    console.log('Starting Cloudinary upload:', { folder, filename, bufferSize: buffer.length });
    
    // Validate configuration before upload
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      const error = new Error('Cloudinary not properly configured. Missing: ' + 
        [!config.cloud_name && 'cloud_name', !config.api_key && 'api_key', !config.api_secret && 'api_secret']
        .filter(Boolean).join(', ')
      );
      console.error('Configuration validation error:', error);
      return reject(error);
    }
    
    // Create a readable stream from the buffer
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', {
            message: error.message,
            http_code: error.http_code,
            error: error
          });
          return reject(error);
        }
        if (!result) {
          const uploadError = new Error('Upload failed - no result returned');
          console.error('Cloudinary upload error:', uploadError);
          return reject(uploadError);
        }
        
        console.log('Cloudinary upload success:', {
          public_id: result.public_id,
          secure_url: result.secure_url,
          bytes: result.bytes
        });
        
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