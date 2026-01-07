// public/search.js

let currentHome = { id: null };
let currentAway = { id: null };
let selectedPlayerId = null;
let selectedPlayerPhoto = null;
let debounceTimer;
let messageTimer; // Mesaj zamanlayıcısı

// script.js'den gelen takım bilgilerini güncelle
function updateCurrentTeams(homeId, homeName, awayId, awayName) {
    currentHome = { id: homeId };
    currentAway = { id: awayId };

    // Ekranı temizle
    const input = document.getElementById('player-input');
    const box = document.getElementById('suggestions-box');
    const resultBox = document.getElementById('search-result');

    if(input) input.value = "";
    if(box) {
        box.innerHTML = "";
        box.classList.add('hidden-list');
    }
    if(resultBox) resultBox.classList.add('hidden');
    
    selectedPlayerId = null;
}

// 1. INPUT DİNLEYİCİSİ (Sen yazarken çalışır)
const playerInput = document.getElementById('player-input');

if (playerInput) {
    playerInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        const box = document.getElementById('suggestions-box');

        selectedPlayerId = null; // Yeni bir şey yazınca seçimi sıfırla

        // EĞER KUTU BOŞSA LİSTEYİ GİZLE VE FONKSİYONDAN ÇIK
        if (query.length === 0) {
            box.classList.add('hidden-list'); // DÜZELTİLDİ: suggestionsBox -> box
            box.innerHTML = '';
            return; 
        }

        if (query.length < 3) {
            box.innerHTML = '';
            box.classList.add('hidden-list'); // DÜZELTİLDİ
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 300); // 300ms bekle sonra ara
    });
}

// 2. SUNUCUDAN LİSTE ÇEK
async function fetchSuggestions(query) {
    const box = document.getElementById('suggestions-box');
    try {
        const res = await fetch(`/api/search-list?q=${query}`);
        const data = await res.json();

        box.innerHTML = '';

        if (data.results && data.results.length > 0) {
            box.classList.remove('hidden-list'); // Listeyi göster

            data.results.forEach(player => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';

                // Yeni CSS'e uygun HTML yapısı
                item.innerHTML = `
                    <img src="${player.photo}">
                    <span>${player.name}</span>
                `;

                // Tıklayınca ne olsun?
                item.onclick = () => {
                    document.getElementById('player-input').value = player.name;
                    selectedPlayerId = player.id;
                    selectedPlayerPhoto = player.photo;
                    
                    // Kutuyu kapat
                    box.innerHTML = '';
                    box.classList.add('hidden-list');
                };

                box.appendChild(item);
            });
        } else {
            box.classList.add('hidden-list');
        }
    } catch (err) {
        console.error("Arama hatası:", err);
    }
}

// KONTROL ET BUTONU
window.checkPlayer = async function() {
    const resultBox = document.getElementById('search-result');
    const inputVal = document.getElementById('player-input').value;

    if (!selectedPlayerId) {
        alert("Lütfen listeden bir oyuncu seçin!");
        return;
    }

    // Varsa eski sayacı iptal et
    if (messageTimer) clearTimeout(messageTimer);

    resultBox.innerHTML = "Kontrol ediliyor...";
    resultBox.className = "result-box loading";
    resultBox.classList.remove('hidden');

    try {
        const res = await fetch(`/api/check-player-by-id?id=${selectedPlayerId}`);
        const data = await res.json();

        if (!data.found) {
            showResult("❌ Veri alınamadı.", "error");
            return;
        }

        const homeCheck = data.teams.includes(Number(currentHome.id));
        const awayCheck = data.teams.includes(Number(currentAway.id));

        if (homeCheck && awayCheck) {
            const htmlContent = `
                <img src="${selectedPlayerPhoto}" class="player-thumb" style="width:40px; height:40px; border-radius:50%; border:2px solid white;">
                <div style="text-align:left;">
                    <strong style="color:#2ecc71;">✅ DOĞRU!</strong><br>
                    <span style="font-size:10px;">${inputVal}</span>
                </div>
            `;
            showResult(htmlContent, "success", true); 
            
            // Eğer puan artırma varsa buraya: increaseScore();
        } else {
            showResult(`❌ Yanlış.`, "error");
        }

    } catch (err) {
        console.error(err);
        showResult("⚠️ Hata oluştu.", "error");
    }
};

