// fill_history.js - BAĞIMSIZ MOD
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose(); // Direkt kütüphaneyi alıyoruz

// 1. BAĞLANTIYI KENDİMİZ AÇIYORUZ (database.js'ye muhtaç değiliz)
const db = new sqlite3.Database('./futbol.db', (err) => {
    if (err) console.error("❌ Veritabanı Bağlantı Hatası:", err.message);
    else console.log("🔌 Veritabanına doğrudan bağlanıldı.");
});

// 🎭 TARAYICI KİMLİKLERİ
const AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
];

const getRandomHeader = () => {
    return {
        'User-Agent': AGENTS[Math.floor(Math.random() * AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processPlayerHistory(playerId) {
    const url = `https://www.transfermarkt.com.tr/profil/rueckennummern/spieler/${playerId}`;
    
    try {
        const response = await axios.get(url, { 
            headers: getRandomHeader(),
            timeout: 10000 
        });

        const $ = cheerio.load(response.data);
        const rows = $('table.items tbody tr');

        // --- DÜZELTME BURADA BAŞLIYOR ---
        
        // Eğer tablo boşsa (oyuncunun geçmiş verisi yoksa)
        if (rows.length === 0) {
            // YİNE DE VERİTABANINA "TARANDI" DİYE İŞARETLEMEMİZ LAZIM!
            db.run("UPDATE players SET is_history_scanned = 1 WHERE id = ?", [playerId], (err) => {
                if(!err) console.log(`⚠️ ID: ${playerId} | Veri Yok (Boş) -> Geçildi.`);
            });
            return; // Şimdi çıkabilirsin
        }

        // --- DÜZELTME BİTTİ ---

        let addedCount = 0;

        // DB işlemleri
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            rows.each((i, el) => {
                const linkTag = $(el).find('td.hauptlink.no-border-links a').first();
                const href = linkTag.attr('href');
                let teamName = linkTag.text().trim();

                if (href && href.includes('/verein/')) {
                    const parts = href.split('/');
                    const vereinIndex = parts.indexOf('verein');

                    if (vereinIndex !== -1 && parts[vereinIndex + 1]) {
                        const teamId = parts[vereinIndex + 1];
                        const fullTeamUrl = `https://www.transfermarkt.com.tr${href}`;

                        db.run(`INSERT OR IGNORE INTO teams (id, name, url) VALUES (?, ?, ?)`, 
                            [teamId, teamName, fullTeamUrl]);

                        db.run(`INSERT OR IGNORE INTO player_teams (player_id, team_id) VALUES (?, ?)`, 
                            [playerId, teamId]);
                        
                        addedCount++;
                    }
                }
            });

            // İşlendi tiki at
            db.run("UPDATE players SET is_history_scanned = 1 WHERE id = ?", [playerId]);
            db.run("COMMIT");
        });

        console.log(`✅ ID: ${playerId} | Takım Sayısı: ${addedCount}`);

    } catch (error) {
        // Hata durumunda da sonsuz döngüye girmemek için "taranmış" gibi işaretleyebilirsin
        // veya sadece loglayıp geçebilirsin. Şimdilik ban kontrolü kalsın.
        if (error.response && error.response.status === 403) {
            console.error("⛔ BAN (403)! Bekleniyor...");
            throw new Error("BAN");
        } else {
            console.error(`❌ Hata (ID: ${playerId}):`, error.message);
            // Hata veren oyuncuyu da geçmek istersen şu satırı aç:
            // db.run("UPDATE players SET is_history_scanned = 1 WHERE id = ?", [playerId]);
        }
    }
}

// --- ANA DÖNGÜ ---
(async () => {
    console.log("🚀 BOT BAŞLATILIYOR (Bağımsız Mod)...");
    
    // Önce Sütun Kontrolü Yapalım (Eğer yoksa ekler, hata vermez)
    db.run("ALTER TABLE players ADD COLUMN is_history_scanned INTEGER DEFAULT 0", (err) => {
        // Hata verirse (zaten varsa) görmezden gel
    });

    while(true) {
        console.log("🔍 Sıradaki oyuncu aranıyor...");

        const player = await new Promise((resolve) => {
            // Callback'in çalıştığını görmek için log ekledik
            db.get("SELECT id FROM players WHERE is_history_scanned = 0 LIMIT 1", (err, row) => {
                if (err) {
                    console.error("💥 SORGU HATASI:", err.message);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (!player) {
            console.log("🎉 BİTTİ! Taranacak oyuncu kalmadı.");
            break;
        }

        console.log(`▶️ İşleniyor: ${player.id}`);

        try {
            await processPlayerHistory(player.id);
            const waitTime = Math.floor(Math.random() * 1000) + 500; // 0.5 - 1.5 sn arası
            await sleep(waitTime); 
        } catch (e) {
            if (e.message === "BAN") {
                console.log("😴 Ban koruması: 1 dakika mola...");
                await sleep(60000);
            }
        }
    }
})();