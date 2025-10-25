import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { PassThrough } from "stream";

// Configure Cloudinary
const configureCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log("✅ Cloudinary configured successfully");
    return true;
  } catch (error) {
    console.error("❌ Cloudinary configuration error:", error.message);
    return false;
  }
};

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    // Check if environment variables are set
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.log("❌ Cloudinary environment variables not set");
      return false;
    }
    
    // Try a simple upload test with a small buffer
    const testBuffer = Buffer.from('test');
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'test' },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload test failed:", error.message);
          return false;
        } else {
          console.log("✅ Cloudinary connection test successful");
          return true;
        }
      }
    );
    
    const bufferStream = new PassThrough();
    bufferStream.end(testBuffer);
    bufferStream.pipe(uploadStream);
    
    return true;
  } catch (error) {
    console.error("❌ Cloudinary connection test failed:", error.message);
    return false;
  }
};

// Multer setup (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = "chat-app") => {
  return new Promise((resolve, reject) => {
    console.log('📤 Starting Cloudinary upload...', {
      bufferSize: buffer?.length,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });

    if (!buffer || buffer.length === 0) {
      const error = new Error('Empty buffer provided');
      console.error("❌ Upload error:", error.message);
      return reject(error);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder,
        resource_type: 'auto',
        timeout: 60000
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", {
            message: error.message,
            statusCode: error.http_code,
            error: error
          });
          return reject(error);
        }
        console.log("✅ File uploaded to Cloudinary successfully:", {
          url: result.secure_url,
          publicId: result.public_id
        });
        resolve(result);
      }
    );

    uploadStream.on('error', (streamError) => {
      console.error("❌ Upload stream error:", streamError);
      reject(streamError);
    });

    try {
      const bufferStream = new PassThrough();
      bufferStream.end(buffer);
      bufferStream.pipe(uploadStream);
    } catch (pipeError) {
      console.error("❌ Stream pipe error:", pipeError);
      reject(pipeError);
    }
  });
};

export { cloudinary, upload, uploadToCloudinary, testCloudinaryConnection, configureCloudinary };