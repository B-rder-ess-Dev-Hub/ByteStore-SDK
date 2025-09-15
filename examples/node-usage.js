import fileStorage from '../FileStorage.js';
import { config } from "dotenv";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Loaded" : "Missing");

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Initialize with private key
    await fileStorage.initialize({
      privateKey: process.env.PRIVATE_KEY,
      network: 'calibration' // Filecoin testnet
    });

    // ---------- Upload JSON ----------
    const jsonPath = path.resolve(__dirname, 'files/my-data.json');
    if (fs.existsSync(jsonPath)) {
      let jsonBuffer = fs.readFileSync(jsonPath);

      // Ensure minimum size of 1 byte
      if (jsonBuffer.length < 1) {
        const padding = Buffer.alloc(1 - jsonBuffer.length, " ");
        jsonBuffer = Buffer.concat([jsonBuffer, padding]);
      }

      const jsonResult = await fileStorage.uploadFile(jsonBuffer, 'my-data.json');
      console.log('✅ JSON uploaded:', jsonResult);

      // ---------- Download JSON ----------
      const downloadedJSON = await fileStorage.downloadJSON(jsonResult.pieceCid);
      console.log('📥 Downloaded JSON:', downloadedJSON);
    } else {
      console.warn("⚠️ my-data.json not found in examples/files/, skipping JSON upload");
    }

    // ---------- Upload an image ----------
    const imagePath = path.resolve(__dirname, 'files/image.png');
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const imageResult = await fileStorage.uploadFile(imageBuffer, 'image.png');
      console.log('✅ Image uploaded:', imageResult);
    } else {
      console.warn("⚠️ image.png not found in examples/files/, skipping image upload");
    }

    // ---------- Get storage info ----------
    try {
      const info = await fileStorage.getStorageInfo();
      console.log('ℹ️ Storage info:', info);
    } catch (err) {
      console.error("⚠️ Could not fetch storage info:", err.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
