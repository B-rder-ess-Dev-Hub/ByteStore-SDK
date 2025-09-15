import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

class FileStorage {
    constructor() {
        this.synapse = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the storage module
     * @param {Object} options - Configuration options
     * @param {string} [options.privateKey] - Private key for wallet
     * @param {ethers.Provider} [options.provider] - Ethers provider (for browser)
     * @param {string} [options.network] - Network to use ('mainnet' or 'calibration')
     * @param {string} [options.authorization] - GLIF authorization token
     */
    async initialize(options = {}) {
        try {
            const { privateKey, provider, network = 'calibration', authorization } = options;

            let synapseOptions = {
                authorization,
                withCDN: true // Enable CDN for faster retrievals by default
            };

            if (privateKey) {
                synapseOptions.privateKey = privateKey;
                synapseOptions.rpcURL = network === 'mainnet'
                    ? RPC_URLS.mainnet.http
                    : RPC_URLS.calibration.http;
            } else if (provider) {
                synapseOptions.provider = provider;
            } else {
                throw new Error('Must provide either privateKey or provider');
            }

            this.synapse = await Synapse.create(synapseOptions);
            this.isInitialized = true;

            console.log(`FileStorage initialized on ${network} network`);
            return true;
        } catch (error) {
            console.error('Failed to initialize FileStorage:', error);
            throw error;
        }
    }

    /**
     * Prepare wallet for storage operations (deposit and approve service)
     * @param {number} depositAmount - Amount of USDFC to deposit (in whole tokens)
     * @param {number} rateAllowance - Rate allowance per epoch (in whole tokens)
     * @param {number} lockupAllowance - Total lockup allowance (in whole tokens)
     * @param {number} maxLockupDays - Max lockup period in days
     */
    async setupWallet(depositAmount = 10, rateAllowance = 10, lockupAllowance = 1000, maxLockupDays = 30) {
        if (!this.isInitialized) {
            throw new Error('FileStorage not initialized. Call initialize() first.');
        }

        try {
            // Convert whole tokens to base units (18 decimals)
            const parse = (amount) => ethers.parseUnits(amount.toString(), 18);

            console.log('Checking current balance...');
            const walletBalance = await this.synapse.payments.walletBalance();
            console.log(`Wallet USDFC balance: ${ethers.formatUnits(walletBalance, 18)}`);

            // Deposit funds
            console.log(`Depositing ${depositAmount} USDFC...`);
            const depositTx = await this.synapse.payments.deposit(parse(depositAmount));
            console.log(`Deposit transaction: ${depositTx.hash}`);
            await depositTx.wait();
            console.log('Deposit confirmed');

            // Approve Warm Storage service
            console.log('Approving Warm Storage service...');
            const warmStorageAddress = await this.synapse.getWarmStorageAddress();
            const approveTx = await this.synapse.payments.approveService(
                warmStorageAddress,
                parse(rateAllowance),
                parse(lockupAllowance),
                BigInt(maxLockupDays) * 2880n // Convert days to epochs (1 day = 2880 epochs)
            );
            console.log(`Service approval transaction: ${approveTx.hash}`);
            await approveTx.wait();
            console.log('Service approval confirmed');

            // Check final balance
            const availableBalance = await this.synapse.payments.balance();
            console.log(`Available balance in payments contract: ${ethers.formatUnits(availableBalance, 18)} USDFC`);

            return true;
        } catch (error) {
            console.error('Wallet setup failed:', error);
            throw error;
        }
    }

    async pinToIPFS(cid, filename = "file") {
        if (!process.env.PINATA_JWT) {
            console.warn("⚠️ PINATA_JWT not set. Skipping pinning.");
            return null;
        }

        try {
            const res = await fetch("https://api.pinata.cloud/pinning/pinByHash", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.PINATA_JWT}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    hashToPin: cid,
                    pinataMetadata: {
                        name: filename
                    }
                })
            });

            const data = await res.json();
            if (res.ok) {
                console.log(`✅ Pinned to Pinata: ${cid}`);
                return `https://ipfs.io/ipfs/${cid}`;
            } else {
                console.error("❌ Pinning error:", data);
                return null;
            }
        } catch (err) {
            console.error("❌ Pinning request failed:", err);
            return null;
        }
    }

    /**
     * Upload a file (image or JSON)
     * @param {File|Blob|Uint8Array|Object|string} file - The file to upload
     * @param {string} [filename] - Optional filename for metadata
     * @returns {Promise<{pieceCid: string, size: number, timestamp: number, filename?: string}>}
     */
    async uploadFile(file, filename) {
        if (!this.isInitialized) {
            throw new Error('FileStorage not initialized. Call initialize() first.');
        }

        try {
            let data;
            let actualFilename = filename;

            if (typeof File !== 'undefined' && file instanceof File) {
                data = new Uint8Array(await file.arrayBuffer());
                actualFilename = actualFilename || file.name;
            } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
                data = new Uint8Array(await file.arrayBuffer());
            } else if (Buffer.isBuffer(file)) {
                data = new Uint8Array(file);
            } else if (file instanceof Uint8Array) {
                data = file;
            } else if (typeof file === 'string') {
                data = new TextEncoder().encode(file);
            } else if (typeof file === 'object') {
                const jsonString = JSON.stringify(file);
                data = new TextEncoder().encode(jsonString);
            } else {
                throw new Error('Unsupported file type.');
            }

            // ✅ allow very small files now
            if (data.length < 1) {
                throw new Error('File must be at least 1 byte');
            }
            if (data.length > 209715200) {
                throw new Error('File must be smaller than 200 MiB');
            }

            console.log(`Uploading ${data.length} bytes...`);

            const preflight = await this.synapse.storage.preflightUpload(data.length);
            if (!preflight.allowanceCheck.sufficient) {
                throw new Error('Insufficient allowance for upload. Please setup wallet first.');
            }

            // Upload to Synapse (Filecoin)
            const uploadResult = await this.synapse.storage.upload(data);

            const result = {
                pieceCid: uploadResult.pieceCid,
                size: data.length,
                timestamp: Date.now()
            };
            if (actualFilename) result.filename = actualFilename;

            console.log(`Upload successful! PieceCID: ${result.pieceCid}`);

            // 🔹 Pin to Pinata for gateway access
            const gatewayURL = await this.pinToIPFS(result.pieceCid, actualFilename || "file");
            if (gatewayURL) {
                result.gatewayURL = gatewayURL;
                console.log(`🌍 Accessible at: ${gatewayURL}`);
            }

            return result;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }


    /**
     * Upload an image file
     * @param {File|Blob} imageFile - The image file to upload
     * @returns {Promise<{pieceCid: string, size: number, timestamp: number, filename: string, type: string}>}
     */
    async uploadImage(imageFile) {
        if (!(imageFile instanceof File) && !(imageFile instanceof Blob)) {
            throw new Error('Image must be a File or Blob object');
        }

        const result = await this.uploadFile(imageFile, imageFile.name);
        return {
            ...result,
            type: imageFile.type || 'image/unknown'
        };
    }

    /**
     * Upload JSON data
     * @param {Object|string} jsonData - JSON object or string to upload
     * @param {string} [filename] - Optional filename for metadata
     * @returns {Promise<{pieceCid: string, size: number, timestamp: number, filename?: string}>}
     */
    async uploadJSON(jsonData, filename = 'data.json') {
        const result = await this.uploadFile(jsonData, filename);
        return result;
    }

    /**
     * Download a file by PieceCID
     * @param {string} pieceCid - The PieceCID of the file to download
     * @param {Object} [options] - Download options
     * @param {boolean} [options.returnAs] - Return type ('blob', 'text', 'json', 'uint8array')
     * @returns {Promise<Blob|string|Object|Uint8Array>}
     */
    async downloadFile(pieceCid, options = {}) {
        if (!this.isInitialized) {
            throw new Error('FileStorage not initialized. Call initialize() first.');
        }

        const { returnAs = 'uint8array' } = options;

        try {
            console.log(`Downloading file with PieceCID: ${pieceCid}`);
            const data = await this.synapse.storage.download(pieceCid);

            switch (returnAs) {
                case 'blob':
                    return new Blob([data]);
                case 'text':
                    return new TextDecoder().decode(data);
                case 'json':
                    const text = new TextDecoder().decode(data);
                    return JSON.parse(text);
                case 'uint8array':
                default:
                    return data;
            }
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    /**
     * Download and display an image
     * @param {string} pieceCid - The PieceCID of the image
     * @returns {Promise<string>} - Data URL of the image
     */
    async downloadImage(pieceCid) {
        try {
            const blob = await this.downloadFile(pieceCid, { returnAs: 'blob' });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Image download failed:', error);
            throw error;
        }
    }

    /**
     * Download JSON data
     * @param {string} pieceCid - The PieceCID of the JSON data
     * @returns {Promise<Object>} - Parsed JSON object
     */
    async downloadJSON(pieceCid) {
        try {
            return await this.downloadFile(pieceCid, { returnAs: 'json' });
        } catch (error) {
            console.error('JSON download failed:', error);
            throw error;
        }
    }

    /**
     * Get storage information and account status
     * @returns {Promise<Object>} - Storage and account information
     */
    async getStorageInfo() {
        if (!this.isInitialized) {
            throw new Error('FileStorage not initialized. Call initialize() first.');
        }

        try {
            const [balance, accountInfo, storageInfo] = await Promise.all([
                this.synapse.payments.balance().catch(() => null),
                this.synapse.payments.accountInfo().catch(() => null),
                this.synapse.storage.getStorageInfo().catch(() => null)
            ]);

            return {
                balance: balance ? ethers.formatUnits(balance, 18) : "0",
                accountInfo: accountInfo
                    ? {
                        availableFunds: accountInfo.availableFunds
                            ? ethers.formatUnits(accountInfo.availableFunds, 18)
                            : "0",
                        lockedFunds: accountInfo.lockedFunds
                            ? ethers.formatUnits(accountInfo.lockedFunds, 18)
                            : "0",
                        totalFunds: accountInfo.totalFunds
                            ? ethers.formatUnits(accountInfo.totalFunds, 18)
                            : "0"
                    }
                    : { availableFunds: "0", lockedFunds: "0", totalFunds: "0" },
                storageInfo: storageInfo
                    ? {
                        pricing: storageInfo.pricing ?? {},
                        providers: Array.isArray(storageInfo.providers)
                            ? storageInfo.providers.length
                            : 0,
                        network: storageInfo.serviceParameters?.network ?? "unknown"
                    }
                    : { pricing: {}, providers: 0, network: "unknown" }
            };
        } catch (error) {
            console.error('⚠️ Failed to get storage info safely:', error);
            return {
                balance: "0",
                accountInfo: { availableFunds: "0", lockedFunds: "0", totalFunds: "0" },
                storageInfo: { pricing: {}, providers: 0, network: "unknown" }
            };
        }
    }


    /**
     * Check if a PieceCID exists on the network
     * @param {string} pieceCid - The PieceCID to check
     * @returns {Promise<boolean>} - True if the piece exists
     */
    async checkFileExists(pieceCid) {
        if (!this.isInitialized) {
            throw new Error('FileStorage not initialized. Call initialize() first.');
        }

        try {
            // Try to download a small part to check existence
            await this.synapse.storage.download(pieceCid);
            return true;
        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }
}

// Create a singleton instance
const fileStorage = new FileStorage();

export default fileStorage;