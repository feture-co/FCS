const cloudinary = require('cloudinary').v2;

function checkConfig() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Uploads an image file to Cloudinary with optimized parameters.
 * 
 * @param {string} filePath - Absolute path to the local temporary file
 * @param {'avatar' | 'receipt'} type - The type of image being uploaded
 * @returns {Promise<string|null>} - Returns the Cloudinary secure URL, or null if unconfigured/failed
 */
async function uploadImage(filePath, type = 'receipt') {
  if (!checkConfig()) {
    return null;
  }

  // Configure dynamically
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  try {
    const options = {
      folder: 'fcs_uploads',
      resource_type: 'image'
    };

    if (type === 'avatar') {
      options.folder = 'fcs_profile_photos';
      options.transformation = [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    } else if (type === 'receipt') {
      options.folder = 'fcs_payment_receipts';
      options.transformation = [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
}

module.exports = {
  checkConfig,
  isConfigured: checkConfig(),
  uploadImage
};
