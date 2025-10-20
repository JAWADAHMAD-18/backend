import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cordinaryUploadImage = async (filePath) => {
  try {
    if (!filePath) return null;

    // Upload to Cloudinary
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    console.log("✅ Cloudinary upload success:", response.url);

    // Remove local file after successful upload
    fs.unlinkSync(filePath);

    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error.message);

    // Cleanup local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return null;
  }
};

export default cordinaryUploadImage;
