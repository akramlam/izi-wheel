import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary - Simplified for production
const configureCloudinary = () => {
  try {
    // Use CLOUDINARY_URL directly - this is the most reliable method
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    
    if (cloudinaryUrl) {
      console.log('🌤️  Configuring Cloudinary with URL...');
      
      // Direct configuration with the URL
      cloudinary.config(cloudinaryUrl);
      
      console.log('✅ Cloudinary configured successfully');
      return true;
    }
    
    // Fallback to individual variables
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      console.log('🌤️  Configuring Cloudinary with individual variables...');
      
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      console.log('✅ Cloudinary configured with individual variables');
      return true;
    }
    
    console.error('❌ Cloudinary not configured - no environment variables found');
    console.error('   CLOUDINARY_URL:', !!process.env.CLOUDINARY_URL);
    console.error('   Individual vars:', {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET
    });
    return false;
    
  } catch (error) {
    console.error('❌ Cloudinary configuration error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Configure on module load
const isConfigured = configureCloudinary();

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
  
  if (!isConfigured) {
    // Try to configure again
    const retryConfig = configureCloudinary();
    if (!retryConfig) {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_URL environment variable.');
    }
  }

  return new Promise((resolve, reject) => {
    console.log('📤 Starting Cloudinary upload:', { folder, filename, bufferSize: buffer.length });
    
    // Create upload stream
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'auto',
      },
      (error: any, result: any) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', {
            message: error.message,
            http_code: error.http_code
          });
          return reject(error);
        }
        
        if (!result) {
          const uploadError = new Error('Upload failed - no result returned');
          console.error('❌ Cloudinary upload error:', uploadError);
          return reject(uploadError);
        }
        
        console.log('✅ Cloudinary upload success:', {
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