// Mesaj Gösterme ve Otomatik Gizleme
function showResult(message, type, isHtml = false) {
    const resultBox = document.getElementById('search-result');
    
    if (isHtml) {
        resultBox.innerHTML = message;
    } else {
        resultBox.innerText = message;
    }
    
    resultBox.className = `result-box ${type}`;
    resultBox.classList.remove('hidden');

    // Kutuya tıklayınca hemen kapansın
    resultBox.onclick = function() {
        resultBox.classList.add('hidden');
    };

    // 3 Saniye sonra kendiliğinden kapansın
    messageTimer = setTimeout(() => {
        resultBox.classList.add('hidden');
    }, 3000);
}

// Sayfa geçiş fonksiyonları (HTML onclick'ler için gerekli)
window.openSearchScreen = function() {
    document.getElementById('game-screen').classList.add('hidden');
    const searchScreen = document.getElementById('search-screen');
    searchScreen.classList.remove('hidden');
    
    // Inputa odaklan
    setTimeout(() => {
        const input = document.getElementById('player-input');
        if(input) input.focus();
    }, 100);
}

window.closeSearchScreen = function() {
    document.getElementById('search-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}


// === OYUNCU KARİYERİ GETİR ===
window.getPlayerCareer = async function() {
    const careerContainer = document.getElementById('career-container');
    const careerGrid = document.getElementById('career-grid');
    const resultBox = document.getElementById('search-result');

    // Eğer oyuncu seçilmediyse uyar
    if (!selectedPlayerId) {
        alert("Lütfen önce listeden bir oyuncu seçin!");
        return;
    }

    // Diğer kutuları gizle, kariyeri aç
    resultBox.classList.add('hidden');
    careerContainer.classList.remove('hidden');
    
    careerGrid.innerHTML = '<p style="color:white; text-align:center;">Kariyer yükleniyor...</p>';

    try {
        const res = await fetch(`/api/get-player-teams?id=${selectedPlayerId}`);
        const data = await res.json();

        careerGrid.innerHTML = ''; // Temizle

        if (data.teams && data.teams.length > 0) {
            data.teams.forEach(team => {
                const card = document.createElement('div');
                // Cevap anahtarındaki kart stilini (CSS) aynen kullanıyoruz
                card.className = 'answer-card'; 
                
                card.innerHTML = `
                    <img src="${team.logo}" 
     onerror="this.src='default_logo.png';"  style="border-radius: 0; border: none; background: transparent;">
                    <span>${team.name}</span>
                `;
                careerGrid.appendChild(card);
            });
        } else {
            careerGrid.innerHTML = '<p style="color:white;">Kayıtlı takım bulunamadı.</p>';
        }

    } catch (err) {
        console.error(err);
        careerGrid.innerHTML = '<p style="color:red;">Hata oluştu.</p>';
    }
};

// Ufak bir düzeltme: Yeni arama yapmaya başlarsan kariyer ekranı kapansın
document.getElementById('player-input').addEventListener('input', function() {
    document.getElementById('career-container').classList.add('hidden');
});


// === CEVAPLAR EKRANI FONKSİYONLARI ===

async function openAnswersScreen() {
    // 1. Ekranları değiştir
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('answers-screen').classList.remove('hidden');
    
    const grid = document.getElementById('answers-grid');
    grid.innerHTML = '<p style="color:white; text-align:center; width:100%;">Yükleniyor...</p>';

    // 2. Takım ID'leri var mı kontrol et
    if (!currentHome.id || !currentAway.id) {
        grid.innerHTML = '<p>Takım bilgisi bulunamadı.</p>';
        return;
    }

    try {
        // 3. API'den Ortak Oyuncuları Çek
        // Backend'inde böyle bir rota olmalı: /api/common-players?team1=123&team2=456
        const res = await fetch(`/api/get-common-players?team1=${currentHome.id}&team2=${currentAway.id}`);
        const data = await res.json();

        grid.innerHTML = ''; // "Yükleniyor" yazısını temizle

        if (data.players && data.players.length > 0) {
            // 4. Her oyuncu için bir kart oluştur
            data.players.forEach(player => {
                const card = document.createElement('div');
                card.className = 'answer-card';
                
                // Oyuncu verisi (API'den gelen yapıya göre düzenle)
                // player.name ve player.photo varsayıyoruz
                card.innerHTML = `
                    <img src="${player.photo}" alt="${player.name}" onerror="this.src='https://media.api-sports.io/football/players/158.png'"> <span>${player.name}</span>
                `;
                
                // Karta tıklayınca otomatik seçsin mi? (Opsiyonel)
                /* card.onclick = () => {
                    closeAnswersScreen();
                    document.getElementById('player-input').value = player.name;
                    // checkPlayer();
                }; */

                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<p style="color:white;">Hiç ortak oyuncu bulunamadı!</p>';
        }

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:#e74c3c;">Bağlantı hatası!</p>';
    }
}

function closeAnswersScreen() {
    document.getElementById('answers-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}