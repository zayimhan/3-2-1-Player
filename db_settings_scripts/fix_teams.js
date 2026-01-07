// fix_teams.js - TAKIM BİRLEŞTİRME VE TEMİZLİK 🧹
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./futbol.db");

// Bu ekler varsa, o takım bir "Yavru Takım"dır.
const SUFFIXES = [
  " U23",
  " U21",
  " U20",
  " U19",
  " U18",
  " U17",
  " U16",
  " U14",
  " U15",
  " U13",
  " A2",
  " Olimpiyatlar",
  " B",
  " C",
  " II",
  " Olimpiyat",
  " UEFA",
  " UEFA U19",
  " Olympic",
  " Jugend",
  " Altyapı",
  " Rezerv",
  " Castilla",
  " UEFA",
  " Jrs.",
  " Youth",
];

// İsimleri sadeleştirip "özüne" döndüren fonksiyon
// Örn: "FENERBAHCE ISTANBUL" -> "fenerbahce"
function normalizeName(name) {
  return (
    name
      .toLowerCase()
      // Türkçe karakterleri İngilizce karşılığına çevir
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      // Gereksiz uzantıları sil (Transfermarkt bazen şehir adı ekler)
      .replace(/ uefa/g, "")
      .replace(/ istanbul/g, "")
      .replace(/ futbol kulubu/g, "")
      .replace(/ fk/g, "")
      .replace(/ fc/g, "")
      .replace(/-/g, " ") // Tireleri boşluk yap
      .trim()
  );
}

db.serialize(() => {
  console.log("🔄 Takım birleştirme operasyonu başlıyor...");

  // 1. ADIM: parent_id sütunu ekle (Eğer yoksa)
  /*try {
    db.run("ALTER TABLE teams ADD COLUMN parent_id INTEGER DEFAULT NULL");
    console.log("✅ 'parent_id' sütunu eklendi/hazır.");
  } catch (e) {
    // Zaten varsa hata verir, önemli değil devam et.
  }*/
 console.log("ℹ️ Sütun ekleme adımı atlandı (Zaten var).");

  // 2. ADIM: Tüm takımları çek ve analize başla
  db.all("SELECT * FROM teams", [], (err, allTeams) => {
    if (err) throw err;
    console.log(`📊 Toplam ${allTeams.length} takım taranıyor...`);

    db.run("BEGIN TRANSACTION"); // İşlemleri hızlandır

    let baglananSayisi = 0;
    let oksuzSayisi = 0;

    allTeams.forEach((childTeam) => {
      let originalName = childTeam.name;
      let isChild = false;
      let cleanNameRaw = originalName;

      // İsimde "U19", "II" vb. var mı?
      for (const suffix of SUFFIXES) {
        // Hem sonda ("Dortmund II") hem de bitişik olabilir diye kontrol et
        if (
          originalName.includes(suffix) ||
          originalName.endsWith(suffix.trim())
        ) {
          // Eki sil, geriye "Borussia Dortmund" kalsın
          cleanNameRaw = originalName.replace(suffix, "").trim();
          isChild = true;
          break;
        }
      }

      if (isChild) {
        // Temizlediğimiz ismin "Normalleşmiş" halini al (küçük harf, türkçe karaktersiz)
        const normalizedCleanName = normalizeName(cleanNameRaw);

        // Şimdi veritabanında bu isme sahip "BABA"yı ara
        const parent = allTeams.find(
          (t) =>
            t.id !== childTeam.id && // Kendisi olmasın
            t.parent_id === null && // O da bir yavru olmasın (Babanın babası aranır)
            normalizeName(t.name) === normalizedCleanName // İsimler "özünde" aynı mı?
        );

        if (parent) {
          // EŞLEŞME BULUNDU!
          db.run("UPDATE teams SET parent_id = ? WHERE id = ?", [
            parent.id,
            childTeam.id,
          ]);
          console.log(`🔗 BAĞLANDI: ${originalName} -> ${parent.name}`);
          baglananSayisi++;
        } else {
          // Babası bulunamadı, logla ama dokunma (Güvenli Mod)
          // console.log(`⚠️ Öksüz Kaldı: ${originalName} (Aranan: ${normalizedCleanName})`);
          oksuzSayisi++;
        }
      }
    });

    db.run("COMMIT", () => {
      console.log("------------------------------------------------");
      console.log(`🎉 İŞLEM BİTTİ!`);
      console.log(
        `✅ ${baglananSayisi} alt yapı takımı başarıyla ana takıma bağlandı.`
      );
      console.log(
        `⚠️ ${oksuzSayisi} takımın ana takımı bulunamadı (Veri kaybı yok, olduğu gibi bırakıldı).`
      );
    });
  });
});
