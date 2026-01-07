// temizlik.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

db.serialize(() => {
    // Roster tablosunu tamamen siler
    db.run("DROP TABLE IF EXISTS roster", (err) => {
        if (err) {
            console.error("❌ Hata oluştu:", err.message);
        } else {
            console.log("✅ 'roster' tablosu başarıyla silindi!");
        }
    });
});

db.close();