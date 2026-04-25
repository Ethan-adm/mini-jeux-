// Liste de paires de mots (tu pourras en ajouter autant que tu veux !)
const wordPairs = [
    ["Pomme", "Poire"],
    ["Cinéma", "Théâtre"],
    ["Voiture", "Moto"],
    ["Plage", "Piscine"],
    ["Guitare", "Piano"]
];

let players = [];
let roles = [];
let currentPlayerIndex = 0;

// Fonction pour ajouter un joueur
function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    if (name) {
        players.push(name);
        const li = document.createElement("li");
        li.textContent = name;
        document.getElementById("player-list").appendChild(li);
        input.value = "";
        
        // Active le bouton "Lancer" s'il y a 3 joueurs ou plus
        if (players.length >= 3) {
            document.getElementById("start-btn").disabled = false;
        }
    }
}

// Fonction pour démarrer la partie
function startGame() {
    // 1. Choisir une paire de mots au hasard
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    // On mélange la paire pour ne pas que le mot 1 soit toujours le civil
    const isSwapped = Math.random() > 0.5;
    const civWord = isSwapped ? randomPair[0] : randomPair[1];
    const undercoverWord = isSwapped ? randomPair[1] : randomPair[0];

    // 2. Donner le mot "Civil" à tout le monde
    roles = Array(players.length).fill(civWord);
    
    // 3. Choisir un "Undercover" au hasard et lui donner l'autre mot
    const undercoverIndex = Math.floor(Math.random() * players.length);
    roles[undercoverIndex] = undercoverWord;

    switchScreen("setup-screen", "turn-screen");
    updateTurnScreen();
}

function updateTurnScreen() {
    document.getElementById("turn-title").textContent = `📱 Au tour de ${players[currentPlayerIndex]}`;
}

function showWord() {
    document.getElementById("secret-word").textContent = roles[currentPlayerIndex];
    switchScreen("turn-screen", "word-screen");
}

function nextTurn() {
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
        // Il reste des joueurs, on passe au suivant
        switchScreen("word-screen", "turn-screen");
        updateTurnScreen();
    } else {
        // Tout le monde a vu son mot, on lance le débat
        switchScreen("word-screen", "debate-screen");
    }
}

// Outil pour changer d'écran facilement
function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}
