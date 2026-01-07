// scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const { db } = require('./database');

// --- AYARLAR ---
// Tarayıcı gibi görünmek için Header'lar
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

// LİG LİSTESİ (Referans İçin)
const LEAGUES = {
    'TR1': '🇹🇷 Süper Lig',
    'GB1': '🇬🇧 Premier League',
    'ES1': '🇪🇸 La Liga',
    'L1':  '🇩🇪 Bundesliga',
    'IT1': '🇮🇹 Serie A',
    'FR1': '🇫🇷 Ligue 1'
};

// !!! BURAYI DEĞİŞTİREREK LİG SEÇ !!!
const SELECTED_LEAGUE_CODE = 'FR1'; 

// Hangi yılları çekeceksin?
const START_YEAR = 2010;
const END_YEAR = 2025;

// -------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. LİGDEKİ TAKIMLARI BUL
async function getLeagueTeams(leagueCode, season) {
    const url = `https://www.transfermarkt.com.tr/super-lig/startseite/wettbewerb/${leagueCode}/saison_id/${season}`;
    console.log(`\n🏆 [${season}] ${LEAGUES[leagueCode] || leagueCode} Taranıyor...`);
    console.log(`   🔗 URL: ${url}`);

    try {
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const teams = [];

        // Tablodaki takım isimlerini bul
        $('td.hauptlink.no-border-links').each((i, el) => {
            const linkTag = $(el).find('a').first();
            const href = linkTag.attr('href');
            const name = linkTag.text().trim();

            if (href && href.includes('/verein/')) {
                const parts = href.split('/');
                const vereinIndex = parts.indexOf('verein');
                
                if (vereinIndex !== -1 && parts[vereinIndex + 1]) {
                    const teamId = parts[vereinIndex + 1];
                    const teamSlug = parts[1]; 

                    // Çift kayıt kontrolü
                    if (!teams.find(t => t.id === teamId)) {
                        teams.push({ name, slug: teamSlug, id: teamId });
                    }
                }
            }
        });

        console.log(`   -> ${teams.length} takım bulundu.`);
        return teams;

    } catch (error) {
        console.error(`❌ Lig Hatası:`, error.message);
        return [];
    }
}

// 2. TAKIM KADROSUNU ÇEK (ROSTER İPTAL EDİLDİ)
async function scrapeSquad(teamSlug, teamId, season) {
    const url = `https://www.transfermarkt.com.tr/${teamSlug}/kader/verein/${teamId}/saison_id/${season}`;
    
    try {
        const response = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const playerRows = $('#yw1 table.items > tbody > tr');

        if (playerRows.length === 0) return;

        let count = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Takımı kaydet
            const teamNameDisplay = teamSlug.replace(/-/g, ' ').toUpperCase();
            db.run(`INSERT OR IGNORE INTO teams (id, name, url) VALUES (?, ?, ?)`, [teamId, teamNameDisplay, url]);

            playerRows.each((index, element) => {
                const nameElement = $(element).find('.hauptlink a').first();
                const playerName = nameElement.text().trim();
                const playerLink = nameElement.attr('href');
                
                let playerId = null;
                if (playerLink) {
                    const parts = playerLink.split('/');
                    playerId = parts[parts.length - 1];
                }

                const position = $(element).find('table.inline-table tr td').last().text().trim();
                const imgElement = $(element).find('table.inline-table img');
                const playerImg = imgElement.attr('data-src') || imgElement.attr('src');

                if (playerId && playerName) {
                    // SADECE Oyuncuyu Ekle
                    const stmtPlayer = db.prepare(`INSERT OR IGNORE INTO players (id, name, position, image) VALUES (?, ?, ?, ?)`);
                    stmtPlayer.run(playerId, playerName, position, playerImg);
                    stmtPlayer.finalize();

                    // --- ROSTER KISMI SİLİNDİ ---
                    // Artık oyuncu-takım ilişkisini kaydetmiyoruz.
                    // Bu işlemi daha sonra ID'ler üzerinden toplu yapacağız.

                    count++;
                }
            });
            db.run("COMMIT");
        });
        
        console.log(`      ✅ ${teamSlug}: ${count} oyuncu bulundu.`);

    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.error("      ⛔ BAN RİSKİ (403): 20 saniye soğuma molası...");
            await sleep(20000); // 403 yersek uzun bekle
        } else {
            // console.error("Hata:", error.message);
        }
    }
}

// --- 3. ANA ÇALIŞTIRICI ---
(async () => {
    console.log(`🚀 SCRAPER BAŞLIYOR: ${LEAGUES[SELECTED_LEAGUE_CODE]}`);
    console.log(`📅 YIL ARALIĞI: ${START_YEAR} - ${END_YEAR}`);

    for (let year = START_YEAR; year <= END_YEAR; year++) {
        // 1. Takımları Bul
        const teams = await getLeagueTeams(SELECTED_LEAGUE_CODE, year);
        
        // 2. Takımları Gez
        if (teams.length > 0) {
            for (const team of teams) {
                // Her takım arası 1.5 saniye bekle (Önemli!)
                await sleep(1500); 
                await scrapeSquad(team.slug, team.id, year);
            }
            console.log(`🏁 ${year} tamamlandı. Dinleniliyor (5 sn)...`);
            await sleep(5000); // Sezon arası mola
        } else {
            console.log(`⚠️ ${year} sezonunda takım bulunamadı.`);
        }
    }

    console.log("\n🎉 BU LİG İÇİN İŞLEM TAMAMLANDI!");
    console.log("Diğer lige geçmek için 'SELECTED_LEAGUE_CODE' değişkenini değiştirip tekrar çalıştır.");
})();