// La base de données épurée des ratures
const themes = {
    "classiques": { name: "🟢 Thèmes Classiques", words: ["Marques de voitures", "Pays du monde", "Fruits ou légumes violets", "Objets qu'on trouve dans une cuisine", "Animaux qui n'ont pas de pattes", "Prénoms qui commencent par 'J'", "Choses qui se vendent en pharmacie", "Métiers où on porte un uniforme", "Villes françaises", "Objets qui tiennent dans une poche"] },
    "pop": { name: "🍥 Pop Culture & Geek", words: ["Personnages de Disney", "Pokémon de la 1ère génération", "Super-héros qui volent", "Jeux vidéo cultes", "Films d'horreur", "Séries Netflix", "Youtubeurs français", "Armes légendaires"] },
    "adulte": { name: "🔞 Adulte & Soirée", words: ["Marques d'alcool", "Positions du Kamasutra", "Excuses pour ne pas faire l'amour", "Choses qu'on fait dans le noir", "Insultes qui commencent par une voyelle", "Lieux insolites pour un rendez-vous coquin", "Objets qu'on trouve dans un sex-shop", "Choses qu'on dit pendant l'acte", "Cocktails célèbres"] },
    "cuisine": { name: "🍕 Cuisine & Nourriture", words: ["Ingrédients d'une pizza", "Types de pâtes", "Choses qu'on met dans un sandwich", "Saveurs de glaces", "Ustensiles de cuisine", "Marques de céréales", "Légumes verts", "Boissons sans alcool", "Choses qu'on trouve dans un frigo", "Gâteaux ou pâtisseries françaises"] },
    "maison": { name: "🏠 Maison & Quotidien", words: ["Objets dans une salle de bain", "Vêtements qu'on porte en hiver", "Produits ménagers", "Meubles d'un salon", "Fournitures scolaires", "Outils de bricolage", "Types de chaussures", "Choses qu'on fait le matin en se levant", "Objets en plastique", "Appareils électroménagers"] },
    "transport": { name: "🚗 Transport & Voyage", words: ["Moyens de transport", "Objets qu'on met dans une valise", "Compagnies aériennes", "Choses qu'on voit par la fenêtre d'une voiture", "Marques de sport", "Pièces d'une voiture", "Lieux de vacances", "Panneaux de signalisation"] },
    "nature": { name: "🐾 Nature & Animaux", words: ["Races de chiens", "Animaux de la ferme", "Oiseaux", "Fleurs", "Insectes", "Poissons", "Choses qu'on trouve dans une forêt", "Phénomènes météo", "Arbres"] },
    "loisirs": { name: "🎭 Loisirs & Culture", words: ["Couleurs", "Instruments de musique", "Sports olympiques", "Langues parlées dans le monde", "Matières enseignées à l'école", "Jeux de société classiques", "Métiers qui commencent par la lettre 'B'", "Signes du zodiaque", "Super-pouvoirs"] }
};

let gameTimer;
let tickTimeout;
let timeRemaining = 0;
let totalTime = 0;
let wordsHistory = [];
let audioCtx;

// Initialiser les thèmes
window.onload = function() {
    const themeList = document.getElementById("theme-list");
    for (const [key, data] of Object.entries(themes)) {
        const div = document.createElement("div");
        div.className = "theme-item";
        div.innerHTML = `<input type="checkbox" class="theme-checkbox custom-checkbox" value="${key}" checked onchange="checkSelectAll()"> <label>${data.name}</label>`;
        themeList.appendChild(div);
    }
    
    // Entrée clavier pour valider vite
    document.getElementById("word-input").addEventListener("keypress", function(e) {
        if (e.key === "Enter") passBomb();
    });
};

function toggleAllThemes(source) {
    const checkboxes = document.querySelectorAll('.theme-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function checkSelectAll() {
    const allChecked = document.querySelectorAll('.theme-checkbox:not(:checked)').length === 0;
    document.getElementById('select-all-themes').checked = allChecked;
}

// Générer le son du tictac sans fichier externe !
function playTick(freq, duration) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function startGame() {
    // Activer l'audio sur le clic utilisateur (sécurité navigateur)
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const checkedBoxes = document.querySelectorAll('.theme-checkbox:checked');
    let availableThemes = [];
    checkedBoxes.forEach(box => {
        availableThemes = availableThemes.concat(themes[box.value].words);
    });

    if (availableThemes.length === 0) {
        alert("Sélectionne au moins un thème !");
        return;
    }

    // Choisir un thème au hasard
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    document.getElementById("theme-display").textContent = randomTheme;

    // Réglage du temps
    const isDuel = document.getElementById("duel-mode").checked;
    const minTime = isDuel ? 10 : 15;
    const maxTime = isDuel ? 20 : 45;
    
    timeRemaining = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    totalTime = timeRemaining;
    wordsHistory = [];

    switchScreen("setup-screen", "game-screen");
    document.getElementById("word-input").focus();
    
    // Lancer la boucle sonore et le compte à rebours
    scheduleNextTick();
    gameTimer = setInterval(countdown, 1000);
}

function scheduleNextTick() {
    if (timeRemaining <= 0) return;
    
    playTick(800, 0.1); // Son aigu du tictac
    
    // Le délai diminue quand le temps s'écoule (stress !)
    let ratio = timeRemaining / totalTime; // 1 au début, 0 à la fin
    let delay = 200 + (ratio * 800); // Passe de 1000ms à 200ms
    
    // Animation de la bombe
    const bomb = document.getElementById("bomb-emoji");
    bomb.classList.add("bomb-pulse");
    setTimeout(() => bomb.classList.remove("bomb-pulse"), delay / 2);

    // Si on est dans les 5 dernières secondes, l'écran tremble un peu
    if(timeRemaining <= 5) {
        document.body.classList.add("body-shake");
        setTimeout(() => document.body.classList.remove("body-shake"), 300);
    }

    tickTimeout = setTimeout(scheduleNextTick, delay);
}

function countdown() {
    timeRemaining--;
    if (timeRemaining <= 0) {
        explode();
    }
}

function passBomb() {
    const input = document.getElementById("word-input");
    const word = input.value.trim();
    
    if (word) {
        wordsHistory.push(word);
    } else {
        wordsHistory.push("(Passé sans mot)"); // Au cas où ils cliquent juste dans la panique
    }
    
    input.value = "";
    input.focus();
}

function explode() {
    clearInterval(gameTimer);
    clearTimeout(tickTimeout);
    
    // Gros son d'explosion sourd
    playTick(150, 1.5);
    
    // Vibration haptique (marche sur Android)
    if (navigator.vibrate) {
        navigator.vibrate([1000, 200, 1000]);
    }

    document.body.classList.add("body-shake-fast");
    
    setTimeout(() => {
        document.body.classList.remove("body-shake-fast");
        showExplosionScreen();
    }, 1000); // L'écran tremble pendant 1 seconde avant d'afficher la fin
}

function showExplosionScreen() {
    switchScreen("game-screen", "explosion-screen");
    
    const list = document.getElementById("word-history");
    list.innerHTML = "";
    
    if (wordsHistory.length === 0) {
        list.innerHTML = "<li>Personne n'a eu le temps de parler !</li>";
    } else {
        wordsHistory.forEach(word => {
            const li = document.createElement("li");
            li.textContent = word;
            list.appendChild(li);
        });
    }
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}
