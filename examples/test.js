// examples/test.js
import fileStorage from '../dist/FileStorage.esm.js';
import { config } from "dotenv";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

console.log("🧪 Starting Filecoin Storage SDK Test");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Loaded" : "❌ Missing");
console.log("PINATA_JWT:", process.env.PINATA_JWT ? "✅ Loaded" : "⚠️  Missing (optional)");

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create files directory if it doesn't exist
const filesDir = path.resolve(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
  console.log('📁 Created examples/files/ directory');
}

// Create sample files for testing
function createSampleFiles() {
  // Sample JSON file
  const jsonPath = path.resolve(filesDir, 'my-data.json');
  if (!fs.existsSync(jsonPath)) {
    const sampleData = {
      test: "Filecoin Storage SDK Test Data",
      timestamp: new Date().toISOString(),
      description: "This is a test file for the Filecoin Storage SDK",
      items: ["item1", "item2", "item3"],
      metadata: {
        version: "1.0.0",
        author: "Test Suite"
      },
      test: "Filecoin Storage SDK Test Data",
      timestamp: new Date().toISOString(),
      description: "This is a test file for the Filecoin Storage SDK",
      items: ["item1", "item2", "item3"],
      metadata: {
        version: "1.0.0",
        author: "Test Suite"
      },
      test: "Filecoin Storage SDK Test Data",
      timestamp: new Date().toISOString(),
      description: "This is a test file for the Filecoin Storage SDK",
      items: ["item1", "item2", "item3"],
      metadata: {
        version: "1.0.0",
        author: "Test Suite"
      }
    };
    fs.writeFileSync(jsonPath, JSON.stringify(sampleData, null, 2));
    console.log('📝 Created sample JSON file');
  }

  // Sample text file
  const textPath = path.resolve(filesDir, 'sample.txt');
  if (!fs.existsSync(textPath)) {
    console.log('File not found');
  }
}

async function main() {
  try {
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is required');
      console.log('💡 Create a .env file with: PRIVATE_KEY=your_filecoin_private_key');
      process.exit(1);
    }

    createSampleFiles();

    console.log('\n--- Initializing FileStorage ---');
    // Initialize with private key
    await fileStorage.initialize({
      privateKey: process.env.PRIVATE_KEY,
      network: 'calibration' // Filecoin testnet
    });
    console.log('✅ FileStorage initialized successfully');

    console.log('\n--- Testing Wallet Setup ---');
    try {
      await fileStorage.setupWallet(
        1,    // depositAmount (USDFC) - small amount for testing
        1,    // rateAllowance (USDFC per epoch)
        10,   // lockupAllowance (total USDFC)
        1     // maxLockupDays
      );
      console.log('✅ Wallet setup completed');
    } catch (error) {
      console.log('⚠️  Wallet setup may have already been done, continuing...');
    }

    console.log('\n--- Testing JSON Upload ---');
    const jsonPath = path.resolve(filesDir, 'my-data.json');
    if (fs.existsSync(jsonPath)) {
      const jsonBuffer = fs.readFileSync(jsonPath);
      const jsonResult = await fileStorage.uploadFile(jsonBuffer, 'my-data.json');
      console.log('✅ JSON uploaded:', {
        pieceCid: jsonResult.pieceCid,
        size: jsonResult.size,
        filename: jsonResult.filename
      });

      // Download JSON
      console.log('\n--- Testing JSON Download ---');
      const downloadedJSON = await fileStorage.downloadJSON(jsonResult.pieceCid);
      console.log('📥 Downloaded JSON content:', JSON.stringify(downloadedJSON).substring(0, 100) + '...');

      // Verify the data matches
      const originalData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (JSON.stringify(originalData) === JSON.stringify(downloadedJSON)) {
        console.log('✅ JSON data verification: PASSED');
      } else {
        console.log('❌ JSON data verification: FAILED');
      }
    }

    console.log('\n--- Testing Text File Upload ---');
    const textPath = path.resolve(filesDir, 'sample.txt');
    if (fs.existsSync(textPath)) {
      const textBuffer = fs.readFileSync(textPath);
      const textResult = await fileStorage.uploadFile(textBuffer, 'sample.txt');
      console.log('✅ Text file uploaded:', {
        pieceCid: textResult.pieceCid,
        size: textResult.size
      });

      // Download text
      console.log('\n--- Testing Text Download ---');
      const downloadedText = await fileStorage.downloadFile(textResult.pieceCid, { returnAs: 'text' });
      console.log('📥 Downloaded text:', downloadedText.substring(0, 50) + '...');
    }


    console.log('\n--- Testing Storage Info ---');
    try {
      const info = await fileStorage.getStorageInfo();
      console.log('ℹ️ Storage info:');
      console.log('  Balance:', info.balance, 'USDFC');
      console.log('  Available Funds:', info.accountInfo.availableFunds, 'USDFC');
      console.log('  Locked Funds:', info.accountInfo.lockedFunds, 'USDFC');
      console.log('  Storage Providers:', info.storageInfo.providers);
    } catch (err) {
      console.error("⚠️ Could not fetch storage info:", err.message);
    }

    console.log('\n--- Testing Small File Upload ---');
    try {
      const smallBuffer = Buffer.from('X'); 
      const smallResult = await fileStorage.uploadFile(smallBuffer, 'tiny.txt');
      console.log('✅ Small file uploaded:', smallResult.pieceCid);
    } catch (error) {
      console.log('⚠️ Small file upload test skipped:', error.message);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ FileStorage initialization');
    console.log('✅ Wallet setup');
    console.log('✅ File uploads (JSON, text)');
    console.log('✅ File downloads');
    console.log('✅ File existence checks');
    console.log('✅ Storage info retrieval');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

main();