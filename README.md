# Web Attack Simulator

Alat ini adalah simulator serangan web yang dibuat untuk tujuan pendidikan dan pengujian keamanan website. Alat ini dapat menyimulasikan beberapa jenis serangan umum terhadap website, seperti Brute Force, SQL Injection, XSS, CSRF, dan DoS.

> **PERINGATAN**: Alat ini hanya boleh digunakan untuk tujuan pendidikan dan pengujian keamanan pada website yang ANDA MILIKI atau MEMILIKI IZIN RESMI untuk melakukan pengujian. Penggunaan alat ini pada website tanpa izin pemiliknya dapat melanggar hukum dan etika keamanan informasi.

## Daftar Isi
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Cara Penggunaan](#cara-penggunaan)
- [Jenis Serangan](#jenis-serangan)
- [Laporan](#laporan)
- [Lisensi](#lisensi)

## Prasyarat

- Node.js (v14+)
- npm (v6+)
- Website target (lokal)

## Instalasi

1. Clone repositori ini ke komputer Anda:

```bash
git clone https://github.com/yourusername/web-attack-simulator.git
cd web-attack-simulator
```

2. Install dependensi yang dibutuhkan:

```bash
npm install
```

## Cara Penggunaan

1. Pastikan website target Anda sudah berjalan (secara default di http://localhost:3000).

2. Jika URL target berbeda, silakan ubah `TARGET_URL` di setiap file serangan.

3. Jalankan alat menggunakan perintah:

```bash
npm start
```

atau

```bash
node run-all-attacks.js
```

4. Pilih opsi dari menu:
   - `1` - Jalankan semua serangan secara berurutan
   - `2` - Pilih serangan spesifik
   - `3` - Buat laporan dari hasil yang ada
   - `0` - Keluar

## Jenis Serangan

Alat ini dapat menyimulasikan beberapa jenis serangan web umum:

### 1. Brute Force Login (`bruteforce.js`)
Serangan yang mencoba login dengan banyak kombinasi username dan password untuk menemukan kredensial yang valid.

### 2. SQL Injection (`sql-injection.js`)
Serangan yang mencoba menyuntikkan kode SQL melalui input untuk mengakses atau memanipulasi database.

### 3. Cross-Site Scripting/XSS (`xss-attack.js`)
Serangan yang mencoba menyisipkan kode JavaScript berbahaya yang akan dieksekusi di browser pengguna.

### 4. Cross-Site Request Forgery/CSRF (`csrf-attack.js`)
Serangan yang memaksa pengguna yang sudah login untuk melakukan aksi yang tidak diinginkan.

### 5. Denial of Service/DoS (`dos-attack.js`)
Serangan yang mengirimkan banyak request ke server untuk membuat website tidak tersedia.

## Laporan

Setelah menjalankan serangan, alat ini akan menghasilkan file log dan laporan:

- File log spesifik untuk setiap jenis serangan (contoh: `sql_injection_results.txt`)
- Laporan ringkasan HTML dalam folder `attack_reports`

Laporan HTML menyediakan ringkasan visual dari semua serangan yang dilakukan, temuan kerentanan, dan rekomendasi mitigasi.

## Mitigasi

Berikut adalah beberapa rekomendasi umum untuk mengatasi kerentanan yang diuji:

- **Brute Force**: Implementasikan rate limiting, CAPTCHA, dan multi-factor authentication
- **SQL Injection**: Gunakan prepared statements dan validasi input
- **XSS**: Escape output dan implementasikan Content Security Policy
- **CSRF**: Gunakan token anti-CSRF dan SameSite cookies
- **DoS**: Implementasikan rate limiting dan load balancing

## Lisensi

Proyek ini dilisensikan di bawah lisensi ISC. Lihat berkas [LICENSE](LICENSE) untuk lebih detail.

---

Dibuat untuk tujuan pendidikan dan pengujian keamanan website. Gunakan dengan bijak dan bertanggung jawab. 
 #   m a k a n  
 