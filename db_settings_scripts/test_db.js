// test_db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

console.log("1. Veritabanına bağlanıldı...");

db.get("SELECT count(*) as sayi FROM players", (err, row) => {
    if (err) {
        console.error("❌ HATA:", err.message);
    } else {
        console.log(`✅ BAŞARILI! Veritabanında ${row.sayi} oyuncu var.`);
        console.log("Veritabanı kilidi açık, kodun çalışabilir!");
    }
});