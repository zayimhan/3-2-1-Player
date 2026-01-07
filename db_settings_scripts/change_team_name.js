const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

// DEĞİŞTİRİLECEK BİLGİLER
const ESKI_ISIM = "FC CHELSEA"; // Veritabanındaki şu anki hali (Tam tutmalı)
const YENI_ISIM = "CHELSEA";   // Olmasını istediğin hali

db.serialize(() => {
    // 1. Önce takımı bulalım ki var mı yok mu görelim
    db.get("SELECT id, name FROM teams WHERE name = ?", [ESKI_ISIM], (err, row) => {
        if (err) {
            console.error("❌ Hata:", err.message);
            return;
        }

        if (!row) {
            console.log(`⚠️ UYARI: '${ESKI_ISIM}' adında bir takım bulunamadı!`);
            console.log("İpucu: Harf hatası olabilir veya takımın ID'sini kullanman gerekebilir.");
            return;
        }

        console.log(`✅ Takım Bulundu: ${row.name} (ID: ${row.id})`);

        // 2. İsmi Güncelle
        db.run("UPDATE teams SET name = ? WHERE id = ?", [YENI_ISIM, row.id], function(err) {
            if (err) {
                console.error("❌ Güncelleme Hatası:", err.message);
            } else {
                console.log(`🎉 BAŞARILI! Takım ismi değiştirildi.`);
                console.log(`Eski: ${ESKI_ISIM} -> Yeni: ${YENI_ISIM}`);
                console.log(`Etkilenen Satır: ${this.changes}`);
            }
        });
    });
});