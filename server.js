// server.js - TAM VE SON VERSİYON 🏆
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
// Sunucu bize bir port verirse onu kullan, vermezse 3000 kullan
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public')); // Frontend dosyalarını sunar

// Veritabanı Bağlantısı
const db = new sqlite3.Database('./futbol.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("❌ DB Hatası:", err.message);
    else console.log("🔌 futbol.db bağlantısı başarılı.");
});

// Yardımcı: Promise yapısı (Async/Await kullanmak için)
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// 1. OYUN: Maç Getir
app.get('/get-match', async (req, res) => {
    try {
        const teamA_List = await query(`
            SELECT id, name, proper_name, logo 
            FROM teams 
            WHERE is_popular = 1 AND logo IS NOT NULL 
            ORDER BY RANDOM() LIMIT 1
        `);

        if (teamA_List.length === 0) return res.status(500).json({ error: "Takım bulunamadı." });
        const homeTeam = teamA_List[0];

        const awayTeam_List = await query(`
            SELECT DISTINCT t.id, t.name, t.proper_name, t.logo
            FROM teams t
            JOIN player_teams pt1 ON t.id = pt1.team_id
            JOIN player_teams pt2 ON pt1.player_id = pt2.player_id
            WHERE pt2.team_id = ? AND t.id != ? AND t.is_popular = 1 AND t.logo IS NOT NULL
            ORDER BY RANDOM() LIMIT 1
        `, [homeTeam.id, homeTeam.id]);

        let awayTeam = awayTeam_List.length > 0 ? awayTeam_List[0] : null;

        if (!awayTeam) {
            const randomList = await query(`SELECT * FROM teams WHERE is_popular=1 AND id != ? ORDER BY RANDOM() LIMIT 1`, [homeTeam.id]);
            awayTeam = randomList[0];
        }

        res.json({
            home: { id: homeTeam.id, name: homeTeam.proper_name || homeTeam.name, logo: homeTeam.logo },
            away: { id: awayTeam.id, name: awayTeam.proper_name || awayTeam.name, logo: awayTeam.logo }
        });

    } catch (error) {
        console.error("Maç hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

// 2. ARAMA: Oyuncu Ara
app.get('/api/search-list', async (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 3) return res.json({ results: [] });

    try {
        const sql = `SELECT id, name, image FROM players WHERE name LIKE ? LIMIT 10`;
        const players = await query(sql, [`%${q}%`]);

        const results = players.map(p => ({
            id: p.id,
            name: p.name,
            photo: p.image ? p.image : 'https://media.api-sports.io/football/players/1.png'
        }));

        res.json({ results });

    } catch (error) {
        console.error("Arama hatası:", error);
        res.json({ results: [] });
    }
});

// 3. KONTROL: Oyuncu Doğrulama
app.get('/api/check-player-by-id', async (req, res) => {
    const playerId = req.query.id;
    if (!playerId) return res.json({ found: false });

    try {
        const rows = await query(`SELECT team_id FROM player_teams WHERE player_id = ?`, [playerId]);
        const teamIds = rows.map(r => r.team_id);

        const parentRows = await query(`
            SELECT t.parent_id FROM player_teams pt 
            JOIN teams t ON pt.team_id = t.id 
            WHERE pt.player_id = ? AND t.parent_id IS NOT NULL
        `, [playerId]);
        
        parentRows.forEach(r => teamIds.push(r.parent_id));

        res.json({ found: true, teams: teamIds });

    } catch (error) {
        console.error("Doğrulama hatası:", error);
        res.status(500).json({ error: "Hata" });
    }
});

// 4. CEVAP ANAHTARI (YENİ EKLENEN KISIM) 🧩
app.get('/api/get-common-players', async (req, res) => {
    try {
        const { team1, team2 } = req.query;

        //console.log(`📡 İSTEK GELDİ: Ortak oyuncu aranıyor -> ${team1} vs ${team2}`);

        if (!team1 || !team2) {
            return res.status(400).json({ error: "Eksik ID" });
        }

        const t1 = parseInt(team1);
        const t2 = parseInt(team2);

        // SQL: İki takımın kesişim kümesi (Parent ID destekli)
        const sql = `
            SELECT DISTINCT p.id, p.name, p.image
            FROM players p
            JOIN player_teams pt1 ON p.id = pt1.player_id
            JOIN teams tm1 ON pt1.team_id = tm1.id
            JOIN player_teams pt2 ON p.id = pt2.player_id
            JOIN teams tm2 ON pt2.team_id = tm2.id
            WHERE 
                COALESCE(tm1.parent_id, tm1.id) = ?
                AND
                COALESCE(tm2.parent_id, tm2.id) = ?
            LIMIT 50
        `;

        const rows = await query(sql, [t1, t2]);
        //console.log(`✅ BULUNDU: ${rows.length} oyuncu.`);

        const players = rows.map(p => ({
            id: p.id,
            name: p.name,
            photo: p.image ? p.image : 'https://media.api-sports.io/football/players/1.png'
        }));

        res.json({ players });

    } catch (error) {
        console.error("❌ DB SORGU HATASI:", error);
        res.status(500).json({ error: "Veritabanı hatası" });
    }
});

// 5. OYUNCU GEÇMİŞİ: Bir Oyuncunun Oynadığı Tüm Takımlar 📚
app.get('/api/get-player-teams', async (req, res) => {
    try {
        const playerId = req.query.id;

        if (!playerId) {
            return res.status(400).json({ error: "Oyuncu ID eksik" });
        }

        console.log(`📚 Kariyer sorgulanıyor: Oyuncu ID ${playerId}`);

        const sql = `
            SELECT t.name, t.logo 
            FROM teams t
            JOIN player_teams pt ON t.id = pt.team_id
            WHERE pt.player_id = ?
            ORDER BY t.name ASC
        `;

        const rows = await query(sql, [playerId]);
        
        //console.log(`✅ ${rows.length} takım bulundu.`);
        res.json({ teams: rows });

    } catch (error) {
        console.error("Kariyer hatası:", error);
        res.status(500).json({ error: "Veritabanı hatası" });
    }
});

// --- SUNUCUYU BAŞLAT (BU SATIR EN SONDA OLMALI) ---
app.listen(PORT, () => {
    console.log(`🚀 Sunucu Başladı: http://localhost:${PORT}`);
    // console.log(`👉 Test etmek için: http://localhost:${PORT}/api/get-common-players?team1=33&team2=85 (Örnek ID'ler)`);
});