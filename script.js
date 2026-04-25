// On organise les mots par thèmes
const themes = {
    "divers": [
        ["Pomme", "Poire"], ["Cinéma", "Théâtre"], ["Voiture", "Moto"],
        ["Plage", "Piscine"], ["Guitare", "Piano"], ["Chien", "Loup"]
    ],
    "anime": [
        ["Naruto", "Sasuke"], ["Luffy", "Zoro"] // Tu pourras remplir ici plus tard
    ],
    "transports": [
        ["Avion", "Hélicoptère"], ["Vélo", "Trotinette"]
    ]
};

let players = [];
let playerRoles = []; 
let currentPlayerIndex = 0;
let civWordGlobal = "";
let roundCount = 1;
let currentVotedPlayer = null; // Pour savoir quel Mr White est en train de deviner

function openGame(gameName) {
    if (gameName === 'undercover') {
        switchScreen("hub-screen", "setup-screen");
    }
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
    const undercoverCount = parseInt(document.getElementById("undercover-count").value);
    const mrWhiteCount = parseInt(document.getElementById("mr-white-count").value);
    const themeKey = document.getElementById("theme-select").value;

    if (undercoverCount + mrWhiteCount >= players.length - 1) {
        alert("Trop d'intrus ! Il faut au moins 2 civils.");
        return;
    }

    // Choisir le mot selon le thème
    const themeWords = themes[themeKey] || themes["divers"];
    const randomPair = themeWords[Math.floor(Math.random() * themeWords.length)];
    const isSwapped = Math.random() > 0.5;
    civWordGlobal = isSwapped ? randomPair[0] : randomPair[1];
    const undercoverWord = isSwapped ? randomPair[1] : randomPair[0];

    // Créer la liste des rôles
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
}

function handleVote(votedPlayer) {
    votedPlayer.isAlive = false;
    currentVotedPlayer = votedPlayer;

    if (votedPlayer.role === "Mr. White") {
        document.getElementById("white-guess-title").textContent = `👻 ${votedPlayer.name} était Mr. White !`;
        switchScreen("debate-screen", "guess-screen");
    } else {
        checkWinConditions();
    }
}

function checkWhiteGuess() {
    const guess = document.getElementById("white-guess").value.trim().toLowerCase();
    if (guess === civWordGlobal.toLowerCase()) {
        showResult("👻 Victoire de Mr. White !", `Il a trouvé le mot "${civWordGlobal}".`);
    } else {
        alert("Faux ! Mr. White est définitivement éliminé.");
        document.getElementById("white-guess").value = "";
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
        showResult("🕵️ Victoire des Intrus !", "Ils sont devenus trop puissants.");
    } else {
        // Le jeu continue !
        roundCount++;
        alert(`Il reste encore des intrus ! On passe au tour ${roundCount}.`);
        startVotingPhase();
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
