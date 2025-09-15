# Filecoin Storage SDK

A comprehensive JavaScript/TypeScript SDK for decentralized file storage on Filecoin using Synapse Protocol. Simplify Filecoin integration with easy-to-use methods for uploading, downloading, and managing files on the decentralized web.

## Features

- 📁 **Multi-format Support**: Upload files, images, JSON data, and more
- 🔐 **Wallet Integration**: Seamless USDFC deposit and service approval
- 🌐 **Multi-network**: Support for Filecoin mainnet and calibration testnet
- 📍 **IPFS Pinning**: Automatic Pinata integration for gateway access
- ⚡ **CDN Enabled**: Fast retrievals with built-in content delivery
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive types
- 🔍 **File Management**: Check file existence, get storage info, and monitor balances
- 🎯 **Error Handling**: Robust error handling with detailed logging

## Installation

```bash
npm install @borderlessdev/filecoin-storage-sdk
```

# Quickstart

## nodejs usage

```javascript
import fileStorage from '@borderlessdev/filecoin-storage-sdk';
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
```
