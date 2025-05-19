const axios = require('axios');
const cheerio = require('cheerio');

// Target domain
const TARGET_DOMAIN = 'https://absen-v3-1.vercel.app';

async function checkEndpoints() {
  try {
    console.log(`Memeriksa endpoint di ${TARGET_DOMAIN}...`);
    
    // Mengambil halaman utama
    const response = await axios.get(TARGET_DOMAIN);
    const $ = cheerio.load(response.data);
    
    // Mengumpulkan semua link
    const links = new Set();
    
    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        links.add(href);
      }
    });
    
    console.log('Endpoint yang ditemukan:');
    console.log([...links]);
    
    // Juga coba beberapa endpoint umum untuk website NextJS
    const commonEndpoints = [
      '/',
      '/about',
      '/members',
      '/profile',
      '/gallery',
      '/contact',
      '/api/hello',
      '/api/data',
      '/login',
      '/register',
      '/dashboard',
      '/admin'
    ];
    
    console.log('\nMemeriksa common endpoints...');
    
    for (const endpoint of commonEndpoints) {
      try {
        const url = `${TARGET_DOMAIN}${endpoint}`;
        const res = await axios.get(url, { timeout: 5000 });
        console.log(`✅ ${endpoint} - Status: ${res.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${endpoint} - Status: ${error.response.status}`);
        } else {
          console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEndpoints(); 