const fs = require('fs');
const path = require('path');

class PasswordGenerator {
    constructor() {
        this.lowercase = 'abcdefghijklmnopqrstuvwxyz';
        this.uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.numbers = '0123456789';
        this.special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    // Generate password berdasarkan pattern
    generatePatternPasswords() {
        const passwords = new Set();
        
        // Pattern umum
        const patterns = [
            // Nama + Tahun
            ...['john', 'jane', 'mike', 'sarah', 'admin', 'user', 'test'].map(name => 
                [...Array(50)].map((_, i) => `${name}${2023-i}`)
            ),
            
            // Kata + Angka
            ...['password', 'admin', 'user', 'test', 'qwerty', 'welcome'].map(word =>
                [...Array(1000)].map((_, i) => `${word}${i}`)
            ),
            
            // Kombinasi keyboard
            ...['qwerty', 'asdfgh', 'zxcvbn'].map(pattern =>
                [...Array(1000)].map((_, i) => `${pattern}${i}`)
            ),
            
            // Tanggal
            ...Array.from({length: 365}, (_, i) => {
                const date = new Date(2023, 0, i+1);
                return date.toISOString().slice(0,10).replace(/-/g,'');
            }),
            
            // Telepon
            ...Array.from({length: 100000}, (_, i) => 
                `08${i.toString().padStart(10, '0')}`
            )
        ];
        
        patterns.forEach(pattern => {
            if (Array.isArray(pattern)) {
                pattern.forEach(p => passwords.add(p));
            } else {
                passwords.add(pattern);
            }
        });
        
        return Array.from(passwords);
    }

    // Generate password berdasarkan dictionary
    generateDictionaryPasswords() {
        const passwords = new Set();
        
        // Kata-kata umum
        const commonWords = [
            'password', 'admin', 'user', 'test', 'welcome', 'qwerty',
            '123456', 'letmein', 'monkey', 'dragon', 'baseball', 'football',
            'superman', 'trustno1', 'iloveyou', 'sunshine', 'princess',
            'admin123', 'welcome1', 'password1', 'qwerty123'
        ];
        
        commonWords.forEach(word => {
            // Kata asli
            passwords.add(word);
            
            // Kapitalisasi
            passwords.add(word.charAt(0).toUpperCase() + word.slice(1));
            
            // Leetspeak
            passwords.add(word.replace(/a/gi, '4')
                             .replace(/e/gi, '3')
                             .replace(/i/gi, '1')
                             .replace(/o/gi, '0')
                             .replace(/s/gi, '5'));
            
            // Tambah angka
            for (let i = 0; i < 1000; i++) {
                passwords.add(`${word}${i}`);
            }
            
            // Tambah simbol
            ['!', '@', '#', '$', '%'].forEach(symbol => {
                passwords.add(`${word}${symbol}`);
                passwords.add(`${symbol}${word}`);
            });
        });
        
        return Array.from(passwords);
    }

    // Generate password hybrid
    generateHybridPasswords() {
        const passwords = new Set();
        
        // Kombinasi kata + angka + simbol
        const words = ['admin', 'password', 'user', 'test', 'welcome'];
        const numbers = Array.from({length: 10000}, (_, i) => i.toString());
        const symbols = ['!', '@', '#', '$', '%', '^', '&', '*'];
        
        words.forEach(word => {
            numbers.forEach(num => {
                symbols.forEach(symbol => {
                    // Kombinasi 1: word + num + symbol
                    passwords.add(`${word}${num}${symbol}`);
                    // Kombinasi 2: symbol + word + num
                    passwords.add(`${symbol}${word}${num}`);
                    // Kombinasi 3: word + symbol + num
                    passwords.add(`${word}${symbol}${num}`);
                });
            });
        });
        
        return Array.from(passwords);
    }

    // Generate semua password
    generateAllPasswords() {
        const allPasswords = new Set();
        
        // Gabungkan semua metode
        [
            ...this.generatePatternPasswords(),
            ...this.generateDictionaryPasswords(),
            ...this.generateHybridPasswords()
        ].forEach(password => allPasswords.add(password));
        
        return Array.from(allPasswords);
    }

    // Simpan password ke file
    savePasswordsToFile(passwords, filename = 'generated_passwords.txt') {
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, passwords.join('\n'));
        console.log(`Password berhasil disimpan ke ${filePath}`);
    }
}

module.exports = PasswordGenerator; 