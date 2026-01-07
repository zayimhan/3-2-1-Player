// fetch_team_details.js - LOGO VE İSİM AVCISI (DÜZELTİLMİŞ) 🦅
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

// Veritabanı Bağlantısı
const db = new sqlite3.Database('./futbol.db');

// 🎭 GİZLİLİK: Rastgele Tarayıcı Kimlikleri
const AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
];

const getRandomHeader = () => ({
    'User-Agent': AGENTS[Math.floor(Math.random() * AGENTS.length)],
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateTeamDetails(team) {
    try {
        console.log(`🌍 Gidiliyor: ${team.name}...`);
        
        const response = await axios.get(team.url, { 
            headers: getRandomHeader(),
            timeout: 10000 
        });

        const $ = cheerio.load(response.data);

        // 1. LOGOYU BUL 🖼️
        let logoUrl = $('.data-header__profile-container img').attr('src');
        if (!logoUrl) logoUrl = $('#tm-logo').attr('src'); 

        // 2. TEMİZ İSMİ BUL 🏷️
        let properName = $('h1.data-header__headline-wrapper').text().trim();
        properName = properName.replace(/\s+/g, ' ').trim();

        if (logoUrl && properName) {
            // Veritabanını Güncelle
            // db.run da asenkron olduğu için Promise içine alıyoruz ki await edebilelim
            await new Promise((resolve, reject) => {
                db.run(`UPDATE teams SET logo = ?, proper_name = ? WHERE id = ?`, 
                    [logoUrl, properName, team.id], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log(`✅ GÜNCELLENDİ: ${properName}`);
        } else {
            console.log(`⚠️ Eksik Veri: Logo veya İsim bulunamadı (${team.name})`);
        }

    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.error("⛔ BAN RİSKİ! 1 dakika mola...");
            throw new Error("BAN");
        }
        console.error(`❌ Hata (${team.name}):`, error.message);
    }
}

// --- ANA AKIŞ ---
console.log("🚀 DETAY AVCISI BAŞLIYOR...");

// db.serialize: İşlemleri sıraya sokar. Biri bitmeden diğeri başlamaz.
db.serialize(() => {
    
    // 1. ADIM: Önce Sütunu Oluştur
    db.run("ALTER TABLE teams ADD COLUMN proper_name TEXT", (err) => {
        if (!err) {
            console.log("✅ 'proper_name' sütunu oluşturuldu.");
        } else if (err.message.includes("duplicate column")) {
            console.log("ℹ️ 'proper_name' sütunu zaten varmış, devam.");
        } else {
            console.error("⚠️ Sütun hatası:", err.message);
        }
    });

    // 2. ADIM: Sütun oluştuğuna emin olduktan sonra sorguyu çalıştır
    const sql = "SELECT * FROM teams WHERE is_popular = 1 AND (logo IS NULL OR proper_name IS NULL)";
    
    db.all(sql, [], async (err, teams) => {
        if (err) {
            console.error("❌ Sorgu Hatası:", err.message);
            return;
        }

        console.log(`📊 Toplam ${teams.length} popüler takımın detayları çekilecek.`);

        // Döngü burada başlıyor
        for (const team of teams) {
            try {
                await updateTeamDetails(team);
                await sleep(Math.floor(Math.random() * 1000) + 500); 
            } catch (e) {
                if (e.message === "BAN") await sleep(60000);
            }
        }
        
        console.log("🎉 TÜM POPÜLER TAKIMLAR GÜNCELLENDİ!");
    });
});