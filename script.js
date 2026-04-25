const themes = {
    "divers": [
        ["Pomme", "Poire"], ["Cinéma", "Théâtre"], ["Voiture", "Moto"],
        ["Plage", "Piscine"], ["Guitare", "Piano"], ["Chien", "Loup"]
    ],
    "anime": [
        ["Naruto", "Sasuke"], ["Luffy", "Zoro"], ["Goku", "Vegeta"]
    ],
    "transports": [
        ["Avion", "Hélicoptère"], ["Vélo", "Trotinette"], ["Bus", "Tramway"]
    ]
};

let players = [];
let playerRoles = []; 
let currentPlayerIndex = 0;
let civWordGlobal = "";
let roundCount = 1;
let currentVotedPlayer = null;
let canUndercoverGuess = false;

function openGame(gameName) {
    if (gameName === 'undercover') {
        switchScreen("hub-screen", "setup-screen");
    }
}

// Gestion des boutons + et - pour les paramètres
function updateCounter(id, change) {
    const span = document.getElementById(id);
    let val = parseInt(span.textContent) + change;
    if (id === 'undercover-count' && val >= 1 && val <= 5) span.textContent = val;
    if (id === 'mr-white-count' && val >= 0 && val <= 5) span.textContent = val;
}

function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    if (name && !players.includes(name)) {
        players.push(name);
        const li = document.createElement("li");
        li.textContent = name;
        document.getElementById("player-list").appendChild(li);
        input.value = "";
        if (players.length >= 3) document.getElementById("start-btn").disabled = false;
    }
}

function startGame() {
    const undercoverCount = parseInt(document.getElementById("undercover-count").textContent);
    const mrWhiteCount = parseInt(document.getElementById("mr-white-count").textContent);
    const themeKey = document.getElementById("theme-select").value;
    canUndercoverGuess = document.getElementById("allow-undercover-guess").checked;

    if (undercoverCount + mrWhiteCount >= players.length - 1) {
        alert("Trop d'intrus ! Il faut au plus de Civils.");
        return;
    }

    const themeWords = themes[themeKey] || themes["divers"];
    const randomPair = themeWords[Math.floor(Math.random() * themeWords.length)];
    const isSwapped = Math.random() > 0.5;
    civWordGlobal = isSwapped ? randomPair[0] : randomPair[1];
    const undercoverWord = isSwapped ? randomPair[1] : randomPair[0];

    let rolesPool = [];
    for (let i = 0; i < undercoverCount; i++) rolesPool.push("Undercover");
    for (let i = 0; i < mrWhiteCount; i++) rolesPool.push("Mr. White");
    while (rolesPool.length < players.length) rolesPool.push("Civil");

    rolesPool = rolesPool.sort(() => Math.random() - 0.5);

    playerRoles = players.map((name, index) => ({
        name: name,
        role: rolesPool[index],
        word: rolesPool[index] === "Civil" ? civWordGlobal : (rolesPool[index] === "Undercover" ? undercoverWord : "Tu es Mr. White"),
        isAlive: true
    }));

    roundCount = 1;
    currentPlayerIndex = 0;
    switchScreen("setup-screen", "turn-screen");
    updateTurnScreen();
}

function updateTurnScreen() {
    document.getElementById("turn-title").textContent = `📱 Au tour de ${playerRoles[currentPlayerIndex].name}`;
}

function showWord() {
    const p = playerRoles[currentPlayerIndex];
    document.getElementById("secret-word").textContent = p.word;
    document.getElementById("role-title").textContent = (p.role === "Mr. White") ? "Attention :" : "Ton mot est :";
    switchScreen("turn-screen", "word-screen");
}

function nextTurn() {
    currentPlayerIndex++;
    if (currentPlayerIndex < playerRoles.length) {
        switchScreen("word-screen", "turn-screen");
        updateTurnScreen();
    } else {
        startVotingPhase();
    }
}

function startVotingPhase() {
    document.getElementById("round-number").textContent = roundCount;
    const voteList = document.getElementById("vote-list");
    voteList.innerHTML = "";

    playerRoles.forEach(player => {
        const btn = document.createElement("button");
        btn.className = player.isAlive ? "vote-btn" : "vote-btn eliminated";
        btn.textContent = player.isAlive ? `Voter contre ${player.name}` : `💀 ${player.name} (Eliminé)`;
        btn.onclick = () => handleVote(player);
        voteList.appendChild(btn);
    });

    switchScreen("word-screen", "debate-screen");
    switchScreen("continue-screen", "debate-screen");
}

function handleVote(votedPlayer) {
    votedPlayer.isAlive = false;
    currentVotedPlayer = votedPlayer;

    const isMrWhite = votedPlayer.role === "Mr. White";
    const isUnderAndCanGuess = votedPlayer.role === "Undercover" && canUndercoverGuess;

    if (isMrWhite || isUnderAndCanGuess) {
        const icon = isMrWhite ? "👻" : "🕵️‍♂️";
        document.getElementById("guess-title").textContent = `${icon} ${votedPlayer.name} était ${votedPlayer.role} !`;
        switchScreen("debate-screen", "guess-screen");
    } else {
        checkWinConditions();
    }
}

function checkIntruderGuess() {
    const guess = document.getElementById("intruder-guess").value.trim().toLowerCase();
    if (guess === civWordGlobal.toLowerCase()) {
        showResult(`🎉 Victoire de ${currentVotedPlayer.name} !`, `L'intrus a trouvé le mot des civils : "${civWordGlobal}".`);
    } else {
        document.getElementById("intruder-guess").value = "";
        checkWinConditions();
    }
}

function checkWinConditions() {
    const alivePlayers = playerRoles.filter(p => p.isAlive);
    const aliveIntruders = alivePlayers.filter(p => p.role !== "Civil");
    const aliveCivils = alivePlayers.filter(p => p.role === "Civil");

    if (aliveIntruders.length === 0) {
        showResult("🎉 Victoire des Civils !", "Tous les intrus ont été éliminés.");
    } else if (aliveCivils.length <= aliveIntruders.length) {
        showResult("💀 Les Civils ont perdu...", "Les intrus sont trop nombreux !");
    } else {
        roundCount++;
        document.getElementById("continue-desc").textContent = `${currentVotedPlayer.name} a été éliminé. Mais il reste des intrus...`;
        switchScreen("debate-screen", "continue-screen");
        switchScreen("guess-screen", "continue-screen");
    }
}

function showResult(title, desc) {
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-desc").textContent = desc;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('result-screen').classList.add('active');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}
