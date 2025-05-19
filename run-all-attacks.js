const { execSync, spawn } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Warna untuk output di terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Daftar file serangan yang akan dijalankan
const attacks = [
  {
    name: 'Brute Force Login',
    file: 'bruteforce.js',
    description: 'Serangan yang mencoba login dengan banyak kombinasi username dan password.',
    duration: 'Sekitar 1-2 menit'
  },
  {
    name: 'SQL Injection',
    file: 'sql-injection.js',
    description: 'Serangan yang mencoba menyuntikkan kode SQL untuk mengakses database.',
    duration: 'Sekitar 2-3 menit'
  },
  {
    name: 'Cross-Site Scripting (XSS)',
    file: 'xss-attack.js',
    description: 'Serangan yang menyuntikkan kode JavaScript untuk dieksekusi pada browser pengguna.',
    duration: 'Sekitar 2-3 menit'
  },
  {
    name: 'Cross-Site Request Forgery (CSRF)',
    file: 'csrf-attack.js',
    description: 'Serangan yang memaksa pengguna melakukan aksi yang tidak diinginkan pada aplikasi web.',
    duration: 'Sekitar 1-2 menit'
  },
  {
    name: 'Denial of Service (DoS)',
    file: 'dos-attack.js',
    description: 'Serangan yang bertujuan membuat aplikasi web tidak tersedia dengan banyak request.',
    duration: 'Sekitar 30 detik'
  }
];

// Cek dependensi terlebih dahulu
function checkDependencies() {
  console.log(`${colors.cyan}Memeriksa dependensi...${colors.reset}`);
  
  const requiredPackages = ['axios', 'cheerio', 'http', 'fs', 'path', 'url', 'child_process', 'cluster', 'os'];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  
  let needToInstall = false;
  
  for (const pkg of requiredPackages) {
    if (pkg !== 'fs' && pkg !== 'path' && pkg !== 'child_process' && 
        pkg !== 'http' && pkg !== 'url' && pkg !== 'os' && pkg !== 'cluster' && 
        !packageJson.dependencies[pkg]) {
      console.log(`${colors.yellow}Dependensi '${pkg}' tidak ditemukan di package.json${colors.reset}`);
      packageJson.dependencies[pkg] = '*';
      needToInstall = true;
    }
  }
  
  if (needToInstall) {
    console.log(`${colors.yellow}Menulis package.json dengan dependensi yang dibutuhkan...${colors.reset}`);
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    console.log(`${colors.yellow}Menginstall dependensi...${colors.reset}`);
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log(`${colors.green}Dependensi berhasil diinstall!${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error saat menginstall dependensi:${colors.reset}`, error);
      process.exit(1);
    }
  } else {
    console.log(`${colors.green}Semua dependensi sudah terinstall.${colors.reset}`);
  }
}

