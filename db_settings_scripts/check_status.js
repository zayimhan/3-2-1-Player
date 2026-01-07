const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futbol.db');

db.get("SELECT count(*) as kalan FROM players WHERE is_history_scanned = 0", (err, row) => {
    if(err) console.log(err);
    else console.log(`📋 TARANMAYI BEKLEYEN OYUNCU SAYISI: ${row.kalan}`);
});