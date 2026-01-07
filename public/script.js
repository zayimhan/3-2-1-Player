let playerCount = 2;

document.addEventListener("DOMContentLoaded", () => {
  renderInputs();
});

function setPlayerCount(count) {
  playerCount = count;
  document.getElementById("btn-2p").classList.toggle("active", count === 2);
  document.getElementById("btn-3p").classList.toggle("active", count === 3);
  renderInputs();
}

function renderInputs() {
  const container = document.getElementById("inputs-area");
  container.innerHTML = "";
  for (let i = 1; i <= playerCount; i++) {
    container.innerHTML += `<input type="text" id="p${i}" placeholder="Oyuncu ${i}" value="Player ${i}">`;
  }
}
    
// ... (Üst kısımlar aynı kalabilir)

// public/script.js

function startGame() {
  // İsimleri al
  const names = [];
  for (let i = 1; i <= playerCount; i++) {
    names.push(document.getElementById(`p${i}`).value);
  }

  // Ekran değiştir
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  // Oyuncuları sahaya diz
  const field = document.getElementById("players-container");
  field.innerHTML = "";

  names.forEach((name, index) => {
    let playerId = index + 1;
    const randomNum = Math.floor(Math.random() * 4) + 1;
    const jerseyImage = `jerseys/${randomNum}.webp`;
    field.innerHTML += `
            <div class="player-wrapper">
                <div class="pixel-player" style="background-image: url('${jerseyImage}')">
                    <div class="jersey">
                        <span class="player-name">${name}</span>
                    </div>
                </div>

                <div class="score-board">
                    <button class="control-btn" onclick="updateScore('score-${playerId}', -1)">-</button>
                    <span id="score-${playerId}" class="score-val">0</span>
                    <button class="control-btn" onclick="updateScore('score-${playerId}', 1)">+</button>
                </div>
            </div>
        `;
  });
}

// --- YENİ FONKSİYON: Skoru Güncelle ---
function updateScore(elementId, change) {
  const scoreSpan = document.getElementById(elementId);
  let currentScore = parseInt(scoreSpan.innerText);

  let newScore = currentScore + change;

  if (newScore < 0) newScore = 0;

  scoreSpan.innerText = newScore;
}

// public/script.js

let isFetching = false; // Üst üste tıklamayı engellemek için

async function fetchMatch() {
  if (isFetching) return;
  isFetching = true;

  const vsDiv = document.querySelector(".vs");
  const matchBoard = document.querySelector(".match-board");

  // 1. MODU DEĞİŞTİR: 'loading' sınıfı ekle (CSS bunu kullanacak)
  matchBoard.classList.add("loading");

  // 2. VERİYİ ÇEK (Arka planda hemen başlatıyoruz)
  const requestPromise = fetch("/get-match").then((res) => res.json());

  // 3. GERİ SAYIM BAŞLAT
  let timeLeft = 3;
  vsDiv.innerText = timeLeft;

  const timer = setInterval(async () => {
    timeLeft--;

    if (timeLeft > 0) {
      vsDiv.innerText = timeLeft;
    } else {
      // SÜRE BİTTİ!
      clearInterval(timer);

      try {
        // Verinin gelmesini bekle
        const data = await requestPromise;

        // --- İŞTE PÜF NOKTASI: Resimleri önceden yükle ---
        // Bu sayede ekranda göstermeden önce tarayıcı hafızasına alıyoruz
        await Promise.all([
          preloadImage(data.home.logo),
          preloadImage(data.away.logo),
        ]);

        // Şimdi verileri güvenle yerleştirebiliriz
        document.getElementById("home-name").innerText = data.home.name;
        document.getElementById("home-logo").src = data.home.logo;

        document.getElementById("away-name").innerText = data.away.name;
        document.getElementById("away-logo").src = data.away.logo;

        document.getElementById("home-name").classList.remove("ready-mode");
        document.getElementById("away-name").classList.remove("ready-mode");

        // ARAMA MODÜLÜNÜ GÜNCELLE
        if (typeof updateCurrentTeams === "function") {
          // ARTIK 4 PARAMETRE YOLLUYORUZ: (Ev ID, Ev İsim, Deplasman ID, Deplasman İsim)
          updateCurrentTeams(
            data.home.id,
            data.home.name,
            data.away.id,
            data.away.name
          );
        }
      } catch (error) {
        console.error("Hata:", error);
      }

      // 4. NORMAL MODA DÖN
      vsDiv.innerText = "VS";
      matchBoard.classList.remove("loading");
      isFetching = false;
    }
  }, 1000); // Her 1 saniyede bir çalış
}

// Resmin yüklenmesini bekleyen yardımcı fonksiyon
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = resolve; // Yüklendiğinde tamam de
    img.onerror = resolve; // Hata olsa bile takılma, devam et
  });
}

function toggleSearchUI(show) {
  const openBtn = document.getElementById("open-search-btn");
  const searchArea = document.getElementById("active-search-area");
  const inputField = document.getElementById("player-input");
  const suggestionsBox = document.getElementById("suggestions-box");

  if (show) {
    // Arama modunu AÇ
    openBtn.classList.add("hide-btn"); // Butonu gizle
    searchArea.classList.add("show-search"); // Inputları göster
    inputField.focus(); // Yazmaya hazır olsun
  } else {
    // Arama modunu KAPAT
    openBtn.classList.remove("hide-btn"); // Butonu geri getir
    searchArea.classList.remove("show-search"); // Inputları gizle

    // Temizlik işlemleri
    inputField.value = ""; // Yazıyı sil
    suggestionsBox.classList.add("suggestions-hidden"); // Önerileri kapat
    document.getElementById("search-result").classList.add("hidden"); // Sonuç kutusunu gizle
  }
}
function openSearchScreen() {
  // Maç ekranını gizle
  document.getElementById("game-screen").classList.add("hidden");
  // Arama ekranını aç
  document.getElementById("search-screen").classList.remove("hidden");
}

function closeSearchScreen() {
  // Arama ekranını gizle
  document.getElementById("search-screen").classList.add("hidden");
  // Maç ekranını geri aç
  document.getElementById("game-screen").classList.remove("hidden");

  // İstersen geri dönünce inputu temizle:
   document.getElementById('player-input').value = '';
   document.getElementById('suggestions-box').classList.add('suggestions-hidden');
   document.getElementById('search-result').classList.add('hidden');
}


// === TEMA SİSTEMİ ===

// Sayfa açılınca hafızadaki temayı kontrol et
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('gameTheme');
    if (savedTheme === 'modern') {
        enableModernTheme();
    }
});

function toggleTheme() {
    const body = document.body;
    
    // Eğer şu an modern ise -> Retro yap
    if (body.classList.contains('modern-theme')) {
        disableModernTheme();
    } else {
        // Değilse -> Modern yap
        enableModernTheme();
    }
}

function enableModernTheme() {
    document.body.classList.add('modern-theme');
    localStorage.setItem('gameTheme', 'modern'); // Hafızaya kaydet
    
    // Buton yazısını güncelle
    const btn = document.getElementById('theme-btn');
    if(btn) {
        btn.innerText = "✨ MODERN";
        btn.style.backgroundColor = "#8e44ad"; // Buton rengi mor olsun
    }
}

function disableModernTheme() {
    document.body.classList.remove('modern-theme');
    localStorage.setItem('gameTheme', 'retro'); // Hafızaya kaydet
    
    // Buton yazısını güncelle
    const btn = document.getElementById('theme-btn');
    if(btn) {
        btn.innerText = "👾 RETRO";
        btn.style.backgroundColor = "#34495e"; // Buton rengi eski haline dönsün
    }
}