// Fungsi untuk membuat laporan ringkasan
function createSummaryReport() {
  console.log(`${colors.cyan}Membuat laporan ringkasan...${colors.reset}`);
  
  const reportDir = 'attack_reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  
  const logFiles = [
    { file: 'successful_logins.txt', title: 'Brute Force Login', type: 'Successful Logins' },
    { file: 'sql_injection_results.txt', title: 'SQL Injection', type: 'Vulnerabilities' },
    { file: 'xss_vulnerabilities.txt', title: 'Cross-Site Scripting (XSS)', type: 'Vulnerabilities' },
    { file: 'csrf_results.txt', title: 'Cross-Site Request Forgery (CSRF)', type: 'Vulnerabilities' },
    { file: 'dos_attack_log.txt', title: 'Denial of Service (DoS)', type: 'Results' }
  ];
  
  let reportContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Laporan Serangan Web - Ringkasan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1, h2, h3 { color: #2c3e50; }
    h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #3498db; color: white; }
    tr:hover { background-color: #f5f5f5; }
    .vulnerability { color: #e74c3c; font-weight: bold; }
    .secure { color: #27ae60; font-weight: bold; }
    .timestamp { color: #7f8c8d; font-size: 0.9em; }
    .chart { width: 100%; height: 30px; background: #ecf0f1; border-radius: 3px; margin: 5px 0; position: relative; overflow: hidden; }
    .chart-bar { height: 100%; background: #e74c3c; }
    footer { margin-top: 30px; text-align: center; color: #7f8c8d; font-size: 0.9em; }
    .attack-box { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .attack-box h3 { margin-top: 0; color: #3498db; }
    pre { background: #f8f8f8; padding: 10px; border-radius: 3px; overflow: auto; }
    .statistics { display: flex; justify-content: space-between; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 200px; margin: 10px; padding: 15px; background: #f8f8f8; border-radius: 5px; text-align: center; }
    .stat-card h3 { margin: 0; color: #7f8c8d; font-size: 0.9em; }
    .stat-card p { font-size: 2em; margin: 10px 0; color: #2c3e50; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Laporan Serangan Web - Ringkasan</h1>
    <p>Laporan ini berisi ringkasan serangan yang dilakukan terhadap aplikasi web target.</p>
    <p class="timestamp">Dibuat pada: ${new Date().toLocaleString()}</p>
    
    <div class="statistics">
      <div class="stat-card">
        <h3>Total Serangan</h3>
        <p>${attacks.length}</p>
      </div>
      <div class="stat-card">
        <h3>Target</h3>
        <p>http://localhost:3000</p>
      </div>
      <div class="stat-card">
        <h3>Status Pengujian</h3>
        <p>Selesai</p>
      </div>
    </div>
    
    <h2>Ringkasan Serangan</h2>
    <table>
      <tr>
        <th>Jenis Serangan</th>
        <th>Status</th>
        <th>Detail</th>
      </tr>
`;
  
  // Tambahkan baris untuk setiap jenis serangan
  for (const attack of attacks) {
    const logFile = logFiles.find(l => l.title === attack.name);
    let status = 'Tidak Diketahui';
    let details = 'Laporan tidak tersedia';
    
    if (logFile && fs.existsSync(logFile.file)) {
      const logContent = fs.readFileSync(logFile.file, 'utf8');
      const lines = logContent.split('\n').filter(Boolean);
      
      // Deteksi status berdasarkan konten log
      if (logFile.file === 'successful_logins.txt') {
        status = lines.length > 0 ? 'Vulnerable' : 'Secure';
        details = lines.length > 0 ? `${lines.length} login berhasil ditemukan` : 'Tidak ada login yang berhasil';
      } else if (logContent.includes('VULNERABLE') || logContent.includes('vulnerable') || logContent.includes('Vulnerable')) {
        status = 'Vulnerable';
        details = `${lines.length} kerentanan terdeteksi`;
      } else {
        status = 'Secure';
        details = 'Tidak ada kerentanan terdeteksi';
      }
    }
    
    reportContent += `
      <tr>
        <td>${attack.name}</td>
        <td class="${status.toLowerCase() === 'vulnerable' ? 'vulnerability' : 'secure'}">${status}</td>
        <td>${details}</td>
      </tr>`;
  }
  
  reportContent += `
    </table>
    
    <h2>Detail Serangan</h2>`;
  
  // Tambahkan detail untuk setiap jenis serangan
  for (const logFile of logFiles) {
    reportContent += `
    <div class="attack-box">
      <h3>${logFile.title}</h3>`;
    
    if (fs.existsSync(logFile.file)) {
      const logContent = fs.readFileSync(logFile.file, 'utf8');
      if (logContent.trim()) {
        reportContent += `
      <p>Detail ${logFile.type}:</p>
      <pre>${logContent}</pre>`;
      } else {
        reportContent += `
      <p>Tidak ada ${logFile.type.toLowerCase()} yang terdeteksi.</p>`;
      }
    } else {
      reportContent += `
      <p>File log tidak ditemukan.</p>`;
    }
    
    reportContent += `
    </div>`;
  }
  
  reportContent += `
    <h2>Rekomendasi Mitigasi</h2>
    <div class="attack-box">
      <h3>Brute Force Login</h3>
      <ul>
        <li>Implementasikan pembatasan percobaan login (rate limiting)</li>
        <li>Gunakan CAPTCHA setelah beberapa kali percobaan gagal</li>
        <li>Implementasikan penundaan progresif setelah percobaan login gagal</li>
        <li>Gunakan password yang kuat dan kompleks</li>
        <li>Implementasikan autentikasi multi-faktor (MFA)</li>
      </ul>
    </div>
    
    <div class="attack-box">
      <h3>SQL Injection</h3>
      <ul>
        <li>Gunakan prepared statements atau parameterized queries</li>
        <li>Implementasikan validasi input yang ketat</li>
        <li>Gunakan ORM (Object Relational Mapping)</li>
        <li>Terapkan prinsip hak akses minimal pada database</li>
        <li>Terapkan whitelist karakter yang diizinkan</li>
      </ul>
    </div>
    
    <div class="attack-box">
      <h3>Cross-Site Scripting (XSS)</h3>
      <ul>
        <li>Menggunakan HTML escape/encode pada output</li>
        <li>Implementasikan Content Security Policy (CSP)</li>
        <li>Gunakan HttpOnly flag pada cookie</li>
        <li>Validasi dan sanitasi semua input pengguna</li>
        <li>Gunakan framework modern yang memiliki perlindungan XSS bawaan</li>
      </ul>
    </div>
    
    <div class="attack-box">
      <h3>Cross-Site Request Forgery (CSRF)</h3>
      <ul>
        <li>Implementasikan token anti-CSRF</li>
        <li>Gunakan SameSite cookies</li>
        <li>Memeriksa header Referer/Origin</li>
        <li>Gunakan re-autentikasi untuk aksi sensitif</li>
        <li>Meminta konfirmasi untuk aksi penting</li>
      </ul>
    </div>
    
    <div class="attack-box">
      <h3>Denial of Service (DoS)</h3>
      <ul>
        <li>Implementasikan rate limiting</li>
        <li>Gunakan layanan CDN dan perlindungan DDoS</li>
        <li>Implementasikan caching</li>
        <li>Kurangi kompleksitas query database</li>
        <li>Gunakan load balancer</li>
      </ul>
    </div>
    
    <footer>
      <p>Dibuat untuk tujuan pendidikan dan pengujian keamanan. Jangan gunakan untuk aktivitas ilegal.</p>
    </footer>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(reportDir, 'attack_summary_report.html'), reportContent);
  console.log(`${colors.green}Laporan ringkasan berhasil dibuat di ${path.join(reportDir, 'attack_summary_report.html')}${colors.reset}`);
}

// Fungsi untuk menjalankan serangan
function runAttack(attack, index) {
  return new Promise((resolve, reject) => {
    console.log(`\n${colors.bgBlue}${colors.white} SERANGAN ${index + 1}/${attacks.length}: ${attack.name} ${colors.reset}`);
    console.log(`${colors.yellow}Deskripsi: ${colors.reset}${attack.description}`);
    console.log(`${colors.yellow}Perkiraan durasi: ${colors.reset}${attack.duration}`);
    console.log(`${colors.yellow}File: ${colors.reset}${attack.file}`);
    console.log(`${colors.cyan}Memulai serangan...${colors.reset}`);
    
    const attackProcess = spawn('node', [attack.file], { stdio: 'inherit' });
    
    attackProcess.on('close', code => {
      if (code === 0) {
        console.log(`${colors.green}Serangan ${attack.name} selesai dengan sukses.${colors.reset}`);
        resolve();
      } else {
        console.log(`${colors.red}Serangan ${attack.name} selesai dengan code: ${code}${colors.reset}`);
        resolve(); // Tetap resolve meskipun ada error untuk melanjutkan ke serangan berikutnya
      }
    });
    
    attackProcess.on('error', err => {
      console.error(`${colors.red}Error saat menjalankan ${attack.name}:${colors.reset}`, err);
      resolve(); // Tetap resolve untuk melanjutkan ke serangan berikutnya
    });
  });
}

// Fungsi untuk menampilkan ASCII art banner
function displayBanner() {
  const banner = `
${colors.red}
 ██╗    ██╗███████╗██████╗      █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗███████╗
 ██║    ██║██╔════╝██╔══██╗    ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝
 ██║ █╗ ██║█████╗  ██████╔╝    ███████║   ██║      ██║   ███████║██║     █████╔╝ ███████╗
 ██║███╗██║██╔══╝  ██╔══██╗    ██╔══██║   ██║      ██║   ██╔══██║██║     ██╔═██╗ ╚════██║
 ╚███╔███╔╝███████╗██████╔╝    ██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██╗███████║
  ╚══╝╚══╝ ╚══════╝╚═════╝     ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝
${colors.yellow}                                     SIMULATOR                                         
${colors.brightRed}===================================================================================
${colors.brightCyan}  [+] Alat ini hanya untuk tujuan pendidikan dan pengujian keamanan!
  [+] Jangan gunakan untuk keperluan ilegal atau menyerang website tanpa izin!
${colors.brightRed}===================================================================================
${colors.reset}`;

  console.log(banner);
}

// Fungsi untuk menampilkan menu dan mendapatkan pilihan pengguna
async function displayMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(`\n${colors.green}Pilih opsi serangan:${colors.reset}`);
  console.log(`${colors.cyan}1.${colors.reset} Jalankan semua serangan secara berurutan`);
  console.log(`${colors.cyan}2.${colors.reset} Pilih serangan spesifik`);
  console.log(`${colors.cyan}3.${colors.reset} Buat laporan dari hasil yang ada`);
  console.log(`${colors.cyan}0.${colors.reset} Keluar`);
  
  return new Promise(resolve => {
    rl.question(`\n${colors.yellow}Masukkan pilihan Anda (0-3): ${colors.reset}`, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Fungsi untuk memilih serangan spesifik
async function selectSpecificAttack() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(`\n${colors.green}Pilih serangan yang ingin dijalankan:${colors.reset}`);
  
  attacks.forEach((attack, index) => {
    console.log(`${colors.cyan}${index + 1}.${colors.reset} ${attack.name} - ${attack.description}`);
  });
  
  return new Promise(resolve => {
    rl.question(`\n${colors.yellow}Masukkan nomor serangan (1-${attacks.length}) atau 0 untuk kembali: ${colors.reset}`, answer => {
      rl.close();
      const selection = parseInt(answer.trim());
      resolve(selection);
    });
  });
}

// Fungsi utama
async function main() {
  displayBanner();
  
  // Cek dependensi
  checkDependencies();
  
  let running = true;
  
  while (running) {
    const choice = await displayMenu();
    
    switch (choice) {
      case '1':
        console.log(`${colors.green}Menjalankan semua serangan secara berurutan...${colors.reset}`);
        
        // Jalankan semua serangan secara berurutan
        for (let i = 0; i < attacks.length; i++) {
          await runAttack(attacks[i], i);
        }
        
        console.log(`\n${colors.green}Semua serangan telah selesai dijalankan.${colors.reset}`);
        
        // Buat laporan ringkasan
        createSummaryReport();
        break;
        
      case '2':
        const attackIndex = await selectSpecificAttack();
        
        if (attackIndex >= 1 && attackIndex <= attacks.length) {
          await runAttack(attacks[attackIndex - 1], attackIndex - 1);
        } else if (attackIndex !== 0) {
          console.log(`${colors.red}Pilihan tidak valid!${colors.reset}`);
        }
        break;
        
      case '3':
        createSummaryReport();
        break;
        
      case '0':
        console.log(`${colors.green}Terima kasih telah menggunakan Web Attack Simulator!${colors.reset}`);
        running = false;
        break;
        
      default:
        console.log(`${colors.red}Pilihan tidak valid!${colors.reset}`);
    }
  }
}

// Jalankan program
main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
}); 