// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

function setup() {
    db.serialize(() => {
        // 1. TAKIMLAR (Örn: Fenerbahçe, ID: 36)
        db.run(`CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY,
            name TEXT,
            url TEXT,
            logo TEXT
        )`);

        // 2. OYUNCULAR (Örn: Mert Günok)
        db.run(`CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY, -- Transfermarkt ID'si olacak
            name TEXT,
            position TEXT,
            image TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS player_teams (
            player_id INTEGER,
            team_id INTEGER,
            FOREIGN KEY(player_id) REFERENCES players(id),
            FOREIGN KEY(team_id) REFERENCES teams(id),
            PRIMARY KEY (player_id, team_id)
        )`);

        // Oyuncuların taranıp taranmadığını takip etmek için sütun ekle
        // (Eğer daha önce eklediysen hata vermez, try-catch ile geçiyoruz)
        try {
            db.run("ALTER TABLE players ADD COLUMN is_history_scanned INTEGER DEFAULT 0");
        } catch (e) {}

        console.log("✅ Veritabanı tabloları hazır: futbol.db");
    });
}

// Başka dosyalardan kullanmak için dışa aktarıyoruz
module.exports = { db, setup };

// Eğer bu dosyayı direkt çalıştırırsan kurulumu yap
if (require.main === module) {
    setup();
    db.close();
}