// mark_nationals.js - MİLLİ TAKIMLARI İŞARETLEME 🏳️
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

// Transfermarkt TR formatına uygun Ülke Listesi
// Listeyi genişlettikçe hassasiyet artar. En popülerleri ekledim.
const ULKELER = [
    "Türkiye", "Almanya", "Fransa", "İtalya", "İspanya", "İngiltere", 
    "Brezilya", "Arjantin", "Portekiz", "Hollanda", "Belçika", "Hırvatistan",
    "Uruguay", "Kolombiya", "Şili", "Meksika", "ABD", "Kanada",
    "Fas", "Senegal", "Mısır", "Nijerya", "Gana", "Fildişi Sahili", "Kamerun",
    "Japonya", "Güney Kore", "Avustralya", "İran", "Suudi Arabistan",
    "Rusya", "Ukrayna", "Polonya", "Sırbistan", "Yunanistan", "Çekya",
    "İsveç", "Norveç", "Danimarka", "İsviçre", "Avusturya", "İskoçya", "Galler",
    "İrlanda", "Kuzey İrlanda", "Macaristan", "Romanya", "Bulgaristan",
    "Bosna-Hersek", "Arnavutluk", "Kuzey Makedonya", "Slovenya", "Slovakya",
    "Cezayir", "Tunus", "Güney Afrika", "Kosta Rika", "Ekvador", "Paraguay", 
    "Peru", "Venezuela", "Mali", "Cezayir", "Burkina Faso", "Gine"
];

db.serialize(() => {
    console.log("🚩 Milli takım tespit operasyonu başlıyor...");

    // 1. ADIM: Sütun Ekle (Zaten varsa hata vermez, geçer)
    db.run("ALTER TABLE teams ADD COLUMN is_national INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("⚠️ Sütun hatası:", err.message);
        }
    });

    // 2. ADIM: Takımları Tara ve İşaretle
    db.all("SELECT id, name FROM teams", [], (err, teams) => {
        if (err) throw err;

        console.log(`📊 ${teams.length} takım inceleniyor...`);
        db.run("BEGIN TRANSACTION");

        let markedCount = 0;

        teams.forEach(team => {
            const teamName = team.name.trim();
            let isNational = false;

            // KONTROL 1: İsmi direkt Ülke listesinde var mı? (Örn: "Arjantin")
            if (ULKELER.includes(teamName)) {
                isNational = true;
            } 
            // KONTROL 2: İsmi Ülke ile başlıyor mu? (Örn: "Arjantin U20", "Arjantin Olimpiyat")
            // "Arjantin " (sonunda boşluk) arıyoruz ki "Arjantinspor" gibi kulüpler karışmasın.
            else {
                for (const ulke of ULKELER) {
                    if (teamName.startsWith(ulke + " ")) {
                        isNational = true;
                        break;
                    }
                }
            }

            if (isNational) {
                // is_national = 1 yapıyoruz
                db.run("UPDATE teams SET is_national = 1 WHERE id = ?", [team.id]);
                markedCount++;
            }
        });

        db.run("COMMIT", () => {
            console.log("------------------------------------------------");
            console.log(`🎉 BİTTİ!`);
            console.log(`🏳️ Toplam ${markedCount} takım 'Milli Takım' olarak işaretlendi.`);
        });
    });